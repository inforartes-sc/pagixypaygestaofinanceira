import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Use service role
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
  console.log("Users List:");
  users?.forEach(u => {
    console.log(`- Email: ${u.email}, ID: ${u.id}, Created At: ${u.created_at}`);
  });
  console.log("Error:", error);
}

check();
