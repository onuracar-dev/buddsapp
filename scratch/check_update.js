import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ftmhxjhcmivenybudvho.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0bWh4amhjbWl2ZW55YnVkdmhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjY0MDQsImV4cCI6MjA5NzcwMjQwNH0.fVS5ktVQA7p669c5Rzopfxv3gLfCVl07fJC50tym5nI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    const { data, error } = await supabase.from('users').update({ workspace_id: 'c38a34eb-99cc-4552-996b-ade0479db2ac' }).eq('id', '7135f6d1-fe41-46e4-bf07-4a97f8a45e29').select();
    console.log("Fix Data:", data);
    console.log("Fix Error:", error);
}

fix();
