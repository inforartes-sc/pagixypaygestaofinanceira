import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function nukeClients() {
  console.log('🚀 Iniciando limpeza profunda (fix: profiles.email)...');

  // Buscar todos os clientes (tabela clients)
  const { data: clients } = await supabase.from('clients').select('id, user_id, name');
  console.log(`Encontrados ${clients?.length || 0} registros na tabela 'clients'.`);

  for (const c of clients || []) {
    console.log(`Limpando dados de ${c.name} (${c.id})...`);
    await supabase.from('invoices').delete().eq('client_id', c.id);
    await supabase.from('subscriptions').delete().eq('client_id', c.id);
    await supabase.from('support_tickets').delete().eq('client_id', c.id);
    await supabase.from('service_requests').delete().eq('client_id', c.id);
    await supabase.from('clients').delete().eq('id', c.id);

    if (c.user_id) {
       console.log(`  Removendo Auth User extra: ${c.user_id}`);
       await supabase.auth.admin.deleteUser(c.user_id);
    }
  }

  // Buscar perfis extras com role 'client'
  const { data: clientProfiles } = await supabase.from('profiles').select('id').eq('role', 'client');
  for (const cp of clientProfiles || []) {
    console.log(`  Removendo perfil 'client' remanescente: ${cp.id}`);
    await supabase.auth.admin.deleteUser(cp.id);
    await supabase.from('profiles').delete().eq('id', cp.id);
  }

  // 4. Limpeza de órfãos remanescentes em tabelas
  // Às vezes o client_id em invoices é o user_id, vamos limpar por ambos se necessário
  // (Mas já limpamos acima pelo clients list)

  console.log('✅ Banco de dados "limpo" de clientes! (Master Admin preservado).');
}

nukeClients();
