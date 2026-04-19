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
    const currentXP = updatedUser.xp || 0;
    const currentLvl = updatedUser.level || 1;
    const properLvl = getLevelFromXP(currentXP);
    if (properLvl > currentLvl) {
        updatedUser.level = properLvl;
        hasChanges = true;
    }

    // 0. Initialize missing fields
    if (!updatedUser.gamification) {
        updatedUser.gamification = { lastActivity: now };
    }

    const g = updatedUser.gamification;

    // COMPATIBILITY V34: Migration of legacy 'vacation' to 'pause_mode'
    if (g.vacation && !g.pause_mode) {
        g.pause_mode = { ...g.vacation };
        delete g.vacation;
        hasChanges = true;
    }

    // Ensure pause_mode exists as an object with default properties if completely missing
    if (typeof g.pause_mode !== 'object' || g.pause_mode === null) {
        g.pause_mode = {
            active: false,
            startDate: null,
            credits: 4,
            lastReset: now
        };
        hasChanges = true;
    }

    // 1. Pause Mode Reset (Annual Policy V3)
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    const lastResetTime = g.pause_mode?.lastReset || 0;
    if (lastResetTime && now - lastResetTime > oneYear) {
        g.pause_mode.credits = 4;
        g.pause_mode.lastReset = now;
        g.pause_mode.policyV3 = true;
        hasChanges = true;
    }

    // 2. Check Pause Mode Expiry (15 days duration)
    const fifteenDaysDuration = 15 * 24 * 60 * 60 * 1000;
    if (g.pause_mode?.active && g.pause_mode?.startDate) {
        if (now - new Date(g.pause_mode.startDate).getTime() > fifteenDaysDuration) {
            g.pause_mode.active = false;
            g.pause_mode.startDate = null;
            hasChanges = true;
        } else {
            // While in pause mode, we just return to avoid XP decay or other rules
            if (hasChanges) return updatedUser;
            return user;
        }
    }

    // --- V34 LEGAL COMPLIANCE: AUTOMATED PENALTIES REMOVED ---
    // Inactivity and Decay checks are now handled via commercial penalties only.

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

export const activatePauseMode = (user) => {
    if (!user) return user;
    const g = user.gamification || { pause_mode: { active: false, credits: 4, lastReset: Date.now() } };

    // Migration check inside activator
    if (g.vacation && !g.pause_mode) {
        g.pause_mode = { ...g.vacation };
        delete g.vacation;
    }

    if (g.pause_mode && g.pause_mode.active) return user;
    
    // Ensure structure
    if (!g.pause_mode) {
        g.pause_mode = { active: false, credits: 4, lastReset: Date.now() };
    }

    if ((g.pause_mode?.credits || 0) <= 0) return user;

    return {
        ...user,
        gamification: {
            ...g,
            pause_mode: {
                ...g.pause_mode,
                active: true,
                startDate: new Date().toISOString(),
                credits: (g.pause_mode.credits || 0) - 1
            }
        }
    };
};
