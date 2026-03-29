import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Use service role
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: { users } } = await supabase.auth.admin.listUsers();
  
  users.forEach(u => {
    console.log(`- ${u.email}: ${u.id}`);
  });
}

check();
