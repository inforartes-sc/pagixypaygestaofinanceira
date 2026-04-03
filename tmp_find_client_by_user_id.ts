import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const ids = ["acbe25b7-111d-486c-85ac-a147ffd20ecc", "f799026d-2fa0-4ca7-bc79-81267e14b691"];
  const { data: clients, error } = await supabase.from('clients').select('*').in('user_id', ids);
  
  if (error) {
    fs.writeFileSync('clients_error.txt', error.message);
  } else {
    fs.writeFileSync('clients_match.json', JSON.stringify(clients, null, 2));
  }
}
run();
