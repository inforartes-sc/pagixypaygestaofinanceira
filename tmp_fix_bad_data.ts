import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function fix() {
  console.log('Buscando faturas sem método de pagamento...');
  const { data, error } = await supabase
    .from('invoices')
    .select('id')
    .is('payment_method', null);

  if (error) {
    console.error('Erro ao buscar:', error.message);
    return;
  }

  console.log(`Encontradas ${data.length} faturas para corrigir.`);

  if (data.length > 0) {
    const { error: updateErr } = await supabase
      .from('invoices')
      .update({ payment_method: 'pix' })
      .is('payment_method', null);

    if (updateErr) {
      console.error('Erro ao atualizar:', updateErr.message);
    } else {
      console.log('Faturas corrigidas com sucesso!');
    }
  }
}
fix();
