import { calculateXPForJob, calculateNextLevelXP, registerActivity } from '../utils/gamification';

/**
 * TeamService.js
 * 
 * Simulates a robust Backend for Cooplance Teams.
 * Handles strict validations, project freezing logic, and revenue distribution.
 * 
 * CORE PRINCIPLES:
 * 1. Single Source of Truth: Reads/Writes to 'cooplance_db_teams' and 'cooplance_db_users'.
 * 2. Statutory Logic: Enforces rules defined in teams_spec.md.
 * 3. Freezing: Snapshots data for financial integrity.
 */

const DB_KEYS = {
    TEAMS: 'cooplance_db_teams',
    USERS: 'cooplance_db_users',
    PROJECTS: 'cooplance_db_projects' // Hypothetical project DB
};

// --- HELPERS ---

const getDB = (key) => {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
        console.error('DB Read Error', e);
        return [];
    }
};

const saveDB = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('DB Write Error', e);
        return false;
    }
};

const getUser = (userId) => {
    const users = getDB(DB_KEYS.USERS);
    return users.find(u => u.id === userId);
};

// --- 1. CREATION VALIDATIONS ---

/**
 * Validates if a user can create another team.
 * Rules:
 * - Lvl 1-3: Max 1 team.
 * - Lvl 4-8: Max 2 teams.
 * - Lvl 9+: Max 3 teams.
 * - Founder limit: Can only be founder of active teams within limit.
 */
export const validateCreateTeam = (userId) => {
    const user = getUser(userId);
    if (!user) throw new Error("Usuario no encontrado");

    // Role Check
    if (user.role === 'freelancer' && (user.level || 1) < 3) {
        throw new Error("Nivel insuficiente. Requieres Nivel 3 para crear una Coop.");
    }
    if (user.role === 'client' && (user.level || 1) < 10) {
        throw new Error("Nivel insuficiente. Requieres Nivel 10 para crear un Equipo Preferido.");
    }

    // Overlap Check (How many teams is this user a FOUNDER of?)
    const teams = getDB(DB_KEYS.TEAMS);
    const foundedTeams = teams.filter(t => t.createdBy === userId && t.status !== 'dissolved');

    let limit = 0;
    const level = user.level || 1;
    if (level <= 3) limit = 1;
    else if (level <= 8) limit = 2;
    else limit = 3;

    if (foundedTeams.length >= limit) {
        throw new Error(`Has alcanzado el límite de Coops fundadas (${limit}) para tu nivel.`);
    }

    return true;
};

// --- 2. TEAM MANAGEMENT ---

export const createTeam = (teamData, founderId) => {
    validateCreateTeam(founderId);

    const teams = getDB(DB_KEYS.TEAMS);

    // Uniqueness Check
    if (teams.some(t => t.name.toLowerCase() === teamData.name.toLowerCase())) {
        throw new Error("El nombre de la Coop ya está registrado.");
    }

    const newTeam = {
        id: crypto.randomUUID(),
        ...teamData,
        createdBy: founderId,
        createdAt: new Date().toISOString(),
        status: 'active',
        members: [
            {
                userId: founderId,
                role: 'owner', // Map 'founder' to 'owner' for compatibility
                joinedAt: new Date().toISOString(),
                status: 'active'
            },
            ...(teamData.invitedMembers || []).map(invited => ({
                userId: invited.id,
                role: 'member',
                joinedAt: new Date().toISOString(),
                status: 'pending'
            }))
        ],
        stats: {
            totalProjects: 0,
            avgRating: 0,
            avgDeliveryTime: 0
        },
        services: [], // Services offered by this team
        activeProjects: [] // Snapshot references
    };

    teams.push(newTeam);
    saveDB(DB_KEYS.TEAMS, teams);
    return newTeam;
};

// --- 3. PROJECT LIFECYCLE (FREEZING LOGIC) ---

/**
 * Activates a project for a Coop, FREEZING the member structure.
 * This is the critical financial snapshot.
 */
