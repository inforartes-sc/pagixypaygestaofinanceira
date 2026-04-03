import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  console.log('--- ALL USERS IN AUTH ---');
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    return;
  }
  data.users.forEach(u => {
    console.log(`- Email: ${u.email}, ID: ${u.id}, Created At: ${u.created_at}`);
  });

  console.log('\n--- ALL CLIENTS IN DB ---');
  const { data: clients } = await supabase.from('clients').select('*');
  clients?.forEach(c => {
    console.log(`- Email: ${c.email}, ID: ${c.id}, user_id: ${c.user_id}, Name: ${c.name}`);
  });
}

run();
