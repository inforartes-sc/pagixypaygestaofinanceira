import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function setup() {
  console.log('Criando bucket "logos"...');
  const { data, error } = await supabase.storage.createBucket('logos', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
    fileSizeLimit: 1048576 * 5 // 5MB
  });

  if (error) {
    if (error.message.includes('already exists')) {
     console.log('Bucket já existe.');
    } else {
      console.error('Erro ao criar bucket:', error);
      process.exit(1);
    }
  } else {
    console.log('Bucket "logos" criado com sucesso!');
  }
}

setup();
