import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkTable(tableName: string) {
  console.log(`--- Checking ${tableName} ---`);
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    console.error(`Error fetching ${tableName}:`, error.message);
  } else if (data && data.length > 0) {
    console.log(`Columns in ${tableName}:`, Object.keys(data[0]));
  } else {
    console.log(`No data in ${tableName} to check columns.`);
  }
}

async function run() {
  await checkTable('companies');
  await checkTable('clients');
  await checkTable('invoices');
  await checkTable('subscriptions');
}
run();
