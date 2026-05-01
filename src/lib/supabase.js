import { createClient } from '@supabase/supabase-js';

// Cliente Singleton de Supabase para toda la app
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnóstico de producción (Seguro, no muestra las llaves)
console.log("=== SUPABASE CONFIG CHECK ===");
console.log("URL de conexión detectada:", supabaseUrl ? "OK" : "FALTA");
console.log("API Key detectada:", supabaseAnonKey ? "OK" : "FALTA");
if (supabaseUrl && !supabaseUrl.includes('supabase.co')) {
    console.warn("ALERTA: La URL de Supabase parece incorrecta:", supabaseUrl);
}
console.log("=============================");

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("CRITICAL: Faltan las variables de entorno de Supabase. La app no funcionará.");
}

// 2. Creamos el Singleton con configuración de sesión aislada (V4.1)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storageKey: 'cooplance-auth-v4-session',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
