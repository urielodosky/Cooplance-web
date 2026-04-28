/**
 * Centralized Proposal Service — Supabase-backed
 * Replaces all localStorage calls to 'cooplance_db_proposals'
 */
import { supabase } from './supabase';

// ── Fetch proposals ──────────────────────────────────────────

export const getProposalsByProject = async (projectId) => {
    try {
        const { data, error } = await supabase
            .from('proposals')
            .select('*, profiles:freelancer_id(username, first_name, last_name, avatar_url, level, role)')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[ProposalService] Supabase error fetching proposals:', error);
            return [];
        }

        return (data || []).map(row => ({
            id: row.id,
            projectId: row.project_id,
            userId: row.freelancer_id,
            userName: row.user_name || (row.profiles?.first_name
                ? `${row.profiles.first_name} ${row.profiles.last_name || ''}`.trim()
                : row.profiles?.username || 'Usuario'),
            userRole: row.user_role || row.profiles?.role || 'freelancer',
            userAvatar: row.profiles?.avatar_url || null,
            userLevel: row.profiles?.level || 1,
            coverLetter: row.cover_letter,
            amount: row.amount,
            deliveryDays: row.delivery_days,
            status: row.status,
            createdAt: row.created_at,
        }));
    } catch (err) {
        console.error('[ProposalService] Critical error fetching proposals:', err);
        return [];
    }
};

export const getProposalsByUser = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('proposals')
            .select(`
                *,
                project:project_id(
                    title, 
                    deadline, 
                    client_id,
                    profiles:client_id(username, first_name, last_name, avatar_url, role)
                )
            `)
            .eq('freelancer_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[ProposalService] Supabase error fetching user proposals:', error);
            return [];
        }

        return (data || []).map(row => {
            const project = row.project || {};
            const client = project.profiles || {};
            return {
                id: row.id,
                projectId: row.project_id,
                projectTitle: project.title || 'Proyecto sin título',
                projectDeadline: project.deadline,
                clientId: project.client_id,
                clientUsername: client.username,
                clientRealName: client.first_name ? `${client.first_name} ${client.last_name || ''}`.trim() : null,
                clientAvatar: client.avatar_url,
                clientRole: client.role,
                userId: row.freelancer_id,
                userName: row.user_name,
                userRole: row.user_role,
                coverLetter: row.cover_letter,
                amount: row.amount,
                deliveryDays: row.delivery_days,
                status: row.status,
                createdAt: row.created_at,
            };
        });
    } catch (err) {
        console.error('[ProposalService] Critical error fetching user proposals:', err);
        return [];
    }
};

export const hasUserApplied = async (projectId, userId) => {
    try {
        const { data, error } = await supabase
            .from('proposals')
            .select('id')
            .eq('project_id', projectId)
            .eq('freelancer_id', userId)
            .limit(1);

        if (error) {
            console.error('[ProposalService] Error checking application:', error);
            return false;
        }

        return data && data.length > 0;
    } catch (err) {
        console.error('[ProposalService] Critical error checking application:', err);
        return false;
    }
};

export const getWeeklyProposalCount = async (userId) => {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count, error } = await supabase
            .from('proposals')
            .select('*', { count: 'exact', head: true })
            .eq('freelancer_id', userId)
            .gt('created_at', sevenDaysAgo);

        if (error) {
            console.error('[ProposalService] Error counting weekly proposals:', error);
            return 0;
        }
        return count || 0;
    } catch (err) {
        console.error('[ProposalService] Critical error counting weekly proposals:', err);
        return 0;
    }
};

import * as NotificationService from '../services/NotificationService';

// ── Create proposal ─────────────────────────────────────────

const getWeeklyLimit = (level) => {
    if (level <= 1) return 5;
    if (level === 2) return 10;
    if (level === 3) return 20;
    if (level === 4) return 30;
    return 50; // Level 5+
};

export const createProposal = async ({ projectId, userId, userName, userRole, coverLetter, amount, deliveryDays, coopId, assignment }) => {
    try {
        // 1. Fetch user level
        const { data: profile } = await supabase
            .from('profiles')
            .select('level')
            .eq('id', userId)
            .single();
        
        const userLevel = profile?.level || 1;
        const limit = getWeeklyLimit(userLevel);

        // 2. Count proposals in the last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count, error: countError } = await supabase
            .from('proposals')
            .select('*', { count: 'exact', head: true })
            .eq('freelancer_id', userId)
            .gt('created_at', sevenDaysAgo);

        if (countError) throw countError;

        if (count >= limit) {
            throw new Error(`Has alcanzado tu límite semanal de ${limit} postulaciones para el Nivel ${userLevel}.`);
        }

        // 3. Fetch project details to get client_id and title
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('title, client_id')
            .eq('id', projectId)
            .single();

        if (projectError) throw projectError;

        // 4. Insert the proposal
        const { data, error } = await supabase
            .from('proposals')
            .insert({
                project_id: projectId,
                freelancer_id: userId,
                user_name: userName,
                user_role: userRole,
                cover_letter: coverLetter,
                amount: parseFloat(amount) || 0,
                delivery_days: parseInt(deliveryDays) || null,
                status: 'pending',
                coop_id: coopId || null,
                assignment_snapshot: assignment || null // Snapshot of the team at postulation time
            })
            .select('*')
            .single();

        if (error) {
            console.error('[ProposalService] Error creating proposal:', error);
            throw error;
        }

        // 5. Notify the Client
        await NotificationService.createNotification(project.client_id, {
            type: 'proposal_received',
            title: 'Nueva propuesta',
            message: `¡Nueva propuesta! 🎉 ${userName} se postuló para tu pedido '${project.title}'.`,
            link: `/dashboard`
        });

        return data;
    } catch (err) {
        console.error('[ProposalService] Critical error creating proposal:', err);
        throw err;
    }
};

