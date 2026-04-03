import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from('clients').select().limit(1);
  if (data && data.length > 0) {
    console.log("Client columns:", Object.keys(data[0]));
  } else {
      console.log("No client found or error:", error);
  }
}

checkColumns();
