import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  const args = process.argv.slice(2);
  
  if (args.includes('--run-sql')) {
    const fileIndex = args.indexOf('--run-sql') + 1;
    const filePath = args[fileIndex];
    if (filePath && fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Running SQL from ${filePath}...`);
      
      // Using exec for raw sql if available, otherwise rpc
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) throw error;
        console.log('Migration successful!');
      } catch (err) {
        console.error('Migration failed. Ensure you have the exec_sql RPC function in Postgres.');
        console.error(err);
      }
    }
  }

  console.log('--- COMPANIES ---');
  const { data: comp } = await supabase.from('companies').select('*').limit(1);
  if (comp && comp.length > 0) {
    console.log('Companies Columns:', Object.keys(comp[0]));
    console.log('Sample Data:', JSON.stringify(comp[0], null, 2));
  } else {
    console.log('No data in companies table.');
  }

  const { data: clients } = await supabase.from('clients').select('*');
  console.log('Total clients in DB:', clients?.length);
}

run();
