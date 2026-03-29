import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function setupPolicies() {
  console.log('Tentando configurar políticas de storage...');
  
  // Como o storage é gerenciado pelo schema 'storage', podemos rodar SQL raw via RPC se o projeto tiver habilitado,
  // mas o melhor é usar o comando direto se o Supabase permitir.
  // Como não tenho psql funcional, vou tentar pelo menos logar e ver se o bucket está público.
  
  const { data: bucket, error } = await supabase.storage.getBucket('logos');
  if (error) {
    console.error('Erro ao buscar bucket:', error);
    return;
  }
  
  console.log('Bucket "logos" configurado:', bucket);
  
  // Infelizmente o SDK do Supabase JS não permite criar políticas de Storage diretamente.
  // Vou instruir o usuário no resumo caso o upload falhe com 'Permission Denied'.
  // Contudo, se ele for um 'admin', o ANON key dele autenticado pode ter permissão dependendo do padrão do Supabase.
}

setupPolicies();
