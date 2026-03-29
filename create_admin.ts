import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vdbdxfdjkycppdpbexri.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkYmR4ZmRqa3ljcHBkcGJleHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU3NTE5NywiZXhwIjoyMDkwMTUxMTk3fQ.J2Zw01rlm9leYLmvxoBeGyPsyJklqCBRUXalqaf__dk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const email = 'olzenisgomes@gmail.com';
  const password = 'admin123';

  console.log(`Checking if user ${email} exists...`);
  
  // Try to create the user
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (userError) {
    if (userError.message.includes('already registered')) {
      console.log('User already registered. Updating role...');
      // Get user ID
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;
      
      const existingUser = usersData.users.find(u => u.email === email);
      if (existingUser) {
        await updateProfile(existingUser.id);
      }
    } else {
      console.error('Error creating user:', userError);
    }
  } else {
    console.log('User created successfully:', userData.user?.id);
    if (userData.user) {
      await updateProfile(userData.user.id);
    }
  }
}

async function updateProfile(userId: string) {
  console.log(`Updating profile for user ${userId}...`);
  
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      role: 'admin_master',
      full_name: 'Admin Master'
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error updating profile:', error);
  } else {
    console.log('Profile updated successfully to admin_master!');
  }
}

createAdmin();
