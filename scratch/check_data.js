import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ftmhxjhcmivenybudvho.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0bWh4amhjbWl2ZW55YnVkdmhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjY0MDQsImV4cCI6MjA5NzcwMjQwNH0.fVS5ktVQA7p669c5Rzopfxv3gLfCVl07fJC50tym5nI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: users, error } = await supabase.from('users').select('*');
    if (error) console.error("Users error:", error);
    else console.log("Users:", JSON.stringify(users, null, 2));

    const { data: invites, error: err2 } = await supabase.from('invites').select('*');
    if (err2) console.error("Invites error:", err2);
    else console.log("Invites:", JSON.stringify(invites, null, 2));
}

check();
