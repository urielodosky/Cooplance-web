import { supabase } from '../lib/supabase';

/**
 * Submits a report and automatically blocks the user.
 * @param {Object} payload 
 * @param {string} payload.reporter_id
 * @param {string} payload.reported_id
 * @param {string} payload.reason
 * @param {string} payload.description
 * @param {string} payload.reference_type
 * @param {string} [payload.reference_id]
 */
export const submitReport = async (payload) => {
    try {
        // 1. Insert Report
        const { error: reportError } = await supabase
            .from('reports')
            .insert({
                reporter_id: payload.reporter_id,
                reported_id: payload.reported_id,
                reason: payload.reason,
                description: payload.description,
                reference_type: payload.reference_type,
                reference_id: payload.reference_id,
                status: 'pending'
            });

        if (reportError) throw reportError;

        // 2. Automatically block the user
        await blockUser(payload.reporter_id, payload.reported_id);

        return { success: true };
    } catch (error) {
        console.error('[SafetyService] Error in submitReport:', error);
        throw error;
    }
};

/**
 * Blocks a user.
 * @param {string} blockerId 
 * @param {string} blockedId 
 */
export const blockUser = async (blockerId, blockedId) => {
    try {
        const { error } = await supabase
            .from('user_blocks')
            .upsert({
                blocker_id: blockerId,
                blocked_id: blockedId
            }, { onConflict: 'blocker_id, blocked_id' });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('[SafetyService] Error in blockUser:', error);
        throw error;
    }
};

/**
 * Checks if a user is blocked by another user.
 * @param {string} userId 
 * @param {string} targetId 
 */
export const isUserBlocked = async (userId, targetId) => {
    if (!userId || !targetId) return false;
    
    try {
        const { data, error } = await supabase
            .from('user_blocks')
            .select('id')
            .eq('blocker_id', targetId) // Did target block user?
            .eq('blocked_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return !!data;
    } catch (error) {
        console.error('[SafetyService] Error in isUserBlocked:', error);
        return false;
    }
};

/**
 * Unblocks a user.
 * @param {string} blockerId 
 * @param {string} blockedId 
 */
export const unblockUser = async (blockerId, blockedId) => {
    try {
        const { error } = await supabase
            .from('user_blocks')
            .delete()
            .eq('blocker_id', blockerId)
            .eq('blocked_id', blockedId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('[SafetyService] Error in unblockUser:', error);
        throw error;
    }
};