export const activateCoopProject = (teamId, projectId, serviceId, amount) => {
    const teams = getDB(DB_KEYS.TEAMS);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) throw new Error("Coop no encontrada");

    const team = teams[teamIndex];

    // 1. Snapshot Members and Levels
    const activeMembers = team.members.filter(m => m.status === 'active');
    if (activeMembers.length < 2) throw new Error("Se requieren al menos 2 miembros activos para aceptar un proyecto.");

    const frozenLevels = {};
    let totalLevelWeight = 0;

    activeMembers.forEach(member => {
        const user = getUser(member.userId);
        const level = user ? (user.level || 1) : 1;
        frozenLevels[member.userId] = level;
        totalLevelWeight += level;
    });

    // 2. Financial Calculation (Frozen)
    const platformFee = amount * 0.12;
    const netAmount = amount - platformFee;

    // 3. Create Project Record (Internal Logic Ref)
    const projectSnapshot = {
        projectId,
        serviceId,
        activationDate: new Date().toISOString(),
        participants: activeMembers.map(m => m.userId), // Frozen List
        frozenLevels, // Map<UserId, Level>
        financials: {
            gross: amount,
            fee: platformFee,
            net: netAmount,
            totalWeight: totalLevelWeight
        }
    };

    // 4. Update Team State
    // We add to a 'history' or 'activeProjects' list in the team entity
    // In a real DB, this would be a separate 'projects' table
    if (!team.projectHistory) team.projectHistory = [];
    team.projectHistory.push(projectSnapshot);

    saveDB(DB_KEYS.TEAMS, teams);
    return projectSnapshot;
};

/**
 * Calculates distribution based on a FROZEN project snapshot.
 * Does NOT use current user levels.
 */
export const calculateFrozenDistribution = (teamId, projectId) => {
    const teams = getDB(DB_KEYS.TEAMS);
    const team = teams.find(t => t.id === teamId);
    if (!team) throw new Error("Coop no encontrada");

    const project = team.projectHistory?.find(p => p.projectId === projectId);
    if (!project) throw new Error("Proyecto no encontrado o no activado en esta Coop.");

    const { frozenLevels, financials } = project;
    const { net, totalWeight } = financials;

    const distribution = Object.entries(frozenLevels).map(([userId, level]) => {
        const share = (level / totalWeight) * net;
        return {
            userId,
            levelSnapshot: level, // Show the level used for calculation
            amount: share,
            percentage: (level / totalWeight) * 100
        };
    });

    return distribution;
};

// --- 4. GOVERNANCE & ROLES ---

/**
 * Checks if a specific action is allowed.
 * Enforces Role Hierarchy and Project Freezing rules.
 */
export const canPerformAction = (teamId, action, actorId, targetId = null) => {
    const teams = getDB(DB_KEYS.TEAMS);
    const team = teams.find(t => t.id === teamId);
    if (!team) return false;

    // 1. Identify Actor Role
    const actor = team.members.find(m => m.userId === actorId);
    if (!actor || actor.status !== 'active') return false;
    const role = actor.role; // 'owner' | 'admin' | 'member' | 'service_manager'

    // 2. Project Freeze Check (Global Rule)
    // No kick/leave/dissolve during active projects
    const affectedUserId = targetId || actorId; // For leave/kick, target matters
    if (['kick', 'leave', 'dissolve'].includes(action)) {
        const hasActiveProject = team.projectHistory?.some(p =>
            p.status === 'active' && p.participants.includes(affectedUserId)
        );
        if (hasActiveProject) {
            throw new Error(`Acción '${action}' bloqueada: El usuario participa en un proyecto activo.`);
        }
    }

    // 3. Role-Based Permissions
    switch (action) {
        case 'invite':
            // Only Owner and Admin can invite
            if (role === 'owner' || role === 'admin') return true;
            return false;

        case 'kick':
            // Owner can kick anyone (except themselves, handled by leave)
            if (role === 'owner') return true;
            // Admin can kick Members only
            if (role === 'admin') {
                const target = team.members.find(m => m.userId === targetId);
                if (!target) return false;
                if (target.role === 'member') return true;
                return false; // Cannot kick Owner or other Admin
            }
            return false;

        case 'promote':
            // Only Owner can promote to Admin
            // Admin can promote to Service Manager (hypothetically)
            if (role === 'owner') return true;
            return false;

        case 'dissolve':
            return role === 'owner';

        case 'manage_service':
            // Owner, Admin, and Service Manager can manage services
            if (['owner', 'admin'].includes(role)) return true;
            // Service Manager: Logic could be refined to specific service, 
            // but for now general permission
            if (role === 'service_manager') return true;
            return false;

        case 'client_communication':
            // Point 4: Only Encargado (Service Manager) + Owner/Admin can speak to client
            return ['owner', 'admin', 'service_manager'].includes(role);

        case 'leave':
            return true; // Anyone can leave (subject to freeze check above)

        default:
            return false;
    }
};

