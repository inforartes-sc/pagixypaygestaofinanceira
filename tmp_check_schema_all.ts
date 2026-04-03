
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function checkSchema() {
  const { data: tables, error: err1 } = await supabaseAdmin
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
  
  if (err1) {
    console.error("Error fetching tables:", err1);
    // fallback: just try to fetch 1 row from key tables to see if they exist
    const keyTables = ['subscriptions', 'subscription_services', 'invoices', 'invoice_services', 'services'];
    for (const table of keyTables) {
      const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table ${table} NOT found or error:`, error.message);
      } else {
        console.log(`Table ${table} EXISTS, columns:`, Object.keys(data?.[0] || {}));
      }
    }
  } else {
    console.log("Tables:", tables.map(t => t.table_name));
  }
}

checkSchema();
