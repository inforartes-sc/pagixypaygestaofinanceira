import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  console.log('--- Checking Clients Table ---');
  const { data, error } = await supabase.from('clients').select('*').limit(1);
  if (error) {
    console.error('Error fetching clients:', error);
  } else if (data && data.length > 0) {
    console.log('Current columns in clients table:', Object.keys(data[0]));
  } else {
    console.log('No clients found in table to check columns.');
    // Try to describe the table if RPC is available, or just insert a dummy and delete
    const { data: cols, error: err } = await supabase.rpc('exec_sql', { sql_query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'clients';" });
    if (err) {
      console.error('Failed to query information_schema via exec_sql:', err);
    } else {
      console.log('Columns from information_schema:', cols);
    }
  }
}
check();