// ── Update proposal status ──────────────────────────────────

export const updateProposalStatus = async (proposalId, status, { clientId, clientName } = {}) => {
    try {
        // 1. Fetch proposal and project info for notification
        const { data: proposal, error: fetchError } = await supabase
            .from('proposals')
            .select('*, projects(title)')
            .eq('id', proposalId)
            .single();

        if (fetchError) throw fetchError;

        // 2. Update status
        const { error } = await supabase
            .from('proposals')
            .update({ status })
            .eq('id', proposalId);

        if (error) {
            console.error('[ProposalService] Error updating proposal:', error);
            throw error;
        }

        // 3. Send Notification to Freelancer
        if (status === 'accepted') {
            await NotificationService.createNotification(proposal.freelancer_id, {
                type: 'proposal_accepted',
                title: 'Postulación aceptada',
                message: `¡Postulación aceptada! 🚀 ${clientName || 'Un cliente'} te contrató para '${proposal.projects?.title}'.`,
                link: `/dashboard`
            });
        } else if (status === 'rejected') {
            await NotificationService.createNotification(proposal.freelancer_id, {
                type: 'proposal_rejected',
                title: 'Novedades de tu postulación',
                message: `Tu postulación para '${proposal.projects?.title}' no fue seleccionada esta vez.`,
                link: `/explore-clients`
            });
        }
    } catch (err) {
        console.error('[ProposalService] Critical error updating proposal status:', err);
        throw err;
    }
};

export const deleteProposal = async (proposalId) => {
    try {
        const { error } = await supabase
            .from('proposals')
            .delete()
            .eq('id', proposalId);

        if (error) {
            console.error('[ProposalService] Error deleting proposal:', error);
            throw error;
        }
    } catch (err) {
        console.error('[ProposalService] Critical error deleting proposal:', err);
        throw err;
    }
};

export const getReceivedProposals = async (clientId) => {
    try {
        console.log(`[ProposalService] Fetching received proposals for client ID: ${clientId}`);
        
        // 1. Fetch all projects owned by the client
        const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('id, title')
            .eq('client_id', clientId);
            
        if (projectsError) throw projectsError;
        if (!projects || projects.length === 0) return [];
        
        const projectIds = projects.map(p => p.id);
        const projectMap = projects.reduce((acc, p) => {
            acc[p.id] = p.title;
            return acc;
        }, {});
        
        // 2. Fetch all pending proposals for these projects
        const { data: proposals, error: proposalsError } = await supabase
            .from('proposals')
            .select(`
                *,
                freelancer_id
            `)
            .in('project_id', projectIds)
            .eq('status', 'pending');
            
        if (proposalsError) throw proposalsError;
        if (!proposals || proposals.length === 0) return [];
        
        // 3. Manually fetch profiles for each freelancer to get their user details
        const freelancerIds = proposals.map(p => p.freelancer_id);
        const uniqueFreelancerIds = [...new Set(freelancerIds)];
        
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, first_name, last_name, avatar_url, role, level')
            .in('id', uniqueFreelancerIds);
            
        if (profilesError) throw profilesError;
        
        const profileMap = profiles?.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
        }, {}) || {};

        // 4. Map the data back into the expected frontend format
        return proposals.map(proposal => {
            const freelancer = profileMap[proposal.freelancer_id] || {};
            return {
                id: proposal.id,
                projectId: proposal.project_id,
                projectTitle: projectMap[proposal.project_id] || 'Proyecto',
                createdAt: proposal.created_at,
                status: proposal.status,
                coverLetter: proposal.cover_letter,
                
                // Formatted Freelancer Details
                userId: freelancer.id,
                userUsername: freelancer.username,
                userName: freelancer.first_name ? `${freelancer.first_name} ${freelancer.last_name || ''}`.trim() : freelancer.username,
                userAvatar: freelancer.avatar_url,
                userRole: freelancer.role,
                userLevel: freelancer.level || 1
            };
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by newest
        
    } catch (err) {
        console.error('[ProposalService] Exact error fetching received proposals:', err);
        return [];
    }
};
