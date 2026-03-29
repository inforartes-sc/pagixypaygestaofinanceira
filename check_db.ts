import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkClients() {
  const { data: clients, error } = await supabase.from('clients').select('*');
  if (error) {
    console.error('Error fetching clients:', error);
    return;
  }
  console.log('--- CLIENTS ---');
  clients.forEach(c => {
    console.log(`CLIENT:: ID: ${c.id.substring(0,8)}... Name: ${c.name} CoID: ${c.company_id?.substring(0,8)}... UID: ${c.user_id?.substring(0,8)}...`);
  });

  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  if (pError) {
    console.error('Error fetching profiles:', pError);
    return;
  }
  console.log('--- PROFILES ---');
  profiles.forEach(p => {
    console.log(`PROFILE:: ID: ${p.id.substring(0,8)}... Name: ${p.full_name} Role: ${p.role} CoID: ${p.company_id?.substring(0,8)}...`);
  });
}

checkClients();
