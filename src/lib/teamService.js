import { supabase } from './supabase';

/**
 * TeamService - Supabase
 */

export const getTeams = async () => {
    const { data, error } = await supabase
        .from('teams')
        .select('*, founder:founder_id(username, avatar_url)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[TeamService] Error fetching teams:', error);
        return [];
    }
    return data;
};

export const getTeamById = async (id) => {
    const { data, error } = await supabase
        .from('teams')
        .select('*, members:team_members(*, user:user_id(username, first_name, last_name, avatar_url, role))')
        .eq('id', id)
        .single();

    if (error) {
        console.error('[TeamService] Error fetching team:', error);
        return null;
    }
    return data;
};

export const createTeam = async (teamData) => {
    const { data, error } = await supabase
        .from('teams')
        .insert({
            name: teamData.name,
            description: teamData.description,
            founder_id: teamData.founderId,
            avatar_url: teamData.avatarUrl || null,
            internal_rules: teamData.internalRules || null
        })
        .select('*')
        .single();

    if (error) {
        console.error('[TeamService] Error creating team:', error);
        throw error;
    }

    // Add founder as owner in team_members
    await supabase.from('team_members').insert({
        team_id: data.id,
        user_id: teamData.founderId,
        role: 'owner',
        status: 'active'
    });

    return data;
};

export const joinTeam = async (teamId, userId) => {
    const { error } = await supabase
        .from('team_members')
        .insert({
            team_id: teamId,
            user_id: userId,
            role: 'member',
            status: 'pending'
        });

    if (error) {
        console.error('[TeamService] Error joining team:', error);
        throw error;
    }
};

export const updateMemberStatus = async (teamId, userId, status) => {
    const { error } = await supabase
        .from('team_members')
        .update({ status })
        .match({ team_id: teamId, user_id: userId });

    if (error) {
        console.error('[TeamService] Error updating member status:', error);
        throw error;
    }
};

export const getMyTeams = async (userId) => {
    const { data, error } = await supabase
        .from('team_members')
        .select('*, team:team_id(*)')
        .eq('user_id', userId);

    if (error) {
        console.error('[TeamService] Error fetching my teams:', error);
        return [];
    }
    return data.map(m => ({ ...m.team, myRole: m.role, myStatus: m.status }));
};
