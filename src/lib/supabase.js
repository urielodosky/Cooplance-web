import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validar si las variables están presentes para evitar cuelgues
export const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  console.warn("⚠️ [Supabase] Faltan las variables de entorno: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. La aplicación entrará en modo de configuración requerida.");
}

// Inicializar con valores vacíos si faltan para no romper el código que importa la instancia,
// pero el flag isConfigured permitirá a la UI bloquear el acceso.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
