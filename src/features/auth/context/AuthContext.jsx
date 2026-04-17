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
    const [isTutorView, setIsTutorView] = useState(false); // V27: Mirror Mode for adults
    const [supervisedUser, setSupervisedUser] = useState(null); // The minor being watched
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
                        
                        // V24: Check for deferred data from registration
                        const cachedHeavyData = sessionStorage.getItem('cooplance_pending_profile_data');
                        if (cachedHeavyData) {
                            applyDeferredProfileData(userId, JSON.parse(cachedHeavyData));
                        }

                        setLoading(false);
                        return;
                    }
                    
                    console.warn(`[AuthContext] Profile NOT FOUND (attempt ${attempts + 1}).`);
                    await new Promise(r => setTimeout(r, 2000));
                } catch (err) {
                    console.error(`[AuthContext] fetchProfile attempt ${attempts + 1} failed:`, err);
                    
                    // Detect Network/CORS block and fail fast (V1.7)
                    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
                        console.warn("[AuthContext] Network/CORS block detected. Aborting retries.");
                        break;
                    }

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
    
    // ─── PARENTAL VALIDATION (V27) ──────────────────────────────────────────
    const validateParent = async (email) => {
        if (!email) return { valid: false, error: 'Email requerido.' };
        console.log(`[AuthContext] Validating parent: ${email}`);
        
        try {
            const { data: parent, error } = await supabase
                .from('profiles')
                .select('id, dob, role')
                .eq('email', email)
                .maybeSingle();

            if (error) throw error;
            if (!parent) return { valid: false, error: 'El email no pertenece a ningún usuario registrado.' };
            
            // 1. Role must be freelancer
            if (parent.role !== 'freelancer') {
                return { valid: false, error: 'El adulto responsable debe tener una cuenta de Freelancer.' };
            }

            // 2. Age check (Adult)
            if (parent.dob) {
                const birthDate = new Date(parent.dob);
                const age = new Date().getFullYear() - birthDate.getFullYear();
                if (age < 18) return { valid: false, error: 'El tutor debe ser mayor de 18 años.' };
            }

            // 3. Quota check (Max 2 minors)
            const { count, error: countErr } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('parent_id', parent.id);

            if (countErr) throw countErr;
            if (count >= 2) return { valid: false, error: 'Este tutor ya tiene el máximo de 2 menores a cargo.' };

            return { valid: true, parentId: parent.id };
        } catch (err) {
            console.error('[AuthContext] validateParent error:', err);
            return { valid: false, error: 'Fallo al validar tutor. Intenta de nuevo.' };
        }
    };

    // ─── MIRROR MODE LOGIC (V27) ───────────────────────────────────────────
    const enterMirrorMode = async (minorId) => {
        try {
            const { data, error } = await supabase.from('profiles').select('*').eq('id', minorId).maybeSingle();
            if (error || !data) throw new Error("No se pudo cargar la cuenta del tutorado.");
            setSupervisedUser(data);
            setIsTutorView(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error("Mirror Mode Error:", err);
            alert(err.message);
        }
    };

    const exitMirrorMode = () => {
        setIsTutorView(false);
        setSupervisedUser(null);
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
            responsible_first_name: registrationData.responsibleFirstName || null,
            responsible_last_name: registrationData.responsibleLastName || null,
            responsible_name: registrationData.responsibleName || 
                             ((registrationData.responsibleFirstName || registrationData.responsibleLastName) ? 
                              `${registrationData.responsibleFirstName || ''} ${registrationData.responsibleLastName || ''}`.trim() : null),
            location: registrationData.location || null,
            country: registrationData.country || 'Argentina',
            work_hours: registrationData.workHours || registrationData.work_hours || null,
            payment_methods: registrationData.paymentMethods || registrationData.payment_methods || null,
            vacancies: registrationData.vacancies ? parseInt(registrationData.vacancies) : 0,
            dni: registrationData.dni || null,
            dob: registrationData.dob || registrationData.birthDate || null,
            phone: registrationData.phone || null,
            bio: registrationData.bio || '',
            cuil_cuit: registrationData.cuil_cuit || registrationData.cuit || null,
            parent_id: registrationData.parentId || null,
            status: registrationData.parentId ? 'pending_parental_approval' : 'active',
            terms_accepted: registrationData.termsAccepted || registrationData.terms_accepted || false,
            avatar_url: registrationData.profileImage || null, // V28: Added to metadata for trigger
        };

        // Cache heavy/critical data for post-verification update (Safety Net)
        const heavyData = {
            avatar_url: registrationData.profileImage || null,
            cv_url: registrationData.cvFile || null,
            bio: registrationData.bio || '',
            dob: registrationData.dob || registrationData.birthDate || null,
            phone: registrationData.phone || null
        };
        sessionStorage.setItem('cooplance_pending_profile_data', JSON.stringify(heavyData));

        // Cleanup: Remove empty/null fields
        Object.keys(payload).forEach(key => {
            if (payload[key] === null || payload[key] === '' || payload[key] === undefined) {
                delete payload[key];
            }
        });

        console.log("[AuthContext] Launching signUp request...");
        const startTime = Date.now();
        
        const { data, error } = await withTimeout(supabase.auth.signUp({
            email: registrationData.email,
            password: registrationData.password,
            options: { data: payload }
        }), 90000, "Registro V3");

        const duration = (Date.now() - startTime) / 1000;
        console.log(`[AuthContext] signUp response received in ${duration.toFixed(2)}s.`);

        if (error) {
            console.error("[AuthContext] signUp returned error:", error);
            throw new Error(error.message);
        }
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
            // applyDeferredProfileData is now called automatically inside fetchProfile for V24
        }

        return data.user;
    };

    // ─── DEFERRED PROFILE SYNC (V25 Robust Sytsem) ──────────────────────────
    const applyDeferredProfileData = async (userId, heavyData) => {
        try {
            console.log("[AuthContext] Applying deferred profile data (Storage/Bio/DOB)...");
            
            const updatePayload = {};
            
            // Handle Avatar (Upload to Storage)
            if (heavyData.avatar_url && heavyData.avatar_url.startsWith('data:')) {
                const publicUrl = await uploadToStorage(userId, heavyData.avatar_url, 'avatars');
                if (publicUrl) updatePayload.avatar_url = publicUrl;
            } else if (heavyData.avatar_url) {
                updatePayload.avatar_url = heavyData.avatar_url;
            }

            // Handle CV (Upload to Storage)
            if (heavyData.cv_url && heavyData.cv_url.startsWith('data:')) {
                const publicUrl = await uploadToStorage(userId, heavyData.cv_url, 'portfolio');
                if (publicUrl) updatePayload.cv_url = publicUrl;
            }

            if (heavyData.bio) updatePayload.bio = heavyData.bio;
            
            // V25: Critical Data Type Sanitization (Prevent 400 Bad Request)
            if (heavyData.dob !== undefined) {
                updatePayload.dob = (heavyData.dob === "" || !heavyData.dob) ? null : heavyData.dob;
            }
            if (heavyData.phone !== undefined) {
                updatePayload.phone = (heavyData.phone === "" || !heavyData.phone) ? null : heavyData.phone;
            }

            if (Object.keys(updatePayload).length > 0) {
                console.log("[AuthContext] Syncing deferred payload to DB:", Object.keys(updatePayload));
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update(updatePayload)
                    .eq('id', userId);
                
                if (updateError) {
                    console.error("[AuthContext] Error applying deferred data:", updateError);
                } else {
                    console.log("[AuthContext] Deferred data applied successfully.");
                    sessionStorage.removeItem('cooplance_pending_profile_data');
                    
                    // Update user state one last time with final data
                    const { data: finalProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
                    if (finalProfile) {
                        setUser(prev => ({ ...prev, ...finalProfile }));
                    }
                }
            }
        } catch (e) {
            console.error("[AuthContext] Error in deferred data sync:", e);
        }
    };

    // ─── STORAGE HELPER (V25) ────────────────────────────────────────────────
    const uploadToStorage = async (userId, base64Data, bucket = 'avatars') => {
        try {
            if (!base64Data || !base64Data.startsWith('data:')) return base64Data;
            
            console.log(`[AuthContext] Uploading file to ${bucket} bucket...`);
            
            // Convert Base64 to Blob
            const response = await fetch(base64Data);
            const blob = await response.blob();
            
            // Clean up old files if they exist (optional, but keep it simple for now)
            const fileName = `${userId}_${Date.now()}.png`;
            const filePath = `${userId}/${fileName}`;

            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(filePath, blob, {
                    contentType: 'image/png',
                    upsert: true
                });

            if (error) {
                console.error(`[AuthContext] Storage Upload Error (${bucket}):`, error);
                return null;
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            console.log(`[AuthContext] Upload SUCCESS: ${publicUrl}`);
            return publicUrl;
        } catch (e) {
            console.error("[AuthContext] Error in uploadToStorage:", e);
            return null;
        }
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

        // V25: Handle Avatar Upload to Storage if it's Base64
        if (dbReady.avatar_url && dbReady.avatar_url.startsWith('data:')) {
            const publicUrl = await uploadToStorage(user.id, dbReady.avatar_url, 'avatars');
            if (publicUrl) dbReady.avatar_url = publicUrl;
        }

        if (dbReady.cv_url && dbReady.cv_url.startsWith('data:')) {
            const publicUrl = await uploadToStorage(user.id, dbReady.cv_url, 'portfolio');
            if (publicUrl) dbReady.cv_url = publicUrl;
        }

        // V25: Date Type Sanitization (Prevent 400 Bad Request)
        if (dbReady.dob === "" || dbReady.dob === undefined) dbReady.dob = null;
        if (dbReady.phone === "") dbReady.phone = null;

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
            verifyOtp, resendOtp, loginVerifyOtp,
            validateParent, enterMirrorMode, exitMirrorMode,
            isTutorView, supervisedUser
        }}>
            {!isInitialized ? <InitialLoader /> : children}
        </AuthContext.Provider>
    );
};
