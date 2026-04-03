
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function checkColumns() {
  const { data, error } = await supabaseAdmin.rpc('get_table_columns', { table_name_input: 'subscriptions' });
  if (error) {
    // If RPC doesn't exist, try direct query to information_schema (might fail due to permissions)
    const { data: cols, error: err2 } = await supabaseAdmin.from('subscriptions').select('*').limit(0);
    console.log("Columns from select limit 0:", Object.keys(cols?.[0] || {}));
  } else {
    console.log("Columns from RPC:", data);
  }
}

checkColumns();
