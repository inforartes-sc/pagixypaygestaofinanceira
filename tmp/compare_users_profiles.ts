import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Use service role
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const { data: profiles } = await supabase.from('profiles').select('*');
    
  console.log("=== Users list ===");
  users.forEach(u => console.log(`ID: ${u.id}, Email: ${u.email}`));
  
  console.log("\n=== Profiles list ===");
  profiles?.forEach(p => console.log(`ID: ${p.id}, Role: ${p.role}, Company: ${p.company_id}`));
}

check();
