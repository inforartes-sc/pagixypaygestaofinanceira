
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  const { data, error } = await supabaseAdmin.from('subscriptions').select('*').limit(1);
  console.log('Subscriptions sample:', data);
  if (error) console.error('Error fetching subscriptions:', error);
}

check();
