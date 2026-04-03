import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error('ERRO:', error.message);
  } else {
    console.log('LISTA DE TODOS OS PERFIS:');
    console.log(JSON.stringify(profiles, null, 2));
  }
}
run();
