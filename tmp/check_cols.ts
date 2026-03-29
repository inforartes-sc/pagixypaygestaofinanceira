import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function check() {
  const { data: s_cols } = await supabase.from('services').select('*').limit(1);
  if (s_cols && s_cols.length > 0) console.log('Services Columns:', Object.keys(s_cols[0]));
  else console.log('No services in table.');

  const { data: sub_cols } = await supabase.from('subscriptions').select('*').limit(1);
  if (sub_cols && sub_cols.length > 0) console.log('Subscriptions Columns:', Object.keys(sub_cols[0]));
  else console.log('No subscriptions in table.');
}

check();
