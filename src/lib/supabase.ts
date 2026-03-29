import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/['"]/g, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/['"]/g, '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Credenciais ausentes. Verifique o arquivo .env');
} else {
  console.log('[Supabase] Initializing client with project URL:', supabaseUrl.slice(0, 15) + '...');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'saasfinflow-local-auth' // Evita conflitos com outros projetos rodando no localhost:3000 que corrompem a sessão
  }
});