// --- 5. GOVERNANCE: SUCCESSION & EXIT ---

/**
 * Handles the logic when a member leaves, especially the Founder.
 * Returns the updated team object or throws error.
 */
export const processMemberExit = (teamId, userId) => {
    const teams = getDB(DB_KEYS.TEAMS);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) throw new Error("Coop no encontrada");

    let team = teams[teamIndex];
    const memberIndex = team.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) throw new Error("Miembro no encontrado");

    const member = team.members[memberIndex];

    // Check strict rules first
    if (!canPerformAction(teamId, 'leave', userId)) {
        throw new Error("No puedes salir durante un proyecto activo.");
    }

    // Is Founder?
    if (member.role === 'owner') {
        const remainingMembers = team.members.filter(m => m.userId !== userId && m.status === 'active');

        if (remainingMembers.length === 0) {
            // No one left -> Dissolve
            team.status = 'dissolved';
            team.members[memberIndex].status = 'left';
            team.members[memberIndex].leftAt = new Date().toISOString();
        } else {
            // Succession Logic: 
            // 1. Oldest Admin
            // 2. Oldest Member
            // Sort by joinedAt asc
            remainingMembers.sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));

            const successor = remainingMembers.find(m => m.role === 'admin') || remainingMembers[0];

            // Promote Successor
            const successorIndex = team.members.findIndex(m => m.userId === successor.userId);
            team.members[successorIndex].role = 'owner';
            team.createdBy = successor.userId; // Update metadata

            // Mark Founder as left
            team.members[memberIndex].status = 'left';
            team.members[memberIndex].leftAt = new Date().toISOString();
            team.members[memberIndex].role = 'member'; // Downgrade in history
        }
    } else {
        // Regular Member Exit
        team.members[memberIndex].status = 'left';
        team.members[memberIndex].leftAt = new Date().toISOString();
    }

    // Save
    teams[teamIndex] = team;
    saveDB(DB_KEYS.TEAMS, teams);
    return team;
};

// --- 6. BACKGROUND MONITORING ---

/**
 * Checks for inactive teams and updates their status.
 * - > 90 days inactive: Set to 'inactive'.
 * - > 120 days inactive: Set to 'dissolved'.
 */
export const monitorInactivity = () => {
    const teams = getDB(DB_KEYS.TEAMS);
    const now = new Date();
    let changed = false;

    teams.forEach(team => {
        if (team.status === 'dissolved') return;

        // Determine last activity (Mock: use createdAt or last project date)
        // In real app, this would track chat, projects, etc.
        let lastActivity = new Date(team.createdAt);
        if (team.projectHistory && team.projectHistory.length > 0) {
            const lastProject = team.projectHistory[team.projectHistory.length - 1];
            lastActivity = new Date(lastProject.activationDate);
        }

        const diffTime = Math.abs(now - lastActivity);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 120 && team.status !== 'dissolved') {
            team.status = 'dissolved';
            changed = true;
        } else if (diffDays > 90 && team.status !== 'inactive') {
            team.status = 'inactive';
            changed = true;
        }
    });

    if (changed) {
        saveDB(DB_KEYS.TEAMS, teams);
    }
    return changed;
};

/**
 * Adds a new member to the team.
 * Enforces: Role permissions, Member limits.
 */
export const addMember = (teamId, newUserId, actorId) => {
    // 1. Permission Check
    if (!canPerformAction(teamId, 'invite', actorId)) {
        throw new Error("No tienes permisos para invitar miembros.");
    }

    const teams = getDB(DB_KEYS.TEAMS);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    const team = teams[teamIndex];

    // 2. Member Limit Check (Max 7)
    const activeMembers = team.members.filter(m => m.status === 'active' || m.status === 'pending');
    if (activeMembers.length >= 7) {
        throw new Error("El equipo ha alcanzado el límite máximo de 7 miembros.");
    }

    // 3. Already Member Check
    if (team.members.some(m => m.userId === newUserId && (m.status === 'active' || m.status === 'pending'))) {
        throw new Error("El usuario ya es miembro o tiene invitación pendiente.");
    }

    // 4. Add Member
    team.members.push({
        userId: newUserId,
        role: 'member',
        joinedAt: new Date().toISOString(),
        status: 'pending'
    });

    saveDB(DB_KEYS.TEAMS, teams);
    return team;
};

/**
 * Responds to a pending team invite.
 * @param {string} teamId
 * @param {string} userId
 * @param {boolean} accept
 */
