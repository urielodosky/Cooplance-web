import React, { createContext, useContext, useState, useEffect } from 'react';
import { processGamificationRules } from '../../../utils/gamification';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import InitialLoader from '../../../components/common/InitialLoader';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    const handleSession = async (session) => {
        console.log("[AuthContext] Handling session:", session?.user ? "User detected" : "No user");
        if (session?.user) {
            // Seamos más permisivos: si hay usuario, intentamos cargar perfil.
            // La confirmación de email ya la gestiona Supabase en el login.
            await fetchProfile(session.user.id, session.user);
        } else {
            setUser(null);
            setLoading(false);
        }
    };

    // ─── Bootstrap ─────────────────────────────────────────────────────────
    useEffect(() => {
        let isMounted = true;
        let isInitComplete = false;

        const initializeAuth = async () => {
            console.log("[AuthContext] Initializing...");
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error("[AuthContext] getSession error:", error);
                    if (isMounted) setLoading(false);
                    return;
                }
                if (isMounted) await handleSession(session);
            } catch (err) {
                console.error("[AuthContext] Critical init error:", err);
                if (isMounted) setLoading(false);
            } finally {
                isInitComplete = true;
                if (isMounted) setIsInitialized(true);
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log("[AuthContext] Auth event:", _event);
            if (_event === 'INITIAL_SESSION') return;
            
            if (isMounted) await handleSession(session);
        });

        // Watchdog: force UI load if init hangs
        const fallback = setTimeout(() => {
            if (isMounted && !isInitComplete) {
                console.warn("[AuthContext] Watchdog timeout (10s). Forcing UI.");
                setLoading(false);
                setIsInitialized(true);
            }
        }, 10000);

        return () => {
            isMounted = false;
            clearTimeout(fallback);
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    // ─── FETCH PROFILE ──────────────────────────────────────────────────────
    const fetchProfile = async (userId, authUser = null) => {
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            try {
                const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
                
                if (data) {
                    setUser(data);
                    setLoading(false);
                    return;
                }
                
                // If not found, it might be the trigger lagging
                console.log(`[AuthContext] Profile not found (attempt ${attempts + 1})...`);
                await new Promise(r => setTimeout(r, 1500));
            } catch (err) {
                console.error(`[AuthContext] fetchProfile attempt ${attempts + 1} failed:`, err);
            }
            attempts++;
        }

        console.warn("[AuthContext] Could not reach profile row. Using auth fallback.");
        if (authUser) {
            setUser({
                id: authUser.id,
                email: authUser.email,
                username: authUser.raw_user_meta_data?.username || authUser.email.split('@')[0],
                role: authUser.raw_user_meta_data?.role || 'freelancer',
                is_partial: true
            });
        }
        setLoading(false);
    };

    // ─── TIMEOUT UTILITY ────────────────────────────────────────────────────
    const withTimeout = (promise, ms, opName) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout: "${opName}" excedió el tiempo límite.`)), ms))
        ]);
    };

    // ─── REGISTER ───────────────────────────────────────────────────────────
    // With Supabase native OTP: signUp creates the user but Supabase will NOT
    // create a session until the email is confirmed via verifyOtp.
    const register = async (role, registrationData) => {
        // Map frontend camelCase to backend snake_case
        const payload = {
            role: role,
            username: (registrationData.username || registrationData.email?.split('@')[0])?.toLowerCase(),
            first_name: registrationData.firstName || registrationData.first_name || '',
            last_name: registrationData.lastName || registrationData.last_name || '',
            gender: registrationData.gender || 'male',
            company_name: registrationData.companyName || registrationData.company_name || null,
            responsible_name: registrationData.responsibleName || registrationData.responsible_name || null,
            location: registrationData.location || null,
            country: registrationData.country || 'Argentina',
            work_hours: registrationData.workHours || registrationData.work_hours || null,
            payment_methods: registrationData.paymentMethods || registrationData.payment_methods || null,
            vacancies: registrationData.vacancies ? parseInt(registrationData.vacancies) : 0,
            dni: registrationData.dni || null,
            dob: registrationData.dob || registrationData.birthDate || null,
            phone: registrationData.phone || null,
            terms_accepted: registrationData.termsAccepted || registrationData.terms_accepted || false,
        };

        const { data, error } = await withTimeout(supabase.auth.signUp({
            email: registrationData.email,
            password: registrationData.password,
            options: { data: payload }
        }), 15000, "Registro");

        if (error) throw new Error(error.message);
        return data.user;
    };

    // ─── VERIFY OTP (Supabase native) ───────────────────────────────────────
    // This confirms the email, creates a session, and triggers profile creation
    const verifyOtp = async (email, token) => {
        console.log("[AuthContext] Verifying OTP via Supabase...");
        
        const { data, error } = await withTimeout(
            supabase.auth.verifyOtp({ email, token, type: 'signup' }),
            45000,
            "Verificar OTP"
        );

        if (error) throw new Error(error.message);

        console.log("[AuthContext] OTP verified successfully. Session created.");

        // Give the DB trigger a moment to create the profile
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Fetch the newly created profile
        if (data.user) {
            await fetchProfile(data.user.id);
        }

        return data.user;
    };

    // ─── RESEND OTP ─────────────────────────────────────────────────────────
    const resendOtp = async (email) => {
        const { error } = await withTimeout(
            supabase.auth.resend({ type: 'signup', email }),
            10000,
            "Reenviar OTP"
        );
        if (error) throw new Error(error.message);
    };

    // ─── LOGIN (Step 1: validate credentials, then send OTP) ──────────────
    const login = async ({ email, password }) => {
        try {
            // A. Create a ghost/technical client that doesn't persist sessions
            //    or trigger global app listeners.
            const technicalSupabase = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false,
                        // Use an isolated dummy storage to prevent localStorage leakage
                        storage: {
                            getItem: () => null,
                            setItem: () => {},
                            removeItem: () => {}
                        }
                    }
                }
            );

            // 1. Validate credentials silenty (Ghost Connection)
            const { data, error } = await technicalSupabase.auth.signInWithPassword({ email, password });
            
            if (error) {
                console.error("[AuthContext] Ghost Credential Error:", error);
                throw new Error(error.message);
            }
            
            const isConfirmed = !!data.user?.email_confirmed_at;
            console.log(`[AuthContext] Credentials OK. User confirmed: ${isConfirmed}. Triggering OTP...`);

            // 2. Trigger OTP based on confirmation status
            if (!isConfirmed) {
                console.log("[AuthContext] User unconfirmed. Using 'signup' resend...");
                const { error: resendErr } = await supabase.auth.resend({ type: 'signup', email });
                if (resendErr) throw new Error(resendErr.message);
            } else {
                console.log("[AuthContext] User confirmed. Using 'email' OTP...");
                const { error: otpError } = await supabase.auth.signInWithOtp({ email });
                if (otpError) throw new Error(otpError.message);
            }

            console.log("[AuthContext] OTP sent successfully.");
            return { email, requiresOtp: true, isConfirmed };
        } catch (err) {
            console.error("[AuthContext] Login error:", err);
            throw err;
        }
    };

    // ─── LOGIN VERIFY OTP (Step 2: verify code and create session) ───────
    const loginVerifyOtp = async (email, token) => {
        console.log("[AuthContext] Verifying login OTP (Universal Strategy)...");
        
        let result;
        let lastError;

        // Try type 'email' first (Standard Login OTP)
        try {
            console.log("[AuthContext] Attempting verify with type: 'email'...");
            result = await withTimeout(
                supabase.auth.verifyOtp({ email, token, type: 'email' }),
                45000,
                "Verificar código (email)"
            );
            if (result.error) throw result.error;
        } catch (err) {
            lastError = err;
            console.warn("[AuthContext] Type 'email' failed, retrying with type 'signup'...");
            
            // Fallback to type 'signup' (Unconfirmed User confirmation)
            try {
                result = await withTimeout(
                    supabase.auth.verifyOtp({ email, token, type: 'signup' }),
                    45000,
                    "Verificar código (signup)"
                );
                if (result.error) throw result.error;
            } catch (err2) {
                console.error("[AuthContext] Universal OTP verification failed.");
                throw new Error(err2.message || lastError.message);
            }
        }

        console.log("[AuthContext] Login OTP verified successfully.");

        if (result.data?.user) {
            await fetchProfile(result.data.user.id);
        }

        return result.data?.user;
    };

    // ─── LOGOUT ─────────────────────────────────────────────────────────────
    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    // ─── UPDATE USER PROFILE ────────────────────────────────────────────────
    const updateUser = async (updatedData) => {
        if (!user) return;
        const processed = processGamificationRules(updatedData);
        const { id, auth_id, created_at, email, ...updatePayload } = processed;
        
        const { error } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', user.id);

        if (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
        await fetchProfile(user.id);
    };

    // ─── UPDATE BALANCE ─────────────────────────────────────────────────────
    const updateBalance = async (amount, type = 'credit') => {
        if (!user) return;
        let newBalance = parseFloat(user.points || user.balance || 0);
        newBalance = type === 'credit' ? newBalance + parseFloat(amount) : newBalance - parseFloat(amount);
        
        try {
            await updateUser({ ...user, points: newBalance });
            return newBalance;
        } catch (err) {
            console.error('Balance update error:', err);
        }
    };

    // ─── DELETE ACCOUNT ─────────────────────────────────────────────────────
    const deleteAccount = async () => {
        if (!user) return;
        const { error } = await supabase.from('profiles').delete().eq('id', user.id);
        if (error) {
            console.error('Error deleting account:', error);
        } else {
            logout();
        }
    };

    // ─── CHECK IF USER EXISTS ───────────────────────────────────────────────
    const checkUserExists = async ({ username, email }, excludeId = null) => {
        try {
            if (username) {
                let query = supabase.from('profiles').select('id').ilike('username', username);
                if (excludeId) query = query.neq('id', excludeId);
                const { data, error } = await withTimeout(query, 10000, "Verificar nombre de usuario");
                if (error) throw error;
                if (data && data.length > 0) return { exists: true, field: 'username' };
            }
            if (email) {
                let query = supabase.from('profiles').select('id').ilike('email', email);
                if (excludeId) query = query.neq('id', excludeId);
                const { data, error } = await withTimeout(query, 10000, "Verificar correo");
                if (error) throw error;
                if (data && data.length > 0) return { exists: true, field: 'email' };
            }
        } catch (err) {
            console.error("Error in checkUserExists:", err);
            throw err;
        }
        return { exists: false, field: null };
    };

    return (
        <AuthContext.Provider value={{ 
            user, loading, login, register, logout, updateUser, 
            updateBalance, checkUserExists, deleteAccount, 
            verifyOtp, resendOtp, loginVerifyOtp 
        }}>
            {!isInitialized ? <InitialLoader /> : children}
        </AuthContext.Provider>
    );
};
