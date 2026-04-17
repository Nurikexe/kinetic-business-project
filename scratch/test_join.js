
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testJoin() {
  const { data, error } = await supabase
    .from('community_plans')
    .select(`
      id,
      user_id,
      user_config:user_id (
        avatar_url,
        display_name
      )
    `)
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Data:', JSON.stringify(data, null, 2));
  }
}

testJoin();
