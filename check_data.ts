import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkData() {
  const { data: invoices, error: invError } = await supabase.from('invoices').select('*');
  console.log('--- INVOICES ---');
  invoices?.forEach(inv => {
    console.log(`INV: ${inv.id} | Amount: ${inv.amount} | ClientID: ${inv.client_id} | CoID: ${inv.company_id}`);
  });

  const { data: profiles, error: profError } = await supabase.from('profiles').select('*');
  console.log('\n--- PROFILES ---');
  profiles?.forEach(prof => {
    console.log(`PROF: ${prof.id} | Name: ${prof.full_name} | Role: ${prof.role} | CoID: ${prof.company_id}`);
  });

  const { data: companies, error: compError } = await supabase.from('companies').select('*');
  console.log('\n--- COMPANIES ---');
  companies?.forEach(comp => {
    console.log(`COMP: ${comp.id} | Name: ${comp.name}`);
  });
}

checkData();
