export const MAX_LEVEL = 10;
export const XP_TABLE = {
    1: 80,
    2: 300,
    3: 500,
    4: 1000,
    5: 2000,
    6: 3000,
    7: 5000,
    8: 7000,
    9: 10000, // To reach level 10
};

export const MAX_BUFFER_XP = 5000;

export const calculateNextLevelXP = (currentLevel) => {
    if (currentLevel >= MAX_LEVEL) return XP_TABLE[9]; // Base requirement for lvl 10
    return XP_TABLE[currentLevel] || 10000;
};

export const getLevelFromXP = (xp) => {
    if (xp >= XP_TABLE[9]) return 10;
    if (xp >= XP_TABLE[8]) return 9;
    if (xp >= XP_TABLE[7]) return 8;
    if (xp >= XP_TABLE[6]) return 7;
    if (xp >= XP_TABLE[5]) return 6;
    if (xp >= XP_TABLE[4]) return 5;
    if (xp >= XP_TABLE[3]) return 4;
    if (xp >= XP_TABLE[2]) return 3;
    if (xp >= XP_TABLE[1]) return 2;
    return 1;
};

export const calculateCommission = (level) => {
    if (level >= 10) return 6;
    if (level === 9) return 8;
    if (level === 8) return 9;
    if (level === 7) return 10;
    if (level === 6) return 11;
    return 12;
};

export const calculateXPForJob = (amount, userLevel = 1, receiverRole = 'freelancer', freelancerLevel = null) => {
    let baseXP = 0;

    // Base Calculation (Standard for Freelancers)
    if (userLevel === 1) {
        baseXP = amount >= 100000 ? 80 : 40;
    } else {
        if (amount >= 100000) baseXP = 80;
        else if (amount >= 45000) baseXP = 40;
        else if (amount >= 15000) baseXP = 30;
        else if (amount >= 5000) baseXP = 10;
        else baseXP = 0;
    }

    // Client/Company Multipliers
    if (receiverRole === 'buyer' || receiverRole === 'company') {
        let multiplier = 2; // "Siempre reciben el doble"

        // "Si contratan gente nueva de nivel 1 o 2 reciben el doble del doble" (4x total)
        if (freelancerLevel !== null && freelancerLevel <= 2) {
            multiplier = 4;
        }

        return baseXP * multiplier;
    }

    return baseXP;
};

// --- NEW ADVANCED LOGIC ---

// Helper to get total XP needed to REACH a specific level from scratch
const getLevelSeekXP = (level) => {
    if (level >= MAX_LEVEL) return XP_TABLE[9];
    return XP_TABLE[level] || 10000;
};

export const processGamificationRules = (user) => {
    if (!user) return user;

    // Create copy to modify
    let updatedUser = { ...user };
    const now = Date.now();
    let hasChanges = false;

    // 0. Automatic Level-Up (V3)
    // Ensures level is always synced with total XP
    const currentXP = updatedUser.xp || 0;
    const currentLvl = updatedUser.level || 1;
    const properLvl = getLevelFromXP(currentXP);
    if (properLvl > currentLvl) {
        updatedUser.level = properLvl;
        hasChanges = true;
        console.log(`[Gamification] Auto-Level Up: @${updatedUser.username} ${currentLvl} -> ${properLvl}`);
    }

    // 0. Initialize missing fields
    if (!updatedUser.gamification) {
        updatedUser.gamification = {
            lastDecayCheck: now,
            lastActivity: now,
            vacation: {
                active: false,
                startDate: null,
                credits: 4, // 4 per year
                lastReset: now
            }
        };
        hasChanges = true;
    }

    // 1. Vacation Logic (Reset credits yearly)
    const g = updatedUser.gamification;
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    // 1. Vacation Reset (Annual Policy V3) - ONLY if vacation exists
    if (g.vacation?.lastReset && now - g.vacation.lastReset > oneYear) {
        g.vacation.credits = 4;
        g.vacation.lastReset = now;
        g.vacation.policyV3 = true; // Mark as reset under the new policy
        hasChanges = true;
    }

    // LEGACY SYNC: If user has more than 4 credits (due to previous migration bugs), cap at 4.
    if (!g.vacation.policyV3 || g.vacation.credits > 4) {
        if (g.vacation.credits > 4) {
            g.vacation.credits = 4;
            hasChanges = true;
        }
        g.vacation.policyV3 = true;
        hasChanges = true;
    }

    // 2. Check Vacation Expiry (15 days duration)
    const fifteenDaysDuration = 15 * 24 * 60 * 60 * 1000;
    if (g.vacation.active) {
        if (now - new Date(g.vacation.startDate).getTime() > fifteenDaysDuration) {
            g.vacation.active = false;
            g.vacation.startDate = null;
            hasChanges = true;
        } else {
            // If on vacation, SKIP decay and inactivity checks
            if (hasChanges) return updatedUser;
            return user;
        }
    }

    // 3. XP Decay (Level 6+) - Every 15 days
    if (updatedUser.level >= 6) {
        const fifteenDays = 15 * 24 * 60 * 60 * 1000;
        const timeSinceDecay = now - g.lastDecayCheck;

        if (timeSinceDecay >= fifteenDays) {
            const periods = Math.floor(timeSinceDecay / fifteenDays);
            if (periods > 0) {
                const xpReq = getLevelSeekXP(updatedUser.level);
                const penaltyPerPeriod = Math.floor(xpReq * 0.05);
                const totalPenalty = penaltyPerPeriod * periods;

                updatedUser.xp = Math.max(0, (updatedUser.xp || 0) - totalPenalty);
                updatedUser.points = updatedUser.xp;

                const properLevel = getLevelFromXP(updatedUser.xp);
                if (properLevel < updatedUser.level) {
                    updatedUser.level = properLevel;
                }

                g.lastDecayCheck = now;
                hasChanges = true;
            }
        }
    }

    // 4. Inactivity Penalty (2 months) -> Drop Level (down to 5)
    if (updatedUser.level > 5) {
        const oneMonth = 30 * 24 * 60 * 60 * 1000;
        if (!g.vacation?.active && now - (user.last_activity || now) > oneMonth) {
            if (!g.lastInactivityPenalty || (now - g.lastInactivityPenalty >= oneMonth)) {
                const oldLevel = updatedUser.level;
                updatedUser.level = Math.max(5, oldLevel - 1);
                const startOfNewLevelXP = updatedUser.level > 1 ? XP_TABLE[updatedUser.level - 1] : 0;
                updatedUser.xp = startOfNewLevelXP;

                g.lastInactivityPenalty = now;
                hasChanges = true;
            }
        }
    }

    if (hasChanges) return updatedUser;
    return user;
};

export const registerActivity = (user) => {
    if (!user) return user;
    const now = Date.now();
    return {
        ...user,
        gamification: {
            ...user.gamification,
            lastActivity: now
        }
    };
};

export const activateVacation = (user) => {
    if (!user) return user;
    const g = user.gamification || { vacation: { active: false, credits: 4, lastReset: Date.now() } };

    if (g.vacation && g.vacation.active) return user;
    if (!g.vacation) g.vacation = { active: false, credits: 4, lastReset: Date.now() };
    if ((g.vacation.credits || 0) <= 0) return user;

    return {
        ...user,
        gamification: {
            ...g,
            vacation: {
                ...g.vacation,
                active: true,
                startDate: new Date().toISOString(),
                credits: (g.vacation.credits || 0) - 1
            }
        }
    };
};
