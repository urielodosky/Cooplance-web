import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { processGamificationRules } from '../../../utils/gamification';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // ─── Bootstrap: Listen to Supabase auth state changes ───────────────────────
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Subscribe to changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                fetchProfile(session.user.id);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // ─── Fetch user profile from the public.profiles table ──────────────────────
    const fetchProfile = async (userId) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            setLoading(false);
            return;
        }

        // Apply gamification rules to the fetched profile
        const processed = processGamificationRules(data);
        setUser(processed);
        setLoading(false);
    };

    // ─── REGISTER ───────────────────────────────────────────────────────────────
    const register = async (role, data) => {
        const { email, password, username, firstName, lastName, phone } = data;

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    first_name: firstName,
                    last_name: lastName,
                    role,
                }
            }
        });

        if (authError) throw authError;

        // Profile is auto-created by database trigger (handle_new_user)
        return authData;
    };

    // ─── LOGIN ──────────────────────────────────────────────────────────────────
    const login = async ({ email, password }) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    // ─── LOGOUT ─────────────────────────────────────────────────────────────────
    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    // ─── UPDATE USER PROFILE ─────────────────────────────────────────────────────
    const updateUser = async (updatedData) => {
        if (!user) return;

        const processed = processGamificationRules(updatedData);

        const { error } = await supabase
            .from('profiles')
            .update({
                first_name: processed.firstName || processed.first_name,
                last_name: processed.lastName || processed.last_name,
                avatar_url: processed.avatar_url || processed.avatarUrl,
                bio: processed.bio,
                level: processed.level,
                points: processed.points || processed.xp || 0,
            })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating profile:', error);
            throw error;
        }

        // Refresh local state
        setUser(processed);
    };

    // ─── UPDATE BALANCE (local only for now, until wallet table is added) ────────
    const updateBalance = (amount, type = 'credit') => {
        if (!user) return;
        let newBalance = parseFloat(user.balance || 0);
        newBalance = type === 'credit' ? newBalance + parseFloat(amount) : newBalance - parseFloat(amount);
        const updatedUser = { ...user, balance: newBalance };
        setUser(updatedUser);
        return newBalance;
    };

    // ─── CHECK IF USER EXISTS ────────────────────────────────────────────────────
    const checkUserExists = async ({ username, email }) => {
        if (username) {
            const { data } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
            if (data) return { exists: true, field: 'username' };
        }
        if (email) {
            const { data } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
            if (data) return { exists: true, field: 'email' };
        }
        return { exists: false, field: null };
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, updateBalance, checkUserExists }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
