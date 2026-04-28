import { supabase } from '../lib/supabase';
import { calculateXPForJob, calculateNextLevelXP, registerActivity } from '../utils/gamification';

/**
 * TeamService.js (Renamed to CoopService logic)
 * 
 * Central service for Cooplance Coops backed by Supabase.
 */

// --- HELPERS ---

const getUser = async (userId) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) return null;
    return data;
};

// --- 1. CREATION VALIDATIONS ---

export const validateCreateTeam = async (userId) => {
    const user = await getUser(userId);
    if (!user) throw new Error("Usuario no encontrado");

    if (user.role === 'freelancer' && (user.level || 1) < 3) {
        throw new Error("Nivel insuficiente. Requieres Nivel 3 para crear una Coop.");
    }
    if ((user.role === 'client' || user.role === 'buyer' || user.role === 'company') && (user.level || 1) < 6) {
        throw new Error("Nivel insuficiente. Requieres Nivel 6 para gestionar equipos.");
    }

    const { data: foundedCoops } = await supabase
        .from('coops')
        .select('id')
        .eq('founder_id', userId);

    let limit = 2; // Hard limit from Phase 1 trigger, but we check here too
    
    if (foundedCoops?.length >= limit) {
        throw new Error(`Has alcanzado el límite de Coops fundadas (${limit}).`);
    }

    return true;
};

// --- 2. TEAM MANAGEMENT ---

export const createTeam = async (teamData, founderId) => {
    await validateCreateTeam(founderId);

    const { data: coop, error } = await supabase
        .from('coops')
        .insert({
            name: teamData.name,
            description: teamData.description,
            avatar_url: teamData.logo,
            categories: teamData.categories || [],
            tags: teamData.tags || [],
            internal_rules: teamData.internalRules || "No hay reglas definidas.",
            founder_id: founderId,
            status: 'active',
            level: 1,
            config_changes_left: 2,
            distribution_config: { method: 'equal' }
        })
        .select()
        .single();

    if (error) throw error;

    // Add founder as owner
    const { error: memberError } = await supabase
        .from('coop_members')
        .insert({
            coop_id: coop.id,
            user_id: founderId,
            role: 'owner',
            joined_at: new Date().toISOString(),
            accepted_rules_at: new Date().toISOString()
        });

    if (memberError) throw memberError;

    return coop;
};

// --- 3. PROJECT LIFECYCLE ---

export const activateCoopProject = async (coopId, projectId, serviceId, amount) => {
    const { data: coop } = await supabase.from('coops').select('*, members:coop_members(*)').eq('id', coopId).single();
    if (!coop) throw new Error("Coop no encontrada");

    const activeMembers = coop.members; // In new schema, all members in coop_members are active
    if (activeMembers.length < 1) throw new Error("Se requiere al menos 1 miembro para aceptar un proyecto.");

    const frozenLevels = {};
    let totalLevelWeight = 0;

    for (const member of activeMembers) {
        const user = await getUser(member.user_id);
        const level = user ? (user.level || 1) : 1;
        frozenLevels[member.user_id] = level;
        totalLevelWeight += level;
    }

    const platformFee = amount * 0.12;
    const netAmount = amount - platformFee;

    const projectSnapshot = {
        projectId,
        serviceId,
        activationDate: new Date().toISOString(),
        participants: activeMembers.map(m => m.user_id),
        frozenLevels,
        financials: { gross: amount, fee: platformFee, net: netAmount, totalWeight: totalLevelWeight }
    };

    // We keep using team_projects if it exists, or adapt it later
    const { error } = await supabase.from('team_projects').insert({
        team_id: coopId,
        project_id: projectId,
        snapshot: projectSnapshot,
        status: 'active'
    });

    if (error) throw error;
    return projectSnapshot;
};