export const respondToInvite = (teamId, userId, accept) => {
    const teams = getDB(DB_KEYS.TEAMS);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    if (teamIndex === -1) throw new Error("Coop no encontrada");

    const team = teams[teamIndex];
    const memberIndex = team.members.findIndex(m => m.userId === userId && m.status === 'pending');
    if (memberIndex === -1) throw new Error("No tienes una invitación pendiente para esta Coop.");

    if (accept) {
        team.members[memberIndex].status = 'active';
        team.members[memberIndex].joinedAt = new Date().toISOString();
    } else {
        team.members.splice(memberIndex, 1);
    }

    saveDB(DB_KEYS.TEAMS, teams);
    return team;
};

/**
 * Updates a member's role.
 * Enforces: Role permissions, Project Freezing.
 */
export const updateMemberRole = (teamId, targetUserId, newRole, actorId) => {
    // 1. Permission Check (Promote/Demote logic)
    // For now, only Owner can change roles freely, or Admin can promote to Admin (if logic allowed)
    // We use 'promote' action for any role change for simplicity here
    if (!canPerformAction(teamId, 'promote', actorId)) {
        throw new Error("No tienes permisos para gestionar roles.");
    }

    // 2. Project Freeze Check (Strict: No role changes during active project to avoid confusion)
    const teams = getDB(DB_KEYS.TEAMS);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    const team = teams[teamIndex];

    if (team.members.find(m => m.userId === actorId).role !== 'owner' && newRole === 'owner') {
        throw new Error("Solo se puede transferir la propiedad mediante Sucesión.");
    }

    // Check if target is involved in active project?
    // Spec doesn't strictly forbid role change during project, but it's safer.
    // Let's allow it but warn it won't affect frozen distributions.

    const memberIndex = team.members.findIndex(m => m.userId === targetUserId);
    if (memberIndex === -1) throw new Error("Miembro no encontrado.");

    team.members[memberIndex].role = newRole;
    saveDB(DB_KEYS.TEAMS, teams);
    return team;
};

/**
 * Dissolves the team.
 * Enforces: Owner only, No active projects.
 */
export const dissolveTeam = (teamId, actorId) => {
    if (!canPerformAction(teamId, 'dissolve', actorId)) {
        throw new Error("No tienes permisos para disolver el equipo o hay proyectos activos.");
    }

    const teams = getDB(DB_KEYS.TEAMS);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    const team = teams[teamIndex];

    team.status = 'dissolved';
    team.dissolvedAt = new Date().toISOString();

    saveDB(DB_KEYS.TEAMS, teams);
    return team;
};

/**
 * Toggles a service status or updates it.
 * Enforces: Manage Service permission.
 */
export const toggleTeamService = (teamId, serviceId, actorId) => {
    if (!canPerformAction(teamId, 'manage_service', actorId)) {
        throw new Error("No tienes permisos para gestionar servicios.");
    }

    const teams = getDB(DB_KEYS.TEAMS);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    const team = teams[teamIndex];

    const serviceIndex = team.services?.findIndex(s => s.id === serviceId);
    if (serviceIndex === undefined || serviceIndex === -1) throw new Error("Servicio no encontrado.");

    // Toggle active state
    team.services[serviceIndex].active = !team.services[serviceIndex].active;

    saveDB(DB_KEYS.TEAMS, teams);
    return team.services[serviceIndex];
};


/**
 * Adds a service to the team.
 * Enforces: Manage Service permission.
 */
export const addTeamService = (teamId, serviceData, actorId) => {
    if (!canPerformAction(teamId, 'manage_service', actorId)) {
        throw new Error("No tienes permisos para gestionar servicios.");
    }

    const teams = getDB(DB_KEYS.TEAMS);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    const team = teams[teamIndex];

    const newService = {
        id: crypto.randomUUID(),
        ...serviceData,
        active: true,
        createdAt: new Date().toISOString()
    };

    if (!team.services) team.services = [];
    team.services.push(newService);

    saveDB(DB_KEYS.TEAMS, teams);
    return team;
};


/**
 * Completes a project (Client action simulated).
 * Updates status, ratings, and reputation.
 */
