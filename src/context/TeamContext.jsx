import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import { supabase } from '../lib/supabase';
import * as TeamService from '../services/TeamService';
import * as NotificationService from '../services/NotificationService';

const TeamContext = createContext();

export const useTeams = () => {
    const context = useContext(TeamContext);
    if (!context) {
        throw new Error('useTeams debe ser usado dentro de un TeamProvider');
    }
    return context;
};

export const TeamProvider = ({ children }) => {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [userTeams, setUserTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTeams = useCallback(async () => {
        if (!user?.id) {
            setTeams([]);
            setUserTeams([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data: allTeams, error } = await supabase
                .from('coops')
                .select('*, members:coop_members(*)');
            
            console.log('DEBUG: fetchTeams - allTeams from DB:', allTeams);
            console.log('DEBUG: fetchTeams - current user.id:', user.id);

            if (error) {
                console.error('DEBUG: fetchTeams ERROR DETAILS:', error);
                throw error;
            }
            
            // 2. Fetch profiles safely avoiding foreign key ambiguity
            const allMembers = (allTeams || []).flatMap(team => team.members || []);
            const userIds = [...new Set(allMembers.map(m => m.user_id).filter(Boolean))];
            
            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url, first_name, last_name, level, rating, reviews:service_reviews!target_id(rating)')
                    .in('id', userIds);
                    
                if (profiles) {
                    (allTeams || []).forEach(team => {
                        (team.members || []).forEach(member => {
                            member.profile = profiles.find(p => p.id === member.user_id) || null;
                        });
                    });
                }
            }
            
            setTeams(allTeams || []);
            
            // Filter teams where user is a member
            const relevant = (allTeams || []).filter(team => {
                if (!team.members) return false;
                return team.members.some(member => member.user_id === user.id);
            });
            setUserTeams(relevant);
        } catch (err) {
            console.error('Error fetching coops:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchTeams().catch(err => console.error('[TeamContext] Unhandled fetchTeams error:', err));
        
        // Real-time subscription
        const channel = supabase
            .channel('team-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'coops' }, () => {
                fetchTeams().catch(err => console.error('[TeamContext] Re-fetch error:', err));
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'coop_members' }, () => {
                fetchTeams().catch(err => console.error('[TeamContext] Re-fetch error:', err));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchTeams]);

    // --- Actions ---

    const createTeam = useCallback(async (teamData) => {
        if (!user?.id) throw new Error('Auth required');
        const team = await TeamService.createTeam(teamData, user.id);
        await fetchTeams();
        return team;
    }, [user?.id, fetchTeams]);

    const addMemberToTeam = useCallback(async (teamId, newUserId, message = "") => {
        try {
            // Fetch team info for the notification
            const { data: team } = await supabase
                .from('coops')
                .select('name')
                .eq('id', teamId)
                .single();

            await TeamService.addMember(teamId, newUserId, {
                invitedBy: user.id,
                message: message
            });
            await fetchTeams();

            // Notify the new member
            if (team && user) {
                const inviterName = user.first_name || user.username || 'Un usuario';
                await NotificationService.createNotification(newUserId, {
                    type: 'coop_invite',
                    title: 'Invitación a Coop',
                    message: `🤝 ${inviterName} te invitó a unirte a su Coop '${team.name}'.`,
                    link: '/my-coops'
                });
            }
        } catch (err) {
            console.error('[TeamContext] Error inviting member:', err);
        }
    }, [user, fetchTeams]);

    const updateMemberRole = useCallback(async (teamId, targetUserId, newRole) => {
        await TeamService.updateMemberRole(teamId, targetUserId, newRole, user.id);
        await fetchTeams();
    }, [user?.id, fetchTeams]);

    const leaveTeam = useCallback(async (teamId) => {
        await TeamService.processMemberExit(teamId, user.id);
        await fetchTeams();
    }, [user?.id, fetchTeams]);

    const dissolveCoop = useCallback(async (teamId) => {
        await TeamService.dissolveTeam(teamId, user.id);
        await fetchTeams();
    }, [user?.id, fetchTeams]);

    const toggleService = useCallback(async (teamId, serviceId) => {
        await TeamService.toggleTeamService(teamId, serviceId, user.id);
        await fetchTeams();
    }, [user?.id, fetchTeams]);

    const updateRules = useCallback(async (teamId, rulesText) => {
        await TeamService.updateTeamRules(teamId, rulesText, user.id);
        await fetchTeams();
    }, [user?.id, fetchTeams]);

    const acceptRules = useCallback(async (teamId) => {
        await TeamService.acceptTeamRules(teamId, user.id);
        await fetchTeams();
    }, [user?.id, fetchTeams]);

    const closeProject = useCallback(async (teamId, projectId, ratings) => {
        await TeamService.completeProject(teamId, projectId, ratings);
        await fetchTeams();
    }, [fetchTeams]);

    const submitEvaluation = useCallback(async (teamId, projectId, targetUserId, score, feedback) => {
        await TeamService.submitMemberReview(teamId, projectId, user.id, targetUserId, score, feedback);
        await fetchTeams();
    }, [user?.id, fetchTeams]);

    const updateTeam = useCallback(async (teamId, data) => {
        await TeamService.updateTeamInfo(teamId, data, user.id);
        await fetchTeams();
    }, [user?.id, fetchTeams]);

    const respondToInvite = useCallback(async (teamId, accept) => {
        await TeamService.respondToInvite(teamId, user.id, accept);
        await fetchTeams();
    }, [user?.id, fetchTeams]);

    const applyToTeam = useCallback(async (teamId, coverLetter) => {
        await TeamService.applyToCoop(teamId, user.id, coverLetter);
        await fetchTeams();
    }, [user?.id, fetchTeams]);

    const handleApplicationResponse = useCallback(async (teamId, applicantId, accept) => {
        await TeamService.handleApplication(teamId, applicantId, user.id, accept);
        await fetchTeams();
    }, [user?.id, fetchTeams]);

    // Helper for UI
    const canCreateTeam = (user) => {
        if (!user) return false;
        const level = user.level || 1;
        if (user.role === 'freelancer') return level >= 3;
        return level >= 6; // Companies or others
    };

    const searchUser = async (query) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'freelancer') // Only freelancers can be invited to Coops
            .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(1)
            .single();
        
        if (error) return null;
        return {
            id: data.id,
            username: data.username,
            firstName: data.first_name,
            lastName: data.last_name,
            avatar: data.avatar_url
        };
    };

    const canPerformAction = (teamId, action, targetUserId) => {
        return TeamService.canPerformAction(teamId, action, user.id, targetUserId);
    };

    const value = React.useMemo(() => ({
        teams,
        userTeams,
        loading,
        createTeam,
        leaveTeam,
        addMemberToTeam,
        updateMemberRole,
        dissolveCoop,
        toggleService,
        updateRules,
        acceptRules,
        closeProject,
        submitEvaluation,
        updateTeam,
        respondToInvite,
        applyToTeam,
        handleApplicationResponse,
        canCreateTeam,
        searchUser,
        canPerformAction
    }), [
        teams,
        userTeams,
        loading,
        createTeam,
        leaveTeam,
        addMemberToTeam,
        updateMemberRole,
        dissolveCoop,
        toggleService,
        updateRules,
        acceptRules,
        closeProject,
        submitEvaluation,
        updateTeam,
        respondToInvite,
        applyToTeam,
        handleApplicationResponse,
        canPerformAction
    ]);

    return (
        <TeamContext.Provider value={value}>
            {children}
        </TeamContext.Provider>
    );
};

