import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data, error } = await supabase.from('companies').select('*').limit(1).single();
  if (error) {
    console.error('ERRO:', error.message);
  } else {
    console.log('COLUNAS:', Object.keys(data).join(', '));
  }
}
check();
