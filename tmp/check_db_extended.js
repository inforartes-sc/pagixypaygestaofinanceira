const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function check() {
  console.log('--- SERVICES ---');
  const { data: services, error: sErr } = await supabase.from('services').select('*');
  if (sErr) console.error(sErr);
  else services?.forEach(s => console.log(`Service: ${s.id.slice(0,8)}... Name: ${s.name} CoID: ${s.company_id?.slice(0,8)}...`));

  console.log('\n--- SUBSCRIPTIONS ---');
  const { data: subs, error: subErr } = await supabase.from('subscriptions').select('*');
  if (subErr) console.error(subErr);
  else subs?.forEach(s => console.log(`Sub: ${s.id.slice(0,8)}... ClientID: ${s.client_id?.slice(0,8)}... CoID: ${s.company_id?.slice(0,8)}...`));
}

check();
