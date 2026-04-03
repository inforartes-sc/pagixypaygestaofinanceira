
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  const email = "negocionlinefree@gmail.com";
  console.log(`Checking client with email: ${email}`);
  
  const { data: client } = await supabaseAdmin.from('clients').select('*').eq('email', email).maybeSingle();
  if (!client) {
    console.log("Client not found.");
    return;
  }
  console.log("Client found:", client.id, client.name);
  
  const { data: subs } = await supabaseAdmin.from('subscriptions').select('*').eq('client_id', client.id);
  console.log("Subscriptions Found:", subs?.length || 0);
  console.log(subs);
  
  const { data: invoices } = await supabaseAdmin.from('invoices').select('*').eq('client_id', client.id);
  console.log("Invoices Found:", invoices?.length || 0);
  console.log(invoices);
}

check();
