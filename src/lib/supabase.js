import { createClient } from '@supabase/supabase-js';

// 1. Imprimimos las variables para ver si Vercel las está inyectando bien al compilar
console.log("=== TEST DE VARIABLES VERCEL ===");
console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
// Solo verificamos si la llave existe (true/false) por seguridad, no la imprimimos entera
console.log("Supabase Key existe:", !!import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log("================================");

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Creamos el Singleton (una única instancia del cliente para toda la app)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
