import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
  const { data, error } = await supabase.from('notifications').select('reference_id').limit(1);
  if (error) {
    if (error.code === 'PGRST204' || error.message.includes('column "reference_id" does not exist')) {
      console.log('COLUMN_MISSING');
    } else {
      console.error('ERROR:', error);
    }
  } else {
    console.log('COLUMN_EXISTS');
  }
}
check();
