import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase.from('invoices').select('*').limit(1);
  if (error) {
    console.error('Error fetching invoices:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columns in invoices table:', Object.keys(data[0]));
  } else {
    // Try to get a list of columns by inserting a dummy/failing object?
    // Or just try to select description explicitly
    const { data: descData, error: descError } = await supabase.from('invoices').select('description').limit(1);
    if (descError && descError.code === 'PGRST204') {
        console.log('Column "description" does NOT exist.');
    } else if (descError) {
        console.log('Error selecting description column:', descError);
    } else {
        console.log('Column "description" exists.');
    }
  }
}

checkColumns();
