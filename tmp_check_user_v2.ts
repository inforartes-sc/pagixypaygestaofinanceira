import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const email = 'infoartes.ap@gmail.com';
  
  // 1. Achar o cliente
  console.log(`Buscando cliente para: ${email}`);
  const { data: client, error: cErr } = await supabase.from('clients').select('id, name, company_id').eq('email', email).maybeSingle();
  
  if (cErr) {
    console.error('Erro ao buscar cliente:', cErr.message);
    return;
  }

  if (!client) {
    console.log(`Nenhum registro de CLIENTE encontrado para ${email}.`);
  } else {
    console.log(`Cliente encontrado: ${client.name} (${client.id})`);
  }

  // 2. Achar o perfil
  console.log(`Buscando perfil para: ${email}`);
  const { data: profile, error: pErr } = await supabase.from('profiles').select('id, role, company_id').eq('email', email).maybeSingle();

  if (pErr) {
    console.error('Erro ao buscar perfil:', pErr.message);
    return;
  }

  if (!profile) {
    console.log(`Nenhum PERFIL encontrado para ${email}.`);
  } else {
    console.log(`Perfil encontrado: ID ${profile.id}, Role Atual: ${profile.role}`);
  }
}
run();
