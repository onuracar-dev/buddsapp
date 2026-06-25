import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('chats').select('id, name, youtube_id').not('youtube_id', 'is', null);
  console.log(JSON.stringify(data, null, 2));
}
run();
