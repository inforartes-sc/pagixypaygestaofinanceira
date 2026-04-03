import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: companies, error } = await supabase.from('companies').select('*');
  if (error) {
    console.error('ERRO:', error.message);
  } else {
    console.log('EMPRESAS:', JSON.stringify(companies, null, 2));
  }
}
run();