export const calculateFrozenDistribution = async (coopId, projectId) => {
    const { data: project } = await supabase.from('team_projects').select('*').eq('team_id', coopId).eq('project_id', projectId).single();
    if (!project) throw new Error("Proyecto no encontrado.");

    const { frozenLevels, financials } = project.snapshot;
    const { net, totalWeight } = financials;

    return Object.entries(frozenLevels).map(([userId, level]) => ({
        userId,
        levelSnapshot: level,
        amount: (level / totalWeight) * net,
        percentage: (level / totalWeight) * 100
    }));
};

// --- 4. GOVERNANCE & ROLES ---

export const canPerformAction = async (coopId, action, actorId, targetId = null) => {
    const { data: member } = await supabase.from('coop_members').select('*').eq('coop_id', coopId).eq('user_id', actorId).single();
    if (!member) return false;
    
    const role = member.role;
    // Actions block by active projects logic (to be refined in Phase 3)
    
    switch (action) {
        case 'invite': return ['owner', 'admin', 'manager'].includes(role);
        case 'kick': return role === 'owner' || (role === 'admin' && targetId !== actorId);
        case 'promote': return role === 'owner' || role === 'admin';
        case 'dissolve': return role === 'owner';
        case 'manage_service': return ['owner', 'admin', 'manager'].includes(role);
        case 'leave': return true;
        default: return false;
    }
};

export const processMemberExit = async (coopId, userId) => {
    const { data: member } = await supabase
        .from('coop_members')
        .select('*')
        .eq('coop_id', coopId)
        .eq('user_id', userId)
        .single();

    if (!member) throw new Error("Miembro no encontrado");

    if (member.role === 'owner') {
        const { data: others } = await supabase
            .from('coop_members')
            .select('*')
            .eq('coop_id', coopId)
            .neq('user_id', userId)
            .order('joined_at', { ascending: true });

        if (!others || others.length === 0) {
            await dissolveTeam(coopId, userId);
            return;
        }

        const successor = others.find(o => o.role === 'admin') || others[0];
        await supabase.from('coop_members').update({ role: 'owner' }).eq('id', successor.id);
    }

    const { error } = await supabase
        .from('coop_members')
        .delete()
        .eq('coop_id', coopId)
        .eq('user_id', userId);

    if (error) throw error;
};

export const addMember = async (coopId, newUserId, actorId) => {
    if (!await canPerformAction(coopId, 'invite', actorId)) {
        throw new Error("No tienes permisos para invitar miembros.");
    }
    
    // Check limit of 5 members (handled by trigger too, but nice to have here)
    const { count } = await supabase.from('coop_members').select('*', { count: 'exact', head: true }).eq('coop_id', coopId);
    if (count >= 5) throw new Error("La Coop ya tiene el límite de 5 miembros.");

    const { error } = await supabase
        .from('coop_members')
        .insert({
            coop_id: coopId,
            user_id: newUserId,
            role: 'worker'
        });

    if (error) throw error;
    return true;
};

export const respondToInvite = async (coopId, userId, accept) => {
    if (!accept) {
        await supabase.from('coop_members').delete().eq('coop_id', coopId).eq('user_id', userId);
        return;
    }
    // Acceptance logic shifted to acceptRules in Phase 2
};

export const updateMemberRole = async (coopId, targetUserId, newRole, actorId) => {
    if (!await canPerformAction(coopId, 'promote', actorId)) {
        throw new Error("No tienes permisos para gestionar roles.");
    }
    const { error } = await supabase
        .from('coop_members')
        .update({ role: newRole })
        .eq('coop_id', coopId)
        .eq('user_id', targetUserId);

    if (error) throw error;
    return true;
};

export const dissolveTeam = async (coopId, actorId) => {
    if (!await canPerformAction(coopId, 'dissolve', actorId)) {
        throw new Error("No tienes permisos para disolver la Coop.");
    }
    const { error } = await supabase.from('coops').delete().eq('id', coopId);
    if (error) throw error;
};

export const toggleTeamService = async (coopId, serviceId, actorId) => {
    if (!await canPerformAction(coopId, 'manage_service', actorId)) {
        throw new Error("No tienes permisos para gestionar servicios.");
    }

    const { data: service } = await supabase.from('jobs').select('active').eq('id', serviceId).single();
    const { data: updated, error } = await supabase
        .from('jobs')
        .update({ active: !service.active })
        .eq('id', serviceId)
        .select()
        .single();

    if (error) throw error;
    return updated;
};

