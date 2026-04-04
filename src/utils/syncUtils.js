/**
 * syncUtils.js - DEPRECATED
 * This utility was used for localStorage synchronization.
 * It is now a NO-OP to ensure Supabase is the single source of truth.
 */

export const updateMemberAndProposalStats = async () => {
    // DEPRECATED: Statistical updates are now handled by Supabase functions or triggers.
    return;
};

export const syncToCloud = async () => {
    // DEPRECATED: Already in Cloud (Supabase). No action needed.
    return true;
};

export const clearLocalStorage = () => {
    // Keep internal app states but clear database mock keys
    const keys = [
        'cooplance_db_users',
        'cooplance_db_services',
        'cooplance_db_jobs',
        'cooplance_db_teams',
        'cooplance_db_proposals'
    ];
    keys.forEach(k => localStorage.removeItem(k));
};

export const syncAll = async () => {
    // DEPRECATED: No action needed for Supabase-backed app.
    return true;
};
