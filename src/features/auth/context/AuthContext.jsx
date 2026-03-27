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

        // Map snake_case from DB to camelCase for frontend
        const mapped = {
            ...data,
            firstName: data.first_name,
            lastName: data.last_name,
            avatarUrl: data.avatar_url,
            companyName: data.company_name,
            responsibleName: data.responsible_name,
            workHours: data.work_hours,
            paymentMethods: data.payment_methods,
            cvUrl: data.cv_url,
            xp: data.points // Gamification uses xp/points interchangeably in some places
        };

        // Apply gamification rules
        const processed = processGamificationRules(mapped);
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

        // Map frontend camelCase to database snake_case strictly
        const profileUpdate = {
            username: processed.username?.toLowerCase(),
            first_name: processed.firstName !== undefined ? processed.firstName : processed.first_name,
            last_name: processed.lastName !== undefined ? processed.lastName : processed.last_name,
            avatar_url: processed.avatarUrl !== undefined ? processed.avatarUrl : processed.avatar_url,
            bio: processed.bio,
            gender: processed.gender,
            company_name: processed.companyName !== undefined ? processed.companyName : processed.company_name,
            responsible_name: processed.responsibleName !== undefined ? processed.responsibleName : processed.responsible_name,
            location: processed.location,
            country: processed.country,
            work_hours: processed.workHours !== undefined ? processed.workHours : processed.work_hours,
            payment_methods: processed.paymentMethods !== undefined ? processed.paymentMethods : processed.payment_methods,
            vacancies: parseInt(processed.vacancies) || 0,
            cv_url: processed.cvUrl !== undefined ? processed.cvUrl : processed.cv_url,
            level: processed.level,
            points: processed.points
        };

        // Remove undefined fields
        Object.keys(profileUpdate).forEach(key => profileUpdate[key] === undefined && delete profileUpdate[key]);

        const { error } = await supabase
            .from('profiles')
            .update(profileUpdate)
            .eq('id', user.id);

        if (error) {
            console.error('Error updating profile:', error);
            throw error;
        }

        // Fetch latest profile from DB to ensure state consistency
        await fetchProfile(user.id);
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
