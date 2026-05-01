import { createClient } from '@supabase/supabase-js';

// Cliente Singleton de Supabase para toda la app
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnóstico de producción (Seguro, no muestra las llaves completas)
console.log("=== SUPABASE DIAGNOSTICS V2 ===");
console.log("URL:", supabaseUrl ? `Detectada (${supabaseUrl.substring(0, 15)}...)` : "FALTA");
console.log("URL tiene espacio al final?:", supabaseUrl && supabaseUrl.endsWith(' ') ? "SÍ (BORRAR ESPACIO EN VERCEL)" : "NO");
console.log("Anon Key Prefijo:", supabaseAnonKey ? supabaseAnonKey.substring(0, 10) : "FALTA");
console.log("Anon Key Longitud:", supabaseAnonKey ? supabaseAnonKey.length : 0);

if (supabaseAnonKey && supabaseAnonKey.length > 300) {
    console.warn("ALERTA: La Anon Key parece ser una SERVICE ROLE KEY (es demasiado larga). Revisá Vercel.");
}
console.log("===============================");

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
