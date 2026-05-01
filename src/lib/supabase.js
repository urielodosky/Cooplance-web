import { createClient } from '@supabase/supabase-js';

// Cliente Singleton de Supabase para toda la app
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Creamos el Singleton con configuración de sesión aislada
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storageKey: 'cooplance-auth-v4-session',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