import * as NotificationService from './NotificationService';

export const completeProject = async (coopId, projectId, ratings) => {
    try {
        const distribution = await calculateFrozenDistribution(coopId, projectId);
        const { data: coop } = await supabase.from('coops').select('name').eq('id', coopId).single();

        const { error } = await supabase
            .from('team_projects')
            .update({ status: 'completed', ratings, completed_at: new Date().toISOString() })
            .eq('team_id', coopId)
            .eq('project_id', projectId);

        if (error) throw error;

        for (const dist of distribution) {
            await NotificationService.createNotification(dist.userId, {
                type: 'coop_victory',
                title: '¡Victoria en equipo! 🤝',
                message: `Tu Coop '${coop?.name || 'agencia'}' cerró un trabajo y recibiste $${Math.round(dist.amount)} de comisión.`,
                link: '/wallet'
            });
        }
    } catch (err) {
        console.error('[TeamService] Error completing project:', err);
        throw err;
    }
};

export const updateTeamRules = async (coopId, rulesText, actorId) => {
    const { error } = await supabase
        .from('coops')
        .update({ internal_rules: rulesText })
        .eq('id', coopId);

    if (error) throw error;
};

export const acceptTeamRules = async (coopId, userId) => {
    const { error } = await supabase
        .from('coop_members')
        .update({ accepted_rules_at: new Date().toISOString() })
        .eq('coop_id', coopId)
        .eq('user_id', userId);

    if (error) throw error;
};

export const reassignProjectTeam = async (data) => {
    const { error } = await supabase.rpc('assign_job_team_and_payouts', {
        p_job_id: data.jobId,
        p_project_lead_id: data.projectLeadId,
        p_member_ids: data.memberIds,
        p_percentages: data.percentages,
        p_method: data.payoutMethod
    });

    if (error) throw error;
    return true;
};

export const submitMemberReview = async (coopId, projectId, evaluatorId, targetUserId, score, feedback) => {
    const { error } = await supabase
        .from('member_reviews')
        .insert({
            team_id: coopId,
            project_id: projectId,
            evaluator_id: evaluatorId,
            target_user_id: targetUserId,
            score,
            feedback
        });

    if (error) throw error;
};

export const updateTeamInfo = async (coopId, data, actorId) => {
    const { error } = await supabase
        .from('coops')
        .update({
            name: data.name,
            description: data.description,
            avatar_url: data.logo
        })
        .eq('id', coopId);

    if (error) throw error;
};

export const getPublicTeamProfile = async (coopId) => {
    const { data, error } = await supabase
        .from('coops')
        .select('*, members:coop_members(*, profile:profiles(*))')
        .eq('id', coopId)
        .single();

    if (error) throw error;
    return data;
};

export const getTeamMembers = async (coopId) => {
    const { data, error } = await supabase
        .from('coop_members')
        .select('*, profiles:profiles(*)')
        .eq('coop_id', coopId);
    
    if (error) throw error;
    return data || [];
};

export const expelMember = async (coopId, targetUserId, actorId, reason) => {
    const { error } = await supabase.rpc('expel_coop_member', {
        p_coop_id: coopId,
        p_target_user_id: targetUserId,
        p_actor_id: actorId,
        p_reason: reason
    });
    
    if (error) throw error;
    return true;
};

export default {
    validateCreateTeam,
    createTeam,
    activateCoopProject,
    calculateFrozenDistribution,
    canPerformAction,
    processMemberExit,
    addMember,
    updateMemberRole,
    dissolveTeam,
    toggleTeamService,
    completeProject,
    updateTeamRules,
    submitMemberReview,
    updateTeamInfo,
    getPublicTeamProfile,
    acceptTeamRules,
    respondToInvite,
    getTeamMembers,
    expelMember,
    reassignProjectTeam
};
