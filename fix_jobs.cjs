// using --env-file
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fix() {
  console.log("Checking broken jobs...");
  const { data: jobs, error } = await supabase.from('jobs').select('*').is('provider_id', null).eq('status', 'active');
  console.log('Broken jobs:', jobs);
  
  if (jobs && jobs.length > 0) {
     for (let j of jobs) {
         if (j.project_id) {
             const { data: props } = await supabase.from('proposals').select('*').eq('project_id', j.project_id).eq('status', 'accepted');
             if (props && props.length > 0) {
                 const pid = props[0].user_id;
                 await supabase.from('jobs').update({ provider_id: pid }).eq('id', j.id);
                 console.log('Fixed job', j.id, 'with provider', pid);
                 
                 // Also fix the chat!
                 const { data: chats } = await supabase.from('chats').select('*').eq('context_id', props[0].id.toString());
                 console.log('Found chats for proposal:', chats);
                 if (chats && chats.length > 0) {
                    await supabase.from('chats').update({ status: 'active' }).eq('id', chats[0].id);
                    console.log('Fixed chat status to active');
                 }
             }
         }
     }
  } else {
      console.log("No broken jobs found.");
  }
}
fix();
