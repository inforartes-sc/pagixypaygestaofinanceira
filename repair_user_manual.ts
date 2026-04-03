import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const email = 'negocionlinefree@gmail.com';
  const name = 'OLZENIS FERREIRA GOMES';
  const password = 'Pagixy@2026'; // Default password, or if they sent one.

  console.log(`--- REPAIRING: ${email} ---`);

  // 1. Resolve Company
  const { data: company } = await supabase.from('companies').select('id').limit(1).single();
  const companyId = company?.id;

  // 2. Auth User
  let userId: string | null = null;
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const existingUser = (usersData?.users || []).find(u => u.email === email);

  if (!existingUser) {
    console.log('Creating auth user...');
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    });
    if (authErr) {
       console.error('Error creating user:', authErr.message);
       // Check if it already exists despite the check
       if (authErr.message.includes('already registered')) {
         console.log('User already exists. Skipping create.');
       } else {
         return;
       }
    } else {
      userId = authData.user.id;
      console.log('User created:', userId);
    }
  } else {
    userId = existingUser.id;
    console.log('User found in list:', userId);
  }

  if (!userId) {
     const { data: usersDataAfter } = await supabase.auth.admin.listUsers();
     userId = (usersDataAfter?.users || []).find(u => u.email === email)?.id || null;
  }

  if (userId) {
    // 3. Link Client
    console.log('Linking client...');
    const { error: clientErr } = await supabase.from('clients')
      .update({ user_id: userId })
      .eq('email', email);
    if (clientErr) console.error('Client link error:', clientErr);
    else console.log('Client linked.');

    // 4. Create Profile
    console.log('Ensuring profile...');
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (!profile) {
      const { error: profileErr } = await supabase.from('profiles').insert({
        id: userId,
        company_id: companyId,
        full_name: name,
        role: 'client'
      });
      if (profileErr) console.error('Profile error:', profileErr);
      else console.log('Profile created.');
    } else {
      console.log('Profile exists.');
    }
  }
}

run();
