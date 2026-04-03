import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const email = 'negocionlinefree@gmail.com';
  console.log(`--- CHECKING STATUS FOR: ${email} ---`);

  // 1. Check Auth
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
  const authUser = (users || []).find(u => u.email === email);
  if (authErr) console.error('Auth Error:', authErr);
  if (authUser) {
    console.log(`✅ Auth User found: ID ${authUser.id}`);
    console.log(`   Last Sign In: ${authUser.last_sign_in_at}`);
  } else {
    console.log('❌ Auth User NOT found.');
  }

  // 2. Check Profiles
  const { data: profile, error: pErr } = await supabase.from('profiles').select('*').eq('id', authUser?.id || '').maybeSingle();
  if (pErr) console.error('Profile Error:', pErr);
  if (profile) {
    console.log(`✅ Profile found: ID ${profile.id}, Role: ${profile.role}, Company ID: ${profile.company_id}`);
  } else {
    // Try searching profiles by email if id didn't work (though they should be linked by ID)
    const { data: profileByEmail } = await supabase.from('profiles').select('*').limit(1); // Profiles table might not even have email?
    console.log('❌ Profile NOT found by Auth ID.');
  }

  // 3. Check Clients
  const { data: client, error: cErr } = await supabase.from('clients').select('*').eq('email', email).maybeSingle();
  if (cErr) console.error('Client Error:', cErr);
  if (client) {
    console.log(`✅ Client record found: ID ${client.id}, User ID: ${client.user_id}, Name: ${client.name}`);
  } else {
    console.log('❌ Client record NOT found.');
  }

  // 4. List all users for context
  console.log('--- ALL USERS IN DB ---');
  (users || []).forEach(u => console.log(`- ${u.email} (${u.id})`));
}

run();
