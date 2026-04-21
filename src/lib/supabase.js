import { createClient } from '@supabase/supabase-js';

// Cliente Singleton de Supabase para toda la app
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logs solo en desarrollo
if (import.meta.env.DEV) {
    console.log("=== DEBUG SUPABASE (DEV MODE) ===");
    console.log("URL:", supabaseUrl);
    console.log("Key Configurada:", !!supabaseAnonKey);
    console.log("=================================");
}

// 2. Creamos el Singleton con configuración de sesión aislada (V4.1)
// Usamos una storageKey personalizada para evitar colisiones entre dispositivos y entornos.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storageKey: 'cooplance-auth-v4-session',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
