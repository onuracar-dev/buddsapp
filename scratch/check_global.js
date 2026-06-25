import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ftmhxjhcmivenybudvho.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0bWh4amhjbWl2ZW55YnVkdmhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMjY0MDQsImV4cCI6MjA5NzcwMjQwNH0.fVS5ktVQA7p669c5Rzopfxv3gLfCVl07fJC50tym5nI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('global_settings').select('*');
    if (error) console.error("Error:", error);
    else console.log("Data:", data);
}

check();
