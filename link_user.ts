import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vdbdxfdjkycppdpbexri.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkYmR4ZmRqa3ljcHBkcGJleHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU3NTE5NywiZXhwIjoyMDkwMTUxMTk3fQ.J2Zw01rlm9leYLmvxoBeGyPsyJklqCBRUXalqaf__dk';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function linkUserMaster() {
  const userId = 'acbe25b7-111d-486c-85ac-a147ffd20ecc';
  const companyId = 'ab4841d3-bcce-4621-b2c8-bcb4630f6619';

  console.log(`Linking user ${userId} to company ${companyId}...`);
  
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      company_id: companyId,
      role: 'admin_master',
      full_name: 'Olzenis Gomes'
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error linking user:', error);
  } else {
    console.log('Linked successfully!');
  }
}

linkUserMaster();
