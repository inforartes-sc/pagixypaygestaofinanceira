import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  if (error) {
    fs.writeFileSync('profiles_error.txt', error.message);
  } else {
    fs.writeFileSync('profiles_list.json', JSON.stringify(profiles, null, 2));
  }
}
run();
