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
            .select('*')
            .eq('freelancer_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[ProposalService] Supabase error fetching user proposals:', error);
            return [];
        }

        return (data || []).map(row => ({
            id: row.id,
            projectId: row.project_id,
            userId: row.freelancer_id,
            userName: row.user_name,
            userRole: row.user_role,
            coverLetter: row.cover_letter,
            amount: row.amount,
            deliveryDays: row.delivery_days,
            status: row.status,
            createdAt: row.created_at,
        }));
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

// ── Create proposal ─────────────────────────────────────────

export const createProposal = async ({ projectId, userId, userName, userRole, coverLetter, amount, deliveryDays }) => {
    try {
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
            })
            .select('*')
            .single();

        if (error) {
            console.error('[ProposalService] Error creating proposal:', error);
            throw error;
        }

        return data;
    } catch (err) {
        console.error('[ProposalService] Critical error creating proposal:', err);
        throw err;
    }
};

// ── Update proposal status ──────────────────────────────────

export const updateProposalStatus = async (proposalId, status) => {
    try {
        const { error } = await supabase
            .from('proposals')
            .update({ status })
            .eq('id', proposalId);

        if (error) {
            console.error('[ProposalService] Error updating proposal:', error);
            throw error;
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
