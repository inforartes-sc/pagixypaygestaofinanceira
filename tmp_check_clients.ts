import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'clients' });
  // Se não tiver RPC, tenta uma query de erro intencional ou algo similar para ver a estrutura
  if (error) {
    console.log("RPC falhou, tentando query direta para ver colunas de um erro de upsert...");
    const { error: upsertErr } = await supabase.from('clients').upsert({ email: 'test@example.com' }, { onConflict: 'email' });
    console.error('ERRO DE UPSERT (EXPECTED):', upsertErr?.message);
  } else {
    console.log('INFO:', data);
  }
}
check();
