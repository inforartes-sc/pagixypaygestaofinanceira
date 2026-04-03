import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: clients, error } = await supabase.from('clients').select('*');
  if (error) {
    console.error('ERRO:', error.message);
  } else {
    // Busca por qualquer um
    console.log('TODOS OS CLIENTES NO BANCO:');
    clients?.map(c => console.log(`ID: ${c.id}, Nome: ${c.name}, Email: ${c.email}, UserID: ${c.user_id}`));
  }
}
run();
