import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkRLS() {
  console.log('Checking tables RLS status...');
  const { data, error } = await supabase.rpc('check_rls_status');
  
  if (error) {
    // If RPC doesn't exist, use a direct query via a temporary function or just try to infer
    console.log('RPC check_rls_status not found, trying raw query...');
    const { data: tables, error: sqlError } = await supabase.from('pg_tables').select('tablename, rowsecurity').eq('schemaname', 'public');
    // Note: supabase-js might not allow direct access to pg_tables without specific setup
    if (sqlError) {
      console.error('Error fetching RLS status via select:', sqlError.message);
      
      // Fallback: list tables and we will manualy check them
      const { data: list, error: listError } = await supabase.rpc('get_tables_list');
      if (listError) {
        console.error('Error fetching tables list:', listError.message);
      } else {
        console.log('Tables:', list);
      }
    } else {
      console.table(tables);
    }
  } else {
    console.table(data);
  }
}

// Since I don't know if the RPC exists, let's create a scratch script that uses a more common method
// if I can't query pg_tables directly.
// I'll use a better approach: try to find the tables that might be public.

async function run() {
  const tablesToCheck = [
    'profiles', 'clients', 'invoices', 'subscriptions', 
    'services', 'companies', 'settings', 'support_tickets',
    'service_requests', 'support_messages', 'service_request_messages',
    'notifications', 'subscription_items', 'invoice_items'
  ];

  console.log('Table RLS Check:');
  for (const table of tablesToCheck) {
    try {
      // Trying to select as an anonymous user (using anon key)
      const anonSupabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
      const { data, error } = await anonSupabase.from(table).select('*').limit(1);
      
      if (error) {
        if (error.code === '42501') {
          console.log(`[SECURE] ${table}: Permission denied (RLS works or no grant)`);
        } else {
          console.log(`[ERROR] ${table}: ${error.code} - ${error.message}`);
        }
      } else {
        console.log(`[VULNERABLE] ${table}: Accessible by public!`);
      }
    } catch (e) {
      console.log(`[FAIL] ${table}: ${e}`);
    }
  }
}

run();
