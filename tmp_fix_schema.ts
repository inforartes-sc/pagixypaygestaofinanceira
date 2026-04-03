import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function runSQL(sql: string) {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.error('SQL Execution Error:', error);
    return false;
  }
  console.log('SQL Executed successfully:', data);
  return true;
}

async function fix() {
  console.log('--- Fixing Database Schema ---');
  
  // 1. Check if we can run SQL
  const works = await runSQL('SELECT 1;');
  if (!works) {
    console.error('Cannot run SQL via exec_sql RPC. Check if it exists or if the user has permissions.');
    return;
  }

  // 2. Add 'notes' column to 'clients'
  console.log('Adding notes column to clients table...');
  const addNotes = await runSQL('ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;');
  if (addNotes) {
    console.log('Successfully added notes column to clients.');
  }

  // 3. Add address columns to companies if missing (based on previous observations/reports)
  // Even if not the main issue, it avoids other potential 500s.
  console.log('Adding address columns to companies table...');
  const addCompCols = await runSQL(`
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_zip TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_street TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_number TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_neighborhood TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_city TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_state TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;
  `);
  if (addCompCols) {
    console.log('Successfully added missing columns to companies.');
  }
}

fix();
