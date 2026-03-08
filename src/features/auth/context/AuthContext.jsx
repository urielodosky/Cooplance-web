import React, { createContext, useContext, useState, useEffect } from 'react';
import { processGamificationRules } from '../../../utils/gamification';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const savedUser = localStorage.getItem('cooplance_user');
            if (savedUser) {
                let parsedUser = JSON.parse(savedUser);
                // Run gamification rules on load
                parsedUser = processGamificationRules(parsedUser);
                return parsedUser;
            }
            return null;
        } catch (error) {
            console.error("Error parsing user from localStorage:", error);
            localStorage.removeItem('cooplance_user');
            return null;
        }
    });

    useEffect(() => {
        console.log("AuthContext User State:", user);
    }, [user]);

    // Database Integrity Check: Fix duplicate IDs & Resync Session
    useEffect(() => {
        try {
            const rawUsers = localStorage.getItem('cooplance_db_users');
            if (!rawUsers) return;

            const storedUsers = JSON.parse(rawUsers);
            const seenIds = new Set();
            let hasChanges = false;
            let idMap = {}; // Map oldId -> newId if changed

            const fixedUsers = storedUsers.map(u => {
                // Ensure ID exists
                if (!u.id) {
                    u.id = Date.now() + Math.floor(Math.random() * 10000);
                    hasChanges = true;
                    return u;
                }

                // Check for duplicates
                if (seenIds.has(u.id)) {
                    console.warn(`Duplicate ID found: ${u.id}. Regenerating for user ${u.username}`);
                    const newId = Date.now() + Math.floor(Math.random() * 10000); // New unique ID
                    idMap[u.username] = newId; // Track basic mapping
                    u.id = newId;
                    hasChanges = true;
                }
                seenIds.add(u.id);
                return u;
            });

            if (hasChanges) {
                console.log("Database integrity repair: Fixed duplicate/missing IDs.");
                localStorage.setItem('cooplance_db_users', JSON.stringify(fixedUsers));
            }

            // Session Resync: Ensure current user has the correct ID from DB
            const savedSession = localStorage.getItem('cooplance_user');
            if (savedSession) {
                const currentSessionUser = JSON.parse(savedSession);
                // Find this user in the fixed DB by unique traits (username/email)
                // We avoid ID here because ID might be the problem
                const matchInDb = fixedUsers.find(u =>
                    (u.username && u.username.toLowerCase() === currentSessionUser.username?.toLowerCase()) ||
                    (u.email && u.email.toLowerCase() === currentSessionUser.email?.toLowerCase())
                );

                if (matchInDb && matchInDb.id != currentSessionUser.id) {
                    console.log(`Resyncing session ID for ${matchInDb.username}: ${currentSessionUser.id} -> ${matchInDb.id}`);
                    const updatedSession = { ...currentSessionUser, ...matchInDb }; // Merge to keep DB truth
                    setUser(updatedSession);
                    localStorage.setItem('cooplance_user', JSON.stringify(updatedSession));
                }
            }
        } catch (e) {
            console.error("Error executing DB integrity check:", e);
        }
    }, []);

    const login = (userData) => {
        // Initialize stats if new
        let processedUser = processGamificationRules(userData);
        setUser(processedUser);
        localStorage.setItem('cooplance_user', JSON.stringify(processedUser));
    };

    const register = (role, data) => {
        const newUser = {
            ...data,
            role,
            id: Date.now(),
            xp: 0,
            level: 1,
            level: 1,
            balance: 1000, // Initial Mock Balance
            gamification: {
                lastDecayCheck: Date.now(),
                lastActivity: Date.now(),
                vacation: {
                    active: false,
                    startDate: null,
                    credits: 2,
                    lastReset: Date.now()
                }
            }
        };
        setUser(newUser);
        localStorage.setItem('cooplance_user', JSON.stringify(newUser));

        const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
        storedUsers.push(newUser);
        localStorage.setItem('cooplance_db_users', JSON.stringify(storedUsers));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('cooplance_user');
    };

    const updateUser = (updatedData) => {
        // Ensure gamification structure exists
        let processed = processGamificationRules(updatedData);
        setUser(processed);
        localStorage.setItem('cooplance_user', JSON.stringify(processed));

        const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
        // Use loose equality to handle possible string vs number ID mismatch
        const userIndex = storedUsers.findIndex(u => u.id == processed.id);

        if (userIndex !== -1) {
            storedUsers[userIndex] = processed;
        } else {
            // If user not found in DB (desync), add them now
            storedUsers.push(processed);
        }
        localStorage.setItem('cooplance_db_users', JSON.stringify(storedUsers));
    };

    const updateBalance = (amount, type = 'credit') => {
        if (!user) return;

        let newBalance = parseFloat(user.balance || 0);
        if (type === 'credit') {
            newBalance += parseFloat(amount);
        } else if (type === 'debit') {
            newBalance -= parseFloat(amount);
        }

        const updatedUser = { ...user, balance: newBalance };
        updateUser(updatedUser);
        return newBalance;
    };

    const checkUserExists = ({ username, email, phone }, excludeUserId = null) => {
        const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');

        for (const u of storedUsers) {
            // Use loose equality for ID check
            if (excludeUserId && u.id == excludeUserId) continue;

            if (username && u.username?.trim().toLowerCase() === username.toLowerCase()) {
                return { exists: true, field: 'username' };
            }
            if (email && u.email?.toLowerCase() === email.toLowerCase()) {
                return { exists: true, field: 'email' };
            }
            if (phone && u.phone === phone) {
                return { exists: true, field: 'phone' };
            }
        }
        return { exists: false, field: null };
    };

    const deleteAccount = (userId) => {
        // 1. Soft-delete user
        const storedUsers = JSON.parse(localStorage.getItem('cooplance_db_users') || '[]');
        const updatedUsers = storedUsers.map(u => {
            if (u.id.toString() === userId.toString()) {
                return { ...u, isDeleted: true };
            }
            return u;
        });
        localStorage.setItem('cooplance_db_users', JSON.stringify(updatedUsers));

        // 2. Hard-delete their services
        const storedServices = JSON.parse(localStorage.getItem('cooplance_db_services') || '[]');
        const filteredServices = storedServices.filter(s => s.freelancerId?.toString() !== userId.toString());
        localStorage.setItem('cooplance_db_services', JSON.stringify(filteredServices));

        // 3. Hard-delete their projects (pedidos)
        const storedProjects = JSON.parse(localStorage.getItem('cooplance_db_projects') || '[]');
        const filteredProjects = storedProjects.filter(p => p.clientId?.toString() !== userId.toString());
        localStorage.setItem('cooplance_db_projects', JSON.stringify(filteredProjects));

        // 4. Logout if it's the current user
        if (user && user.id.toString() === userId.toString()) {
            logout();
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateUser, updateBalance, checkUserExists, deleteAccount }}>
            {children}
        </AuthContext.Provider>
    );
};
