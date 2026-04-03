import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const email = 'infoartes.ap@gmail.com';
  console.log(`Buscando clientes para email: ${email}`);
  
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, user_id');

  if (error) {
    console.error('ERRO:', error.message);
  } else {
    // Busca manual pois o eq as vezes falha com caracteres especiais ou cache
    const match = clients?.find(c => c.name?.toLowerCase().includes('infoartes') || c.id === email);
    console.log('Clientes no sistema:', clients?.length);
    const target = clients?.find(c => c.id !== ''); // Ver todos
    
    // Tenta busca exata de novo mais simples
    const { data: exact } = await supabase.from('clients').select('*').eq('email', email);
    console.log('Resultado por email exato:', JSON.stringify(exact, null, 2));
  }
}
run();
