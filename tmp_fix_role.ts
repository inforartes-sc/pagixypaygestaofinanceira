import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const email = 'infoartes.ap@gmail.com';
  console.log(`Buscando cliente para email: ${email}`);
  
  const { data: client, error } = await supabase
    .from('clients')
    .select('id, name, user_id')
    .eq('email', email)
    .single();

  if (error) {
    console.error('ERRO:', error.message);
  } else {
    console.log('Cliente encontrado:', JSON.stringify(client, null, 2));
    if (client.user_id) {
        console.log(`Atualizando papel do perfil ID: ${client.user_id} para 'client'`);
        const { error: upErr } = await supabase
            .from('profiles')
            .update({ role: 'client' })
            .eq('id', client.user_id);
            
        if (upErr) {
            console.error('Erro ao atualizar papel:', upErr.message);
        } else {
            console.log('Papel atualizado com SUCESSO!');
        }
    } else {
        console.warn('Este cliente não tem um user_id vinculado!');
    }
  }
}
run();
