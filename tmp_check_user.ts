import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const email = 'infoartes.ap@gmail.com';
  console.log(`Buscando perfil para: ${email}`);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*, clients(*)')
    .eq('email', email)
    .single();

  if (error) {
    console.error('ERRO:', error.message);
  } else {
    console.log('Perfil encontrado:', JSON.stringify(data, null, 2));
  }
}
check();
