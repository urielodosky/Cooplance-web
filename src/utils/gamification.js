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
        baseXP = amount >= 100 ? 80 : 40;
    } else {
        if (amount >= 100) baseXP = 80;
        else if (amount >= 50) baseXP = 40;
        else if (amount >= 20) baseXP = 30;
        else if (amount >= 5) baseXP = 10;
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
// (Simplified: We usually just track current XP relative to next level or total accumulated?)
// The strict interpretation of "5% del total de exp necesaria para alcanzar el nivel" likely means
// if Level 7 needs 5000 XP (from lvl 6 to 7), the penalty is 5% of 5000 = 250 XP.
const getLevelSeekXP = (level) => {
    // If we are Level 6, we are seeking Level 7 (unless max).
    // If we are Level 10, we are maintaining Level 10.
    if (level >= MAX_LEVEL) return XP_TABLE[9];
    return XP_TABLE[level] || 10000;
};

export const processGamificationRules = (user) => {
    if (!user) return user;

    // Create copy to modify
    let updatedUser = { ...user };
    const now = Date.now();
    let hasChanges = false;

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

    const g = updatedUser.gamification;

    // 1. Vacation Logic (Reset credits yearly)
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (now - g.vacation.lastReset > oneYear) {
        g.vacation.credits = 4;
        g.vacation.lastReset = now;
        hasChanges = true;
    }

    // 2. Check Vacation Expiry (15 days duration)
    const fifteenDaysDuration = 15 * 24 * 60 * 60 * 1000;
    if (g.vacation.active) {
        if (now - g.vacation.startDate > fifteenDaysDuration) {
            g.vacation.active = false;
            g.vacation.startDate = null;
            hasChanges = true;
            // "Vacation over" notification could be handled here via a flag if needed
        } else {
            // If on vacation, SKIP decay and inactivity checks
            if (hasChanges) return updatedUser;
            return user; // No changes if just waiting
        }
    }

    // 3. XP Decay (Level 6+) - Every 15 days
    if (updatedUser.level >= 6) {
        const fifteenDays = 15 * 24 * 60 * 60 * 1000;
        const timeSinceDecay = now - g.lastDecayCheck;

        if (timeSinceDecay >= fifteenDays) {
            // How many 15-day periods passed? (Ideally run once, but handle missed periods?)
            // Let's just run once per login for simplicity, or loop if multiple periods.
            // Requirement: "cada 15 dias se pierde el 5%"

            const periods = Math.floor(timeSinceDecay / fifteenDays);
            if (periods > 0) {
                // Calculate penalty basis
                // "del total de exp necesaria para alcanzar el nivel"
                // If I am Level 6, I achieved Level 6 by getting 2000xp (stats for lvl 5->6).
                // OR likely means the XP required to complete the CURRENT level (seeking Level 7).
                // Let's assume it's based on the XP requirement of the CURRENT level table entry.
                const xpReq = getLevelSeekXP(updatedUser.level);
                const penaltyPerPeriod = Math.floor(xpReq * 0.05);
                const totalPenalty = penaltyPerPeriod * periods;

                // Ensure XP doesn't go below 0
                updatedUser.xp = Math.max(0, (updatedUser.xp || 0) - totalPenalty);
                updatedUser.points = updatedUser.xp;

                // Recalculate level based on new XP (Level drops if XP falls below threshold)
                const properLevel = getLevelFromXP(updatedUser.xp);
                if (properLevel < updatedUser.level) {
                    updatedUser.level = properLevel;
                }

                // Update check time
                g.lastDecayCheck = now;
                hasChanges = true;
            }
        }
    }

    // 4. Inactivity Penalty (2 months) -> Drop Level (down to 5)
    // "si hay inactividad ... se reste un nivel cada 2 meses hasta el nivel 5"
    if (updatedUser.level > 5) {
        const twoMonths = 60 * 24 * 60 * 60 * 1000;
        const timeSinceActivity = now - g.lastActivity;

        if (timeSinceActivity >= twoMonths) {
            // Drop Level logic
            // Should we check if we already penalized for this period? 
            // We reset lastActivity after penalizing? Or track "lastInactivityPenalty"?
            // To prevent instant double-drop, we can update lastActivity to "now" (simulating a 'reset' of the timer)
            // or better: track `lastInactivityPenalty`.

            if (!g.lastInactivityPenalty || (now - g.lastInactivityPenalty >= twoMonths)) {
                const oldLevel = updatedUser.level;
                updatedUser.level = Math.max(5, oldLevel - 1);

                // Sync XP to the minimum required for the new lower level
                // (e.g., if dropping to level 5, set XP to level 4's requirement which is the start of level 5)
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
    const g = user.gamification || {};

    if (g.vacation && g.vacation.active) return user; // Already active
    if (!g.vacation || g.vacation.credits <= 0) {
        // No credits
        return user;
    }

    return {
        ...user,
        gamification: {
            ...g,
            vacation: {
                ...g.vacation,
                active: true,
                startDate: Date.now(),
                credits: g.vacation.credits - 1
            }
        }
    };
};