export const completeProject = (teamId, projectId, ratings) => {
    // ratings: { clientScore: 1-5, feedback: string }

    const teams = getDB(DB_KEYS.TEAMS);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    const team = teams[teamIndex];

    const projectIndex = team.projectHistory?.findIndex(p => p.projectId === projectId);
    if (projectIndex === -1 || projectIndex === undefined) throw new Error("Proyecto no encontrado.");

    const project = team.projectHistory[projectIndex];
    if (project.status === 'completed') throw new Error("El proyecto ya está completado.");

    // Update Project
    project.status = 'completed';
    project.completedAt = new Date().toISOString();
    project.ratings = ratings;

    // Update Team Stats (Reputation)
    const currentTotal = team.stats.totalProjects || 0;
    const currentAvg = team.stats.avgRating || 0;
    const newTotal = currentTotal + 1;
    // New Avg = ((Old Avg * Old Total) + New Score) / New Total
    const newAvg = ((currentAvg * currentTotal) + ratings.clientScore) / newTotal;

    team.stats.totalProjects = newTotal;
    team.stats.avgRating = Number(newAvg.toFixed(2));

    // Experience Points (XP) Distribution Logic
    const users = getDB(DB_KEYS.USERS);
    let usersUpdated = false;

    team.members.forEach(member => {
        if (member.status !== 'active') return;

        const userIndex = users.findIndex(u => u.id === member.userId);
        if (userIndex !== -1) {
            let memberUser = users[userIndex];

            // Generate base XP as if they did a normal job
            const normalXP = calculateXPForJob(project.financials.gross, memberUser.level || 1, 'freelancer');

            let xpEarned = 0;
            if (project.participants.includes(member.userId)) {
                // Participants get half (50%)
                xpEarned = Math.floor(normalXP / 2);
            } else {
                // Non-participants in the Coop get a tenth (10%)
                xpEarned = Math.floor(normalXP / 10);
            }

            if (xpEarned > 0) {
                memberUser.xp = (memberUser.xp || 0) + xpEarned;
                memberUser = registerActivity(memberUser);

                const nextLevelXP = calculateNextLevelXP(memberUser.level || 1);
                if (memberUser.xp >= nextLevelXP && (memberUser.level || 1) < 10) {
                    memberUser.level = (memberUser.level || 1) + 1;
                }

                users[userIndex] = memberUser;
                usersUpdated = true;
            }
        }
    });

    if (usersUpdated) {
        saveDB(DB_KEYS.USERS, users);
    }

    saveDB(DB_KEYS.TEAMS, teams);
    return team;
};

/**
 * Updates internal rules of the team.
 * Enforces: Founder/Admin only, No active projects.
 */
export const updateTeamRules = (teamId, rulesText, actorId) => {
    // 1. Permission (Owner/Admin can initiate, but strictly Founder defines rules per spec)
    // Let's stick to spec: Founder defines rules.
    if (!canPerformAction(teamId, 'dissolve', actorId)) { // Reusing 'dissolve' as proxy for owner-only critical actions
        throw new Error("Solo el Fundador puede modificar las reglas internas.");
    }

    // 2. Project Freeze Check
    const teams = getDB(DB_KEYS.TEAMS);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    const team = teams[teamIndex];

    const hasActive = team.projectHistory?.some(p => p.status === 'active');
    if (hasActive) {
        throw new Error("No se pueden modificar las reglas durante proyectos activos.");
    }

    team.internalRules = rulesText;
    team.rulesUpdatedAt = new Date().toISOString();
    team.rulesVersion = (team.rulesVersion || 0) + 1;

    // Auto-accept for the Founder who updated it
    const founderMember = team.members.find(m => m.userId === actorId);
    if (founderMember) {
        founderMember.rulesAcceptedVersion = team.rulesVersion;
    }

    saveDB(DB_KEYS.TEAMS, teams);
    return team;
};

/**
 * Marks the current rules as accepted by a member.
 */
export const acceptTeamRules = (teamId, userId) => {
    const teams = getDB(DB_KEYS.TEAMS);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    const team = teams[teamIndex];

    const memberIndex = team.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) throw new Error("Miembro no encontrado.");

    team.members[memberIndex].rulesAcceptedVersion = team.rulesVersion || 1;
    team.members[memberIndex].lastRulesAcceptedAt = new Date().toISOString();

    saveDB(DB_KEYS.TEAMS, teams);
    return team;
};

/**
 * Submits an internal review for a peer in a completed project.
 * Enforces: Project completed, Both participated.
 */
