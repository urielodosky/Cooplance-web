import React, { createContext, useContext, useState, useEffect } from 'react';
import { processGamificationRules } from '../../../utils/gamification';
import { supabase } from '../../../lib/supabase';
import InitialLoader from '../../../components/common/InitialLoader';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // ─── Bootstrap: Load from Supabase ─────────────────────────────────────
    useEffect(() => {
        let isMounted = true;

        const handleSession = async (session) => {
            if (!isMounted) return;
            
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setUser(null);
                setLoading(false);
            }
        };

        // Initialize state via getSession AND subscribe to future changes safely
        const initializeAuth = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) console.error("getSession error:", error);
            
            await handleSession(session);
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log("Auth state changed:", _event);
            if (_event === 'INITIAL_SESSION') return; // We handled it in getSession
            await handleSession(session);
        });

        // SAFETY FALLBACK: If Supabase initialization hangs entirely, force load
        const fallbackTimer = setTimeout(() => {
            if (isMounted) {
                console.warn("AuthContext initialization timed out (3s). Forcing UI to load.");
                setLoading(false);
            }
        }, 3000);

        return () => {
            isMounted = false;
            clearTimeout(fallbackTimer);
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (error) throw error;
            setUser(data);
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    // Utility for safely timing out hanging Supabase requests
    const withTimeout = (promise, ms, operationName) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout: La operación "${operationName}" excedió el tiempo límite. Intenta recargar la página.`)), ms))
        ]);
    };

    // ─── REGISTER (Final step after verification) ───────────────────────────────
    const register = async (role, registrationData) => {
        const { email, password, username, first_name, last_name, gender, company_name, responsible_name, location, country, work_hours, payment_methods, vacancies } = registrationData;

        // Ensure metadata is passed for the SQL trigger handle_new_user()
        const { data, error } = await withTimeout(supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role,
                    username,
                    first_name: first_name || '',
                    last_name: last_name || '',
                    gender,
                    company_name: company_name || null,
                    responsible_name: responsible_name || null,
                    location: location || null,
                    country: country || null,
                    work_hours: work_hours || null,
                    payment_methods: payment_methods || null,
                    vacancies: vacancies ? parseInt(vacancies) : 0
                }
            }
        }), 10000, "Registro");

        if (error) {
            throw new Error(error.message);
        }
        
        // DON'T call fetchProfile here - onAuthStateChange handles it.
        return data.user;
    };

    // ─── LOGIN ──────────────────────────────────────────────────────────────────
    const login = async ({ email, password }) => {
        const { data, error } = await withTimeout(supabase.auth.signInWithPassword({
            email,
            password
        }), 10000, "Iniciar sesión");
        
        if (error) {
            throw new Error(error.message);
        }
        
        // DON'T call fetchProfile here - onAuthStateChange handles it.
        // Calling it here causes a localStorage lock collision with gotrue-js.
        return data.user;
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
        
        // Remove unwanted fields from update (like id, createdAt which shouldn't change)
        const { id, auth_id, created_at, email, ...updatePayload } = processed;
        
        const { error } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', user.id);

        if (error) {
            console.error('Error updating profile:', error);
            throw error;
        }

        // Refetch profile to get newest data
        await fetchProfile(user.id);
    };

    // ─── UPDATE BALANCE ──────────────────────────────────────────────────────────
    const updateBalance = async (amount, type = 'credit') => {
        if (!user) return;
        let newBalance = parseFloat(user.points || user.balance || 0); // Assuming we use points as balance as per schema
        newBalance = type === 'credit' ? newBalance + parseFloat(amount) : newBalance - parseFloat(amount);
        
        try {
            await updateUser({ ...user, points: newBalance });
            return newBalance;
        } catch (err) {
            console.error('Balance update error:', err);
        }
    };

    // ─── DELETE ACCOUNT ──────────────────────────────────────────────────────────
    const deleteAccount = async () => {
        if (!user) return;
        
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id);

        if (error) {
            console.error('Error deleting account:', error);
        } else {
            // After deleting profile, log them out.
            logout();
        }
    };

    // ─── CHECK IF USER EXISTS ────────────────────────────────────────────────────
    const checkUserExists = async ({ username, email }, excludeId = null) => {
        if (username) {
            let query = supabase.from('profiles').select('id').ilike('username', username);
            if (excludeId) query = query.neq('id', excludeId);
            const { data } = await query;
            if (data && data.length > 0) return { exists: true, field: 'username' };
        }
        
        if (email) {
            let query = supabase.from('profiles').select('id').ilike('email', email);
            if (excludeId) query = query.neq('id', excludeId);
            const { data } = await query;
            if (data && data.length > 0) return { exists: true, field: 'email' };
        }

        return { exists: false, field: null };
    };

    console.log("AuthContext Render! loading:", loading, "user:", user ? user.id : 'null');

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, updateBalance, checkUserExists, deleteAccount }}>
            {loading ? <InitialLoader /> : children}
        </AuthContext.Provider>
    );
};
