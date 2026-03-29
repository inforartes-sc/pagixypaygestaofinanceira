import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Use service role
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  const companyId = 'ab4841d3-bcce-4621-b2c8-bcb4630f6619';
  const adminId = 'f799026d-2fa0-4ca7-bc79-81267e...'; // I need the full ID
  
  // Actually, I'll just find the admin user ID by email first safely.
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const adminUser = users.find(u => u.email === 'inforartes.ap@gmail.com');
  const olzenisUser = users.find(u => u.email === 'olzenisgomes@gmail.com');

  if (adminUser) {
    console.log(`Fixing profile for ${adminUser.email}...`);
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: adminUser.id,
        company_id: companyId,
        full_name: 'InforArtes Admin',
        role: 'admin'
      });
    if (profileError) console.error("Error creating profile:", profileError);
    else console.log("Profile created successfully!");
  }

  // Ensure olzenisgomes is ALSO an admin if they desire
  if (olzenisUser) {
    console.log(`Updating role for ${olzenisUser.email}...`);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', olzenisUser.id);
    if (updateError) console.error("Error updating profile:", updateError);
    else console.log("Profile role updated to admin!");
  }
}

fix();
