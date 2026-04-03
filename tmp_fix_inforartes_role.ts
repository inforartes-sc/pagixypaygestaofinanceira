import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const userId = 'f799026d-2fa0-4ca7-bc79-81267e14b691';
  console.log(`Alterando papel do usuário InforArtes (ID: ${userId}) de 'admin' para 'client'...`);
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'client' })
    .eq('id', userId);

  if (error) {
    console.error('ERRO:', error.message);
  } else {
    console.log('Papel alterado com SUCESSO! Agora o usuário acessará o Portal do Cliente.');
  }
}
run();
