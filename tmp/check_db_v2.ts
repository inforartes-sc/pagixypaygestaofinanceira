import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function check() {
  console.log('--- PROFILES ---');
  const { data: profiles } = await supabase.from('profiles').select('*');
  profiles?.forEach(p => console.log(`Profile: ${p.id.slice(0,8)}... Role: ${p.role} CoID: ${p.company_id?.slice(0,8)}...`));

  console.log('\n--- SERVICES ---');
  const { data: services } = await supabase.from('services').select('*');
  services?.forEach(s => console.log(`Service: ${s.id.slice(0,8)}... Name: ${s.name} CoID: ${s.company_id?.slice(0,8)}...`));

  console.log('\n--- SUBSCRIPTIONS ---');
  const { data: subs } = await supabase.from('subscriptions').select('*');
  subs?.forEach(s => console.log(`Sub: ${s.id.slice(0,8)}... ClientID: ${s.client_id?.slice(0,8)}... CoID: ${s.company_id?.slice(0,8)}...`));
  
  console.log('\n--- COMPANIES ---');
  const { data: companies } = await supabase.from('companies').select('*');
  companies?.forEach(c => console.log(`Company: ${c.id.slice(0,8)}... Name: ${c.name}`));
}

check();
