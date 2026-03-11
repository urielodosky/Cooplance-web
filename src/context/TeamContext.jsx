import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../features/auth/context/AuthContext';
import {
    validateCreateTeam as validateCreateService,
    createTeam as createTeamService,
    activateCoopProject as activateProjectService,
    calculateFrozenDistribution as calculateFrozenService,
    canPerformAction as canPerformActionService,
    processMemberExit as processMemberExitService,
    monitorInactivity,
    addMember as addMemberService,
    updateMemberRole as updateRoleService,
    dissolveTeam as dissolveTeamService,
    toggleTeamService as toggleServiceService,
    addTeamService as addTeamServiceService,
    completeProject as completeProjectService,
    updateTeamRules as updateRulesService,
    submitMemberReview as submitReviewService,
    updateTeamInfo as updateTeamInfoService,
    getPublicTeamProfile as getPublicProfileService,
    acceptTeamRules as acceptRulesService,
    respondToInvite as respondToInviteService
} from '../services/TeamService';
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
    const { user, updateUser } = useAuth();
    const [teams, setTeams] = useState([]);
    const [userTeams, setUserTeams] = useState([]); // Teams where user is a member
    const [loading, setLoading] = useState(true);

    // Load Teams from storage on mount
    useEffect(() => {
        // Run background tasks
        monitorInactivity();

        const storedTeams = localStorage.getItem('cooplance_db_teams');
        if (storedTeams) {
            setTeams(JSON.parse(storedTeams));
        } else {
            // Seed initial empty state if needed, or wait for seedData
            setTeams([]);
        }
        setLoading(false);
    }, []);

    // Filter teams relevant to current user
    useEffect(() => {
        if (user && teams.length > 0) {
            const relevant = teams.filter(team =>
                team.members.some(member => member.userId === user.id)
            );
            setUserTeams(relevant);
        } else {
            setUserTeams([]);
        }
    }, [user, teams]);

    // --- BUSINESS LOGIC ---

    // Permission Check: Can this user create a team?
    // Start using Service Logic for consistent validation
    const canCreateTeam = (currentUser) => {
        if (!currentUser) return false;
        try {
            return validateCreateService(currentUser.id);
        } catch (e) {
            // If validation throws, it means they can't create
            // We return false or the error message depending on UI needs
            // Here strict boolean for UI disabling
            return false;
        }
    };

    // 4. Search User (Mock)
    const searchUser = async (query) => {
        // In a real app, this would be an API call
        // Here we search in localStorage 'cooplance_db_users'
        const storedUsers = localStorage.getItem('cooplance_db_users');
        if (!storedUsers) return null;

        const users = JSON.parse(storedUsers);
        const foundUser = users.find(u =>
            (u.username === query || u.email === query) && u.id !== user.id && !u.isDeleted
        );

        if (!foundUser) return null;

        return {
            id: foundUser.id,
            username: foundUser.username,
            firstName: foundUser.firstName,
            lastName: foundUser.lastName,
            email: foundUser.email,
            avatar: foundUser.avatar
        };
    };

    // 1. Create Team
    const createTeam = async (teamData) => {
        // Use Service for strict creation logic
        try {
            const newTeam = createTeamService(teamData, user.id);

            // Update Local State
            setTeams(prev => [...prev, newTeam]);
            return newTeam;
        } catch (error) {
            throw error; // Re-throw for UI to handle
        }
    };

    // 2. Add Member (Mock)
    const addMember = (teamId, newUser) => {
        const teamIndex = teams.findIndex(t => t.id === teamId);
        if (teamIndex === -1) throw new Error("Team no encontrado");

        const team = teams[teamIndex];
        if (team.members.some(m => m.userId === newUser.id)) throw new Error("El usuario ya está en el equipo");

        const updatedTeam = {
            ...team,
            members: [
                ...team.members,
                {
                    userId: newUser.id,
                    role: 'member',
                    joinedAt: new Date().toISOString(),
                    status: 'active'
                }
            ]
        };

        const updatedTeams = [...teams];
        updatedTeams[teamIndex] = updatedTeam;
        setTeams(updatedTeams);
        localStorage.setItem('cooplance_db_teams', JSON.stringify(updatedTeams));

        // Notify invited user
        NotificationService.createNotification(newUser.id, {
            type: NotificationService.NOTIFICATION_TYPES.INVITE,
            title: '¡Te han invitado a una Coop!',
            message: `Has sido añadido a la cooperativa '${team.name}'. Entra para ver los detalles.`,
            link: `/team/${team.id}`
        });
    };

    // 3. CORE ALGORITHM: Distribute Revenue
    const simulateDistribution = (grossAmount, membersWithLevels) => {
        // membersWithLevels expectation: [{ userId, level: 1 }, { userId, level: 5 }]

        const COMMISSION_RATE = 0.12;
        const commission = grossAmount * COMMISSION_RATE;
        const netAmount = grossAmount - commission;

        // Calculate Total Weight (Sum of Levels)
        const totalWeight = membersWithLevels.reduce((sum, member) => sum + (member.level || 1), 0);

        if (totalWeight === 0) return { commission, net: netAmount, distribution: [] };

        const distribution = membersWithLevels.map(member => {
            const level = member.level || 1;
            const shareRatio = level / totalWeight;
            const amount = netAmount * shareRatio;

            return {
                userId: member.userId,
                level: level,
                weightRatio: shareRatio,
                percentage: (shareRatio * 100).toFixed(1),
                amount: amount
            };
        });

        return {
            gross: grossAmount,
            commission: commission,
            net: netAmount,
            totalWeight: totalWeight,
            distribution: distribution
        };
    };

    // 5. Send Message (Mock)
    const sendMessage = (teamId, text, attachment = null, type = 'internal') => {
        const teamIndex = teams.findIndex(t => t.id === teamId);
        if (teamIndex === -1) throw new Error("Team no encontrado");

        // Permission Check for Client Chat (Point 4)
        if (type === 'client') {
            const canTalkToClient = canPerformActionService(teamId, 'client_communication', user.id);
            if (!canTalkToClient) {
                throw new Error("Solo el Encargado de Servicio (o Admin/Fundador) puede hablar con el cliente.");
            }
        }

        const updatedTeam = {
            ...teams[teamIndex],
            messages: [
                ...(teams[teamIndex].messages || []),
                {
                    id: crypto.randomUUID(),
                    userId: user.id,
                    username: user.username || user.firstName,
                    avatar: user.avatar,
                    text: text || '', // Allow empty text if attachment exists
                    attachment, // { url: string, type: 'image' | 'video' }
                    type, // 'internal' | 'client'
                    timestamp: new Date().toISOString()
                }
            ]
        };

        const updatedTeams = [...teams];
        updatedTeams[teamIndex] = updatedTeam;
        setTeams(updatedTeams);
        localStorage.setItem('cooplance_db_teams', JSON.stringify(updatedTeams));
    };

    // 6. Clear Chat (Mock)
    const clearChat = (teamId) => {
        const teamIndex = teams.findIndex(t => t.id === teamId);
        if (teamIndex === -1) return;

        const updatedTeam = {
            ...teams[teamIndex],
            messages: []
        };
        const updatedTeams = [...teams];
        updatedTeams[teamIndex] = updatedTeam;
        setTeams(updatedTeams);
        localStorage.setItem('cooplance_db_teams', JSON.stringify(updatedTeams));
    };

    // 7. Delete Message (Mock)
    const deleteMessage = (teamId, messageId) => {
        const teamIndex = teams.findIndex(t => t.id === teamId);
        if (teamIndex === -1) return;

        const updatedTeam = {
            ...teams[teamIndex],
            messages: (teams[teamIndex].messages || []).filter(m => m.id !== messageId)
        };
        const updatedTeams = [...teams];
        updatedTeams[teamIndex] = updatedTeam;
        setTeams(updatedTeams);
        localStorage.setItem('cooplance_db_teams', JSON.stringify(updatedTeams));
    };

    // 5. Activate Project (Freeze Logic)
    const activateProject = async (teamId, projectId, serviceId, amount) => {
        try {
            const projectSnapshot = activateProjectService(teamId, projectId, serviceId, amount);

            // Refresh local state to reflect new history
            const storedTeams = localStorage.getItem('cooplance_db_teams');
            if (storedTeams) {
                setTeams(JSON.parse(storedTeams));
            }

            return projectSnapshot;
        } catch (error) {
            console.error("Failed to activate project:", error);
            throw error;
        }
    };

    // 6. Get Frozen Distribution
    const getFrozenDistribution = (teamId, projectId) => {
        return calculateFrozenService(teamId, projectId);
    };

    // 7. Join Team (Formerly addMember logic)
    const joinTeam = async (teamId) => {
        // Validation handled by Service in future, for now simple logic + service check
        const teamIndex = teams.findIndex(t => t.id === teamId);
        if (teamIndex === -1) throw new Error("Team no encontrado");

        // Service check for 'join' not strictly implemented yet but can be added
        // validateJoinTeam(user.id, teamId) ...

        const team = teams[teamIndex];
        if (team.members.some(m => m.userId === user.id)) {
            throw new Error("Ya eres miembro de este equipo");
        }

        // Max 7 members check
        if (team.members.filter(m => m.status === 'active').length >= 7) {
            throw new Error("El equipo ha alcanzado el límite de 7 miembros.");
        }

        const newMember = {
            userId: user.id,
            role: 'member',
            joinedAt: new Date().toISOString(),
            status: 'active' // Auto-join for now, should be 'pending' if invite-only
        };

        const updatedTeam = {
            ...team,
            members: [...team.members, newMember]
        };

        const updatedTeams = [...teams];
        updatedTeams[teamIndex] = updatedTeam;
        setTeams(updatedTeams);
        localStorage.setItem('cooplance_db_teams', JSON.stringify(updatedTeams));
    };

    // 8. Leave Team
    const leaveTeam = async (teamId) => {
        try {
            // Use Service for robust exit/succession logic
            const updatedTeam = processMemberExitService(teamId, user.id);

            // Update Local State
            const updatedTeams = [...teams];
            const idx = updatedTeams.findIndex(t => t.id === teamId);
            if (idx !== -1) {
                updatedTeams[idx] = updatedTeam;
            }
            setTeams(updatedTeams);
            // LocalStorage update is handled within processMemberExitService but we update state for reactivity
        } catch (error) {
            console.error("Failed to leave team:", error);
            throw error; // Re-throw for UI
        }
    };

    // 9. Permission Check Wrapper
    const canPerformAction = (teamId, action, targetUserId) => {
        return canPerformActionService(teamId, action, user.id, targetUserId);
    };

    // 10. Management Actions
    const addMemberToTeam = async (teamId, newUserId) => {
        try {
            const updatedTeam = addMemberService(teamId, newUserId, user.id);
            setTeams(prev => prev.map(t => t.id === teamId ? updatedTeam : t));
            return updatedTeam;
        } catch (error) {
            throw error;
        }
    };

    const updateMemberRole = async (teamId, targetUserId, newRole) => {
        try {
            const updatedTeam = updateRoleService(teamId, targetUserId, newRole, user.id);
            setTeams(prev => prev.map(t => t.id === teamId ? updatedTeam : t));

            // Notify target user
            NotificationService.createNotification(targetUserId, {
                type: NotificationService.NOTIFICATION_TYPES.ROLE_CHANGE,
                title: 'Rol Actualizado',
                message: `Tu rol en la cooperativa '${updatedTeam.name}' ha sido cambiado a: ${newRole}.`,
                link: `/team/${updatedTeam.id}`
            });

            return updatedTeam;
        } catch (error) {
            throw error;
        }
    };

    const dissolveCoop = async (teamId) => {
        try {
            const updatedTeam = dissolveTeamService(teamId, user.id);
            setTeams(prev => prev.map(t => t.id === teamId ? updatedTeam : t));
            return updatedTeam;
        } catch (error) {
            throw error;
        }
    };

    const toggleService = async (teamId, serviceId) => {
        try {
            const updatedService = toggleServiceService(teamId, serviceId, user.id);
            // Deep update state for services
            setTeams(prev => prev.map(t => {
                if (t.id === teamId) {
                    const newServices = (t.services || []).map(s => s.id === serviceId ? updatedService : s);
                    return { ...t, services: newServices };
                }
                return t;
            }));
            return updatedService;
        } catch (error) {
            throw error;
        }
    };

    const addServiceToTeam = async (teamId, serviceData) => {
        try {
            const updatedTeam = addTeamServiceService(teamId, serviceData, user.id);
            setTeams(prev => prev.map(t => t.id === teamId ? updatedTeam : t));
            return updatedTeam;
        } catch (error) {
            throw error;
        }
    };

    const closeProject = async (teamId, projectId, ratings) => {
        try {
            const updatedTeam = completeProjectService(teamId, projectId, ratings);
            setTeams(prev => prev.map(t => t.id === teamId ? updatedTeam : t));

            // Sync Current User XP if they gained any
            if (user) {
                const users = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
                const updatedMe = users.find(u => u.id === user.id);
                if (updatedMe && updatedMe.xp !== user.xp) {
                    updateUser(updatedMe);
                }
            }

            return updatedTeam;
        } catch (error) {
            throw error;
        }
    };

    const updateRules = async (teamId, rulesText) => {
        try {
            const updatedTeam = updateRulesService(teamId, rulesText, user.id);
            setTeams(prev => prev.map(t => t.id === teamId ? updatedTeam : t));
            return updatedTeam;
        } catch (error) {
            throw error;
        }
    };

    const submitEvaluation = async (teamId, projectId, targetUserId, score, feedback) => {
        try {
            const updatedTeam = submitReviewService(teamId, projectId, user.id, targetUserId, score, feedback);
            setTeams(prev => prev.map(t => t.id === teamId ? updatedTeam : t));
            return updatedTeam;
        } catch (error) {
            throw error;
        }
    };

    const updateTeam = async (teamId, data) => {
        try {
            const updatedTeam = updateTeamInfoService(teamId, data, user.id);
            setTeams(prev => prev.map(t => t.id === teamId ? updatedTeam : t));
            return updatedTeam;
        } catch (error) {
            throw error;
        }
    };

    const respondToInvite = async (teamId, accept) => {
        try {
            const updatedTeam = respondToInviteService(teamId, user.id, accept);
            setTeams(prev => prev.map(t => t.id === teamId ? updatedTeam : t));

            // Notify when someone accepts an invite so team knows
            if (accept) {
                NotificationService.createNotification(updatedTeam.createdBy, {
                    type: NotificationService.NOTIFICATION_TYPES.SYSTEM,
                    title: '¡Nueva incorporación!',
                    message: `${user.username || user.firstName} ha aceptado tu invitación a la Coop '${updatedTeam.name}'.`,
                    link: `/team/${updatedTeam.id}`
                });
            }

            return updatedTeam;
        } catch (error) {
            throw error;
        }
    };

    const getPublicProfile = async (teamId) => {
        try {
            return getPublicProfileService(teamId);
        } catch (error) {
            throw error;
        }
    };

    const acceptRules = async (teamId) => {
        try {
            const updatedTeam = acceptRulesService(teamId, user.id);
            setTeams(prev => prev.map(t => t.id === teamId ? updatedTeam : t));
            return updatedTeam;
        } catch (error) {
            throw error;
        }
    };


    const value = {
        teams,
        userTeams,
        loading,
        createTeam,
        canCreateTeam,
        searchUser,
        joinTeam,
        leaveTeam,
        sendMessage,
        clearChat,
        deleteMessage,
        simulateDistribution,
        // New Advanced Features
        activateProject,
        getFrozenDistribution,
        canPerformAction,
        addMemberToTeam,
        updateMemberRole,
        dissolveCoop,
        toggleService,
        addServiceToTeam,
        closeProject,
        updateRules,
        submitEvaluation,
        updateTeam,
        getPublicProfile,
        acceptRules,
        respondToInvite
    };

    return (
        <TeamContext.Provider value={value}>
            {children}
        </TeamContext.Provider>
    );
};