export const submitMemberReview = (teamId, projectId, evaluatorId, targetUserId, score, feedback) => {
    const teams = getDB(DB_KEYS.TEAMS);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    const team = teams[teamIndex];

    const projectIndex = team.projectHistory?.findIndex(p => p.projectId === projectId);
    if (projectIndex === -1 || projectIndex === undefined) throw new Error("Proyecto no encontrado.");

    const project = team.projectHistory[projectIndex];
    if (project.status !== 'completed') throw new Error("Solo se pueden evaluar proyectos completados.");

    // Verify participation
    const evaluator = project.participants.includes(evaluatorId);
    const target = project.participants.includes(targetUserId);

    if (!evaluator || !target) throw new Error("Ambos usuarios deben haber participado en el proyecto.");
    if (evaluatorId === targetUserId) throw new Error("No puedes auto-evaluarte.");

    // Init reviews array
    if (!project.internalReviews) project.internalReviews = [];

    // Check if already reviewed this target
    const existing = project.internalReviews.find(r => r.evaluatorId === evaluatorId && r.targetUserId === targetUserId);
    if (existing) throw new Error("Ya has evaluado a este compañero en este proyecto.");

    const review = {
        id: crypto.randomUUID(),
        evaluatorId,
        targetUserId,
        score, // 1-5
        feedback,
        createdAt: new Date().toISOString()
    };

    project.internalReviews.push(review);

    // Optional: Calculate logic for "Pending Reviews" could be done on read-time

    saveDB(DB_KEYS.TEAMS, teams);
    return team;
};

/**
 * Updates team general info (Name, Description).
 * TRACKS NAME CHANGES for Transparency (Point 13).
 */
export const updateTeamInfo = (teamId, data, actorId) => {
    // data: { name, description }

    // 1. Permission (Owner/Admin)
    if (!canPerformAction(teamId, 'invite', actorId)) { // Reusing 'invite' (Owner/Admin)
        throw new Error("No tienes permisos para editar la información del equipo.");
    }

    const teams = getDB(DB_KEYS.TEAMS);
    const teamIndex = teams.findIndex(t => t.id === teamId);
    const team = teams[teamIndex];

    // 2. Name Change Logic
    if (data.name && data.name !== team.name) {
        if (!team.nameHistory) team.nameHistory = [];
        team.nameHistory.push({
            oldName: team.name,
            changedAt: new Date().toISOString(),
            changedBy: actorId
        });
        team.name = data.name;
    }

    if (data.description) team.description = data.description;
    // Add other fields as needed (categories, etc.)

    saveDB(DB_KEYS.TEAMS, teams);
    return team;
};

/**
 * Aggregates PUBLIC data for Transparency Profile (Point 13).
 * accessible by ANYONE (even non-members).
 */
export const getPublicTeamProfile = (teamId) => {
    const teams = getDB(DB_KEYS.TEAMS);
    const team = teams.find(t => t.id === teamId);
    if (!team) throw new Error("Coop no encontrada");

    // 1. Calculate Rotation Rate
    // Rotation = (Ex-Members / Total Historically Joined) * 100
    // OR Spec: "Members that left".
    const currentCount = team.members.filter(m => m.status === 'active').length;
    const exCount = team.members.filter(m => m.status === 'left').length;
    const totalHistorical = currentCount + exCount;
    const rotationRate = totalHistorical > 0 ? ((exCount / totalHistorical) * 100).toFixed(1) : "0.0";

    // 2. Members List (Sanitized)
    const membersPublic = team.members.map(m => {
        const user = getUser(m.userId);
        return {
            userId: m.userId,
            username: user ? user.username : 'Unknown',
            role: m.role,
            status: m.status,
            level: user ? user.level : '?',
            joinedAt: m.joinedAt,
            leftAt: m.leftAt // Important for ex-members
        };
    });

    return {
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt,
        stats: team.stats, // avgRating, totalProjects
        services: team.services?.filter(s => s.active) || [],
        members: membersPublic,
        nameHistory: team.nameHistory || [],
        metrics: {
            rotationRate: `${rotationRate}%`,
            totalRefusedInvites: 0, // Placeholder if we tracked this
            avgDeliveryTime: "N/A" // Placeholder
        }
    };
};

export default {
    validateCreateTeam,
    createTeam,
    activateCoopProject,
    calculateFrozenDistribution,
    canPerformAction,
    processMemberExit,
    monitorInactivity,
    addMember,
    updateMemberRole,
    dissolveTeam,
    toggleTeamService,
    addTeamService,
    completeProject,
    updateTeamRules,
    submitMemberReview,
    updateTeamInfo,
    submitMemberReview,
    updateTeamInfo,
    getPublicTeamProfile,
    acceptTeamRules
};
