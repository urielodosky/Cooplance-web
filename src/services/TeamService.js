import { supabase } from '../lib/supabase';
import { calculateXPForJob, calculateNextLevelXP, registerActivity } from '../utils/gamification';

/**
 * TeamService.js
 * 
 * Central service for Cooplance Teams backed by Supabase.
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

    const { data: foundedTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('founder_id', userId)
        .neq('status', 'dissolved');

    let limit = 0;
    const level = user.level || 1;
    if (level <= 3) limit = 1;
    else if (level <= 8) limit = 2;
    else limit = 3;

    if (foundedTeams?.length >= limit) {
        throw new Error(`Has alcanzado el límite de Coops fundadas (${limit}) para tu nivel.`);
    }

    return true;
};

// --- 2. TEAM MANAGEMENT ---

export const createTeam = async (teamData, founderId) => {
    await validateCreateTeam(founderId);

    const { data: team, error } = await supabase
        .from('teams')
        .insert({
            name: teamData.name,
            description: teamData.description,
            logo_url: teamData.logo,
            founder_id: founderId,
            categories: teamData.categories || [],
            tags: teamData.tags || [],
            internal_rules: teamData.rules || "No hay reglas definidas.",
            status: 'active'
        })
        .select()
        .single();

    if (error) throw error;

    // Add founder as owner
    const { error: memberError } = await supabase
        .from('team_members')
        .insert({
            team_id: team.id,
            user_id: founderId,
            role: 'owner',
            status: 'active',
            joined_at: new Date().toISOString(),
            rules_accepted_at: new Date().toISOString()
        });

    if (memberError) throw memberError;

    return team;
};

// --- 3. PROJECT LIFECYCLE ---

export const activateCoopProject = async (teamId, projectId, serviceId, amount) => {
    const { data: team } = await supabase.from('teams').select('*, members:team_members(*)').eq('id', teamId).single();
    if (!team) throw new Error("Coop no encontrada");

    const activeMembers = team.members.filter(m => m.status === 'active');
    if (activeMembers.length < 2) throw new Error("Se requieren al menos 2 miembros activos para aceptar un proyecto.");

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

    const { error } = await supabase.from('team_projects').insert({
        team_id: teamId,
        project_id: projectId,
        snapshot: projectSnapshot,
        status: 'active'
    });

    if (error) throw error;
    return projectSnapshot;
};

export const calculateFrozenDistribution = async (teamId, projectId) => {
    const { data: project } = await supabase.from('team_projects').select('*').eq('team_id', teamId).eq('project_id', projectId).single();
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

export const canPerformAction = async (teamId, action, actorId, targetId = null) => {
    const { data: member } = await supabase.from('team_members').select('*').eq('team_id', teamId).eq('user_id', actorId).single();
    if (!member || member.status !== 'active') return false;
    
    const role = member.role;
    if (['kick', 'leave', 'dissolve'].includes(action)) {
        const { data: activeProjects } = await supabase.from('team_projects').select('id').eq('team_id', teamId).eq('status', 'active');
        if (activeProjects?.length > 0) throw new Error(`Acción '${action}' bloqueada: Proyecto activo.`);
    }

    switch (action) {
        case 'invite': return ['owner', 'admin'].includes(role);
        case 'kick': return role === 'owner' || (role === 'admin' && targetId !== actorId);
        case 'promote': return role === 'owner';
        case 'dissolve': return role === 'owner';
        case 'manage_service': return ['owner', 'admin', 'service_manager'].includes(role);
        case 'client_communication': return ['owner', 'admin', 'service_manager'].includes(role);
        case 'leave': return true;
        default: return false;
    }
};

export const processMemberExit = async (teamId, userId) => {
    await canPerformAction(teamId, 'leave', userId);
    
    const { data: member } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .single();

    if (!member) throw new Error("Miembro no encontrado");

    if (member.role === 'owner') {
        const { data: others } = await supabase
            .from('team_members')
            .select('*')
            .eq('team_id', teamId)
            .neq('user_id', userId)
            .eq('status', 'active')
            .order('joined_at', { ascending: true });

        if (!others || others.length === 0) {
            await dissolveTeam(teamId, userId);
            return;
        }

        const successor = others.find(o => o.role === 'admin') || others[0];
        await supabase.from('team_members').update({ role: 'owner' }).eq('id', successor.id);
        await supabase.from('teams').update({ founder_id: successor.user_id }).eq('id', teamId);
    }

    const { error } = await supabase
        .from('team_members')
        .update({ status: 'left', left_at: new Date().toISOString() })
        .eq('id', member.id);

    if (error) throw error;
};

export const addMember = async (teamId, newUserId, actorId) => {
    if (!await canPerformAction(teamId, 'invite', actorId)) {
        throw new Error("No tienes permisos para invitar miembros.");
    }
    const { error } = await supabase
        .from('team_members')
        .insert({
            team_id: teamId,
            user_id: newUserId,
            role: 'member',
            status: 'pending'
        });

    if (error) throw error;
    return true;
};

export const respondToInvite = async (teamId, userId, accept) => {
    const status = accept ? 'active' : 'declined';
    const { error } = await supabase
        .from('team_members')
        .update({ status, joined_at: accept ? new Date().toISOString() : null })
        .eq('team_id', teamId)
        .eq('user_id', userId);

    if (error) throw error;
};

export const updateMemberRole = async (teamId, targetUserId, newRole, actorId) => {
    if (!await canPerformAction(teamId, 'promote', actorId)) {
        throw new Error("No tienes permisos para gestionar roles.");
    }
    const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('team_id', teamId)
        .eq('user_id', targetUserId);

    if (error) throw error;
    return true;
};

export const dissolveTeam = async (teamId, actorId) => {
    if (!await canPerformAction(teamId, 'dissolve', actorId)) {
        throw new Error("No tienes permisos para disolver el equipo.");
    }
    const { error } = await supabase.from('teams').update({ status: 'dissolved' }).eq('id', teamId);
    if (error) throw error;
};

export const toggleTeamService = async (teamId, serviceId, actorId) => {
    if (!await canPerformAction(teamId, 'manage_service', actorId)) {
        throw new Error("No tienes permisos para gestionar servicios.");
    }

    const { data: service } = await supabase.from('services').select('active').eq('id', serviceId).single();
    const { data: updated, error } = await supabase
        .from('services')
        .update({ active: !service.active })
        .eq('id', serviceId)
        .select()
        .single();

    if (error) throw error;
    return updated;
};

export const completeProject = async (teamId, projectId, ratings) => {
    const { error } = await supabase
        .from('team_projects')
        .update({ status: 'completed', ratings, completed_at: new Date().toISOString() })
        .eq('team_id', teamId)
        .eq('project_id', projectId);

    if (error) throw error;
};

export const updateTeamRules = async (teamId, rulesText, actorId) => {
    const { error } = await supabase
        .from('teams')
        .update({ internal_rules: rulesText })
        .eq('id', teamId);

    if (error) throw error;
};

export const acceptTeamRules = async (teamId, userId) => {
    const { error } = await supabase
        .from('team_members')
        .update({ rules_accepted_at: new Date().toISOString() })
        .eq('team_id', teamId)
        .eq('user_id', userId);

    if (error) throw error;
};

export const submitMemberReview = async (teamId, projectId, evaluatorId, targetUserId, score, feedback) => {
    const { error } = await supabase
        .from('member_reviews')
        .insert({
            team_id: teamId,
            project_id: projectId,
            evaluator_id: evaluatorId,
            target_user_id: targetUserId,
            score,
            feedback
        });

    if (error) throw error;
};

export const updateTeamInfo = async (teamId, data, actorId) => {
    const { error } = await supabase
        .from('teams')
        .update({
            name: data.name,
            description: data.description,
            logo_url: data.logo
        })
        .eq('id', teamId);

    if (error) throw error;
};

export const getPublicTeamProfile = async (teamId) => {
    const { data, error } = await supabase
        .from('teams')
        .select('*, members:team_members(*, profile:profiles(*))')
        .eq('id', teamId)
        .single();

    if (error) throw error;
    return data;
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
    respondToInvite
};
