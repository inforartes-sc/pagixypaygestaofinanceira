
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function testInsert() {
  const { data: companies } = await supabaseAdmin.from('companies').select('id').limit(1);
  const companyId = companies?.[0]?.id;
  const { data: clients } = await supabaseAdmin.from('clients').select('id').limit(1);
  const clientId = clients?.[0]?.id;

  console.log(`Testing insert for company ${companyId}, client ${clientId}`);
  
  const { data, error } = await supabaseAdmin.from('subscriptions').insert({
    company_id: companyId,
    client_id: clientId,
    amount: 49.00,
    interval: 'monthly',
    status: 'active',
    next_billing_date: new Date().toISOString().split('T')[0]
  }).select();

  if (error) console.error("Insert Error:", error);
  else console.log("Insert Success:", data);
}

testInsert();
