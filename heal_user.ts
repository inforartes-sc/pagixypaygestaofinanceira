import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const email = 'negocionlinefree@gmail.com';
  console.log(`--- DEBUGGING: ${email} ---`);

  // 1. Get Auth User
  const { data: usersData, error: authErr } = await supabase.auth.admin.listUsers();
  // Check all users just in case
  const allUsers = usersData?.users || [];
  const authUser = allUsers.find(u => u.email === email);
  
  if (authUser) {
    console.log(`✅ Auth User found in list: ID ${authUser.id}`);
  } else {
    console.log('❌ NOT in listUsers results. Trying specific fetch...');
    // Supabase JS doesn't have getUserByEmail in admin auth easily available in all versions, 
    // but we can try to filter listUsers if it supports filters or just trust the list if it's small.
    // However, the best way in admin.listUsers is pagination or specific check.
  }

  // Find client record
  const { data: client } = await supabase.from('clients').select('*').eq('email', email).maybeSingle();
  if (client) {
    console.log(`✅ Client ID: ${client.id}, user_id: ${client.user_id}`);
    if (authUser && !client.user_id) {
       console.log('⚠️ Client is missing user_id! Linking now...');
       const { error: updateErr } = await supabase.from('clients').update({ user_id: authUser.id }).eq('id', client.id);
       if (updateErr) console.error('Update ERROR:', updateErr);
       else console.log('✅ Client linked successfully.');
    }
  }

  // Ensure Profile exists
  if (authUser) {
     const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
     if (!profile) {
        console.log('⚠️ Profile missing! Creating...');
        const { data: company } = await supabase.from('companies').select('id').limit(1).single();
        const { error: profileErr } = await supabase.from('profiles').insert({
          id: authUser.id,
          company_id: company?.id,
          full_name: client?.name || 'User',
          role: 'client'
        });
        if (profileErr) console.error('Profile create ERROR:', profileErr);
        else console.log('✅ Profile created successfully.');
     } else {
        console.log('✅ Profile exists.');
     }
  }
}

run();
