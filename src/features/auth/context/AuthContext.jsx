import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { processGamificationRules } from '../../../utils/gamification';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import InitialLoader from '../../../components/common/InitialLoader';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    console.log("--- COOPLANCE AUTH V4 ACTIVADO ---");
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const syncInProgress = useRef(null); // V24: Track active syncing UID to prevent loops

    const handleSession = async (session) => {
        try {
            console.log("[AuthContext] Handling session:", session?.user ? "User detected" : "No user");
            if (session?.user) {
                // V24: Deduplication - Don't start a horizontal sync if one for this UI is already running
                if (syncInProgress.current === session.user.id) {
                    console.log("[AuthContext] Sync already in progress for this user. Skipping.");
                    return;
                }

                // V13: Carga instantánea desde caché local
                const cachedProfile = localStorage.getItem(`cooplance_profile_${session.user.id}`);
                if (cachedProfile) {
                    console.log("[AuthContext] Instant boot from cache.");
                    setUser({ ...JSON.parse(cachedProfile), is_cached: true });
                    setLoading(false);
                } else {
                    setLoading(true);
                }
                
                // V14: No bloqueamos el inicio de la App. Sincronizamos en segundo plano.
                // We don't await here to keep the bootstrap fast, but fetchProfile is now self-guarded.
                fetchProfile(session.user.id, session.user).catch(err => {
                    console.error("[AuthContext] Background sync failed:", err);
                });
            } else {
                syncInProgress.current = null;
                setUser(null);
                setLoading(false);
            }
        } catch (err) {
            console.error("[AuthContext] handleSession error:", err);
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
                if (isMounted) handleSession(session); // V14: Remove await here too
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
            try {
                console.log("[AuthContext] Auth event:", _event);
                // INITIAL_SESSION logic handled by initializeAuth
                if (_event === 'INITIAL_SESSION') return;
                
                if (isMounted) await handleSession(session);
            } catch (err) {
                console.error("[AuthContext] Error in onAuthStateChange listener:", err);
            }
        });

        // Watchdog: force UI load if init hangs (V19: Increased to 45s)
        const fallback = setTimeout(() => {
            if (isMounted && !isInitComplete) {
                console.warn("[AuthContext] Watchdog timeout (45s). Forcing UI.");
                setLoading(false);
                setIsInitialized(true);
            }
        }, 45000);

        return () => {
            isMounted = false;
            clearTimeout(fallback);
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    // ─── FETCH PROFILE ──────────────────────────────────────────────────────
    const fetchProfile = async (userId, authUser = null) => {
        if (!userId) return;
        
        let attempts = 0;
        const maxAttempts = 3; 
        syncInProgress.current = userId;
        
        try {
            while (attempts < maxAttempts) {
                try {
                    console.log(`[AuthContext] Syncing profile for ${userId} (Attempt ${attempts + 1})...`);
                    const { data, error } = await withTimeout(
                        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
                        30000, // V13: Increased to 30s
                        "Cargar Perfil (DB)"
                    );
                    
                    if (error) {
                        console.error("[AuthContext] Supabase DB Error:", error.message);
                        throw error;
                    }

                    if (data) {
                        console.log("[AuthContext] Profile synced successfully.");
                        const finalUser = { ...data, is_partial: false, is_cached: false };
                        setUser(finalUser);
                        localStorage.setItem(`cooplance_profile_${userId}`, JSON.stringify(finalUser));
                        setLoading(false);
                        return;
                    }
                    
                    console.warn(`[AuthContext] Profile NOT FOUND (attempt ${attempts + 1}).`);
                    await new Promise(r => setTimeout(r, 2000));
                } catch (err) {
                    console.error(`[AuthContext] fetchProfile attempt ${attempts + 1} failed:`, err);
                    // On last attempt, don't throw, let the fallback logic run
                    if (attempts === maxAttempts - 1) break;
                    attempts++;
                }
            }

            console.error("[AuthContext] Sync failed. Staying with cache/fallback.");
            if (authUser && (!user || user.is_partial)) {
                setUser({
                    id: authUser.id,
                    email: authUser.email,
                    username: authUser.raw_user_meta_data?.username || authUser.email.split('@')[0],
                    role: authUser.raw_user_meta_data?.role || 'freelancer',
                    is_partial: true,
                    sync_error: true 
                });
            }
        } catch (globalErr) {
            console.error("[AuthContext] fetchProfile critical crash:", globalErr);
        } finally {
            syncInProgress.current = null;
            setLoading(false);
        }
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
            bio: registrationData.bio || '',
            // V23: Heavy images removed from metadata to prevent "Failed to fetch" (size limits)
            // They will be uploaded post-verification.
            terms_accepted: registrationData.termsAccepted || registrationData.terms_accepted || false,
        };

        // Cache heavy data for post-verification update
        const heavyData = {
            avatar_url: registrationData.profileImage || null,
            cv_url: registrationData.cvFile || null,
            bio: registrationData.bio || ''
        };
        sessionStorage.setItem('cooplance_pending_profile_data', JSON.stringify(heavyData));

        // Cleanup: Remove empty/null fields
        Object.keys(payload).forEach(key => {
            if (payload[key] === null || payload[key] === '' || payload[key] === undefined) {
                delete payload[key];
            }
        });

        const { data, error } = await withTimeout(supabase.auth.signUp({
            email: registrationData.email,
            password: registrationData.password,
            options: { data: payload }
        }), 60000, "Registro V3");

        if (error) throw new Error(error.message);
        return data.user;
    };

    // ─── VERIFY OTP (Supabase native) ───────────────────────────────────────
    // This confirms the email, creates a session, and triggers profile creation
    const verifyOtp = async (email, token) => {
        console.log("[AuthContext] Verifying OTP via Supabase...");
        
        const { data, error } = await withTimeout(
            supabase.auth.verifyOtp({ email, token, type: 'signup' }),
            60000,
            "Verificar OTP V3"
        );

        if (error) throw new Error(error.message);

        console.log("[AuthContext] OTP verified successfully. Session created.");

        // Give the DB trigger a moment to create the profile
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Fetch the newly created profile
        if (data.user) {
            await fetchProfile(data.user.id);
            
            // V23: Post-verification update for heavy metadata (images/bio)
            const cachedHeavyData = sessionStorage.getItem('cooplance_pending_profile_data');
            if (cachedHeavyData) {
                try {
                    const heavyData = JSON.parse(cachedHeavyData);
                    console.log("[AuthContext] Applying deferred profile data (images/bio)...");
                    
                    const updatePayload = {};
                    if (heavyData.avatar_url) updatePayload.avatar_url = heavyData.avatar_url;
                    if (heavyData.cv_url) updatePayload.cv_url = heavyData.cv_url;
                    if (heavyData.bio) updatePayload.bio = heavyData.bio;

                    if (Object.keys(updatePayload).length > 0) {
                        const { error: updateError } = await supabase
                            .from('profiles')
                            .update(updatePayload)
                            .eq('id', data.user.id);
                        
                        if (updateError) {
                            console.error("[AuthContext] Error applying deferred data:", updateError);
                        } else {
                            // Re-sync user state with updated values
                            await fetchProfile(data.user.id);
                            sessionStorage.removeItem('cooplance_pending_profile_data');
                        }
                    }
                } catch (e) {
                    console.error("[AuthContext] Error parsing deferred data:", e);
                }
            }
        }

        return data.user;
    };

    // ─── RESEND OTP ─────────────────────────────────────────────────────────
    const resendOtp = async (email) => {
        const { error } = await withTimeout(
            supabase.auth.resend({ type: 'signup', email }),
            60000,
            "Reenviar OTP V3"
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
                        storageKey: 'cooplance-ghost-v4', // V4: Unique key to avoid storage deadlocks
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
        console.log("[AuthContext V4] Verifying login OTP (Universal Strategy)...");
        
        let result;
        let lastError;

        // Try type 'email' first (Standard Login OTP)
        try {
            console.log("[AuthContext V4] Attempting verify with type: 'email'...");
            result = await withTimeout(
                supabase.auth.verifyOtp({ email, token, type: 'email' }),
                60000,
                "Verificar (V4-email)"
            );
            if (result.error) throw result.error;
        } catch (err) {
            lastError = err;
            console.warn("[AuthContext V4] Type 'email' failed, checking if session was created anyway...");
            
            // Critical check: if we already have a session, ignore HTTP error
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                console.log("[AuthContext V4] Active session detected! Bypassing error.");
                await fetchProfile(session.user.id);
                return session.user;
            }

            console.warn("[AuthContext V4] No session found, retrying with type 'signup'...");
            
            // Fallback to type 'signup' (Unconfirmed User confirmation)
            try {
                result = await withTimeout(
                    supabase.auth.verifyOtp({ email, token, type: 'signup' }),
                    60000,
                    "Verificar (V4-signup)"
                );
                if (result.error) throw result.error;
            } catch (err2) {
                // Last check for session
                const { data: { session: sessionFinal } } = await supabase.auth.getSession();
                if (sessionFinal?.user) {
                    console.log("[AuthContext V4] Session found on last retry! Bypassing.");
                    await fetchProfile(sessionFinal.user.id);
                    return sessionFinal.user;
                }
                console.error("[AuthContext V4] Universal OTP verification failed.");
                throw new Error(err2.message || lastError.message);
            }
        }

        console.log("[AuthContext V4] Login OTP verified successfully.");

        if (result.data?.user) {
            await fetchProfile(result.data.user.id);
        }

        return result.data?.user;
    };

    // ─── LOGOUT ─────────────────────────────────────────────────────────────
    const logout = async () => {
        const userId = user?.id;
        await supabase.auth.signOut();
        if (userId) localStorage.removeItem(`cooplance_profile_${userId}`);
        setUser(null);
    };

    // ─── UPDATE USER PROFILE ────────────────────────────────────────────────
    const updateUser = async (updatedData) => {
        if (!user) return;
        if (user.is_partial && !user.id) {
            const errorMsg = "Error Crítico: No se pudo identificar al usuario. Recarga la página.";
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        const processed = processGamificationRules(updatedData);

        // Map frontend camelCase to backend snake_case
        const dbReady = { ...processed };
        if (processed.firstName) { dbReady.first_name = processed.firstName; delete dbReady.firstName; }
        if (processed.lastName) { dbReady.last_name = processed.lastName; delete dbReady.lastName; }
        if (processed.avatar || processed.profileImage || processed.avatar_url) {
            dbReady.avatar_url = processed.avatar || processed.profileImage || processed.avatar_url;
            delete dbReady.avatar;
            delete dbReady.profileImage;
        }
        if (processed.companyName) { dbReady.company_name = processed.companyName; delete dbReady.companyName; }
        if (processed.responsibleName) { dbReady.responsible_name = processed.responsibleName; delete dbReady.responsibleName; }
        if (processed.birthDate || processed.dob) {
            dbReady.dob = processed.birthDate || processed.dob;
            delete dbReady.birthDate;
        }

        // V21: Strip internal flags that don't exist in the DB schema
        const { 
            id, 
            auth_id, 
            created_at, 
            email, 
            is_cached, 
            is_partial, 
            sync_error, 
            ...updatePayload 
        } = dbReady;
        
        const { error } = await supabase
            .from('profiles')
            .update(updatePayload)
            .eq('id', user.id);

        if (error) {
            const techDetail = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            console.error('[AuthContext] Error updating profile:', error);
            const enrichedError = new Error(`Fallo al actualizar perfil: ${techDetail}`);
            enrichedError.details = error;
            throw enrichedError;
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
        
        // Soft delete: Set deleted_at instead of deleting the row
        const { error } = await supabase
            .from('profiles')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', user.id);

        if (error) {
            console.error('Error soft-deleting account:', error);
            throw error;
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
