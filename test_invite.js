import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: inviteData, error: inviteError } = await supabase.from('invites').select('*').limit(1);
  console.log('Invite:', inviteData, inviteError);
  
  if (inviteData && inviteData.length > 0) {
    const inviteId = inviteData[0].id;
    // We are using Anon key, so this is an unauthenticated request. 
    // In the real app, it's authenticated. But if RLS allows anon, it works.
    // To simulate authenticated, we would need to sign in.
    
    // Let's check what policies might exist.
  }
}
test();
