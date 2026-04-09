import React, { createContext, useContext, useState, useEffect } from 'react';
import { processGamificationRules } from '../../../utils/gamification';
import { supabase } from '../../../lib/supabase';
import InitialLoader from '../../../components/common/InitialLoader';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const handleSession = async (session) => {
        if (session?.user) {
            await fetchProfile(session.user.id);
        } else {
            setUser(null);
            setLoading(false);
        }
    };

    // ─── Bootstrap: Load from Supabase ─────────────────────────────────────
    useEffect(() => {
        let isMounted = true;

        // Initialize state via getSession AND subscribe to future changes safely
        const initializeAuth = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) console.error("getSession error:", error);
            
            if (isMounted) await handleSession(session);
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
                console.warn("AuthContext initialization timed out (5s). Forcing UI to load.");
                setLoading(false);
            }
        }, 5000);

        return () => {
            isMounted = false;
            clearTimeout(fallbackTimer);
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId) => {
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            try {
                const { data, error } = await withTimeout(
                    supabase.from('profiles').select('*').eq('id', userId).single(),
                    15000,
                    "Obtener perfil"
                );
                
                if (data) {
                    setUser(data);
                    setLoading(false);
                    return; // Éxito
                }

                if (error) {
                    // Si el error no es "no encontrado", lanzamos
                    if (error.code !== 'PGRST116') throw error;
                }
            } catch (err) {
                console.error(`Intento ${attempts + 1} de fetchProfile falló:`, err);
            }

            attempts++;
            if (attempts < maxAttempts) {
                // Esperar un poco antes de reintentar (dar tiempo al trigger SQL)
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }
        
        console.error("No se pudo obtener el perfil después de varios intentos.");
        setLoading(false);
    };

    // Utility for safely timing out hanging Supabase requests
    const withTimeout = (promise, ms, operationName) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout: La operación "${operationName}" excedió el tiempo límite. Intenta recargar la página.`)), ms))
        ]);
    };

    // ─── REGISTER (Now called early to check availability) ───────────────────────────
    const register = async (role, registrationData) => {
        const { email, password, username, first_name, last_name, gender, company_name, responsible_name, location, country, work_hours, payment_methods, vacancies, dni, dob, phone, terms_accepted } = registrationData;

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
                    vacancies: vacancies ? parseInt(vacancies) : 0,
                    dni: dni || null,
                    dob: dob || null,
                    phone: phone || null,
                    terms_accepted: terms_accepted || false,
                    email_verified: false // <--- Guard until OTP is valid
                }
            }
        }), 10000, "Registro");

        if (error) {
            throw new Error(error.message);
        }
        
        return data.user;
    };

    // ─── CONFIRM REGISTRATION (Triggers SQL profile creation) ───────────────────
    const confirmRegistration = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No hay una sesión activa para confirmar.");

        try {
            const { error } = await withTimeout(supabase.auth.updateUser({
                data: { email_verified: true } // <--- This triggers the SQL Profile creation
            }), 30000, "Confirmación de Perfil");

            if (error) {
                // If it's a conflict error, maybe the profile already exists. We try to continue.
                if (error.message.includes("already registered") || error.message.includes("already exist")) {
                    console.warn("Profile already exists or conflict during confirmation. Attempting to fetch anyway.");
                } else {
                    throw error;
                }
            }
        } catch (err) {
            console.error("Confirmation error details:", err);
            // Re-throw if it's a critical error (like timeout), otherwise try to fetch profile
            if (err.message.includes("Timeout")) throw err;
        }
        
        // Final sync of profile (even if metadata update failed, the trigger might have worked previously)
        await fetchProfile(user.id);
        return user;
    };

    // ─── LOGIN ──────────────────────────────────────────────────────────────────
    const login = async ({ email, password }) => {
        const { data, error } = await withTimeout(supabase.auth.signInWithPassword({
            email,
            password
        }), 30000, "Iniciar sesión");
        
        if (error) {
            throw new Error(error.message);
        }
        
        if (data.session) {
            await handleSession(data.session);
        }
        
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
            // If timeout or other error, we let the process continue OR throw based on preference.
            // Here we throw to avoid creating duplicates if the DB is just slow.
            throw err;
        }

        return { exists: false, field: null };
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, updateBalance, checkUserExists, deleteAccount, confirmRegistration }}>
            {loading ? <InitialLoader /> : children}
        </AuthContext.Provider>
    );
};
