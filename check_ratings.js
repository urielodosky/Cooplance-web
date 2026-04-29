import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRatings() {
    const { data, error } = await supabase
        .from('profiles')
        .select('username, rating, reviews:service_reviews!target_id(rating)')
        .in('username', ['Cooplance', 'martinezmichael40']);

    console.log(JSON.stringify(data, null, 2));
}

checkRatings();
