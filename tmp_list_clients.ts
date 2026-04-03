import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: clients, error } = await supabase.from('clients').select('id, name, email, user_id');
  if (error) {
    console.error('ERRO:', error.message);
  } else {
    console.log('CLIENTES ENCONTRADOS:', JSON.stringify(clients, null, 2));
  }
}
run();
