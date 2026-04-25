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
        if (amount >= 100000) baseXP = 80;
        else if (amount > 5000) baseXP = 40;
        else baseXP = 0;
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

    // COMPATIBILITY V39: Migration of legacy 'vacation' to 'pause_mode'
    if (g.vacation) {
        if (!g.pause_mode) {
            g.pause_mode = { 
                active: g.vacation.active || false,
                startDate: g.vacation.startDate || null
            };
        }
        delete g.vacation;
        hasChanges = true;
    }

    // Ensure pause_mode exists as an object with default properties if completely missing
    if (typeof g.pause_mode !== 'object' || g.pause_mode === null) {
        g.pause_mode = {
            active: false,
            startDate: null
        };
        hasChanges = true;
    }


    // 2. Pause Mode Activity
    if (g.pause_mode?.active) {
        // While in pause mode, we just return to avoid any automatic rules
        // In V34+, we don't expire it automatically after 15 days anymore.
        if (hasChanges) return updatedUser;
        return user;
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
    
    // Explicitly destructure to remove legacy vacation fields if they exist
    const { vacation, ...cleanGamification } = user.gamification || {};
    const pauseMode = cleanGamification.pause_mode || {};
    
    if (pauseMode.active) return user;
    
    return {
        ...user,
        gamification: {
            ...cleanGamification,
            pause_mode: {
                active: true,
                activated_at: new Date().toISOString()
            }
        }
    };
};

export const deactivatePauseMode = (user) => {
    if (!user) return user;
    
    const { vacation, ...cleanGamification } = user.gamification || {};
    const pauseMode = cleanGamification.pause_mode || {};
    
    if (!pauseMode.active) return user;

    return {
        ...user,
        gamification: {
            ...cleanGamification,
            pause_mode: {
                active: false,
                activated_at: null
            }
        }
    };
};
