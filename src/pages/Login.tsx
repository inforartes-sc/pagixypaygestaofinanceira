import React, { useState, useEffect } from 'react';
import { CreditCard, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import loginBg from '../assets/login_bg.png';
import { translateError } from '../lib/errorTranslator';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogoLoading, setIsLogoLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    if (user) return; // Router redirecionará
    
    const fetchLogoAndCheckDb = async () => {
      let retries = 3;
      let success = false;
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/['"]/g, '');
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.replace(/['"]/g, '');

      while (retries > 0) {
        try {
          console.log(`[Login] Verificando conexão via auth.getSession() (tentativa ${4 - retries}/3)...`);
          
          // Se o client do Supabase estiver com deadlock, vamos detectar e tentar destravar
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT')), 5000)
          );

          // Usa fetch direto para pegar a logo primeiro (ignora deadlocks do auth local)
          const fetchPromise = fetch(`${supabaseUrl}/rest/v1/companies?select=logo_url&limit=1`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          }).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          });

          const data = await Promise.race([fetchPromise, timeoutPromise]) as any;

          if (data && data.length > 0 && data[0].logo_url) {
            setCompanyLogo(data[0].logo_url);
          }
          
          setDbStatus('online');
          success = true;
          break;
        } catch (e: any) {
          console.warn(`[Login] Banco inacessível ou lento, tentando em 1s...`, e.message);
          if (e.message === 'TIMEOUT' && retries === 3) {
            console.warn('[Login] Possível deadlock de sessão. Limpando localStorage...');
            localStorage.clear(); // Limpa estado corrompido que pode estar travando o Supabase client
          }
          retries--;
          if (retries > 0) await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      if (!success) {
        setDbStatus('offline');
        console.error('[Login] Falha crítica de conexão após 3 tentativas.');
        toast.error('Banco de dados indisponível', {
          description: 'A comunicação com o servidor falhou. Verifique sua conexão.',
          duration: 10000
        });
      }
      setIsLogoLoading(false);
    };
    fetchLogoAndCheckDb();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (dbStatus === 'offline') {
      toast.error('Sistema Offline', { description: 'Aguarde a conexão com o banco ser restabelecida.' });
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('[Login] Iniciando tentativa de autenticação para:', email);
      
      const loginAttempt = async () => {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          console.error('[Login] Erro no signInWithPassword:', authError.message);
          throw authError;
        }

        if (!data?.user) throw new Error('Falha crítica: Usuário autenticado mas sem dados retornados.');

        console.log('[Login] Autenticação básica ok. Recuperando perfil...');

        // Sucesso na senha, agora buscar o perfil para saber para onde ir instantaneamente
        // Usa fetch para contornar qualquer deadlock pendente no cache do supabase
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/['"]/g, '');
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.replace(/['"]/g, '');
        const token = data.session.access_token;
        
        let profile = null;
        try {
          const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${data.user.id}&select=role`, {
            headers: {
              'apikey': supabaseKey as string,
              'Authorization': `Bearer ${token}`
            }
          });
          if (profileRes.ok) {
            const json = await profileRes.json();
            if (json && json.length > 0) profile = json[0];
          }
        } catch (e: any) {
           console.warn('[Login] fetch profile direto falhou:', e.message);
        }
        
        return { data, profile };
      };

      const deadlockTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('SUPABASE_DEADLOCK')), 10000));
      
      const { data, profile } = await Promise.race([loginAttempt(), deadlockTimeout]) as any;

      const role = profile?.role || 'admin';
      const destination = role === 'client' ? '/portal' : '/';

      toast.success('Login realizado com sucesso!');
      
      // Forçar navegação após um breve delay para o Toast ser visto
      setTimeout(() => {
        navigate(destination);
        // Fallback brusco se nada acontecer em 1.5s
        setTimeout(() => {
          if (window.location.pathname === '/login') {
            window.location.href = destination;
          }
        }, 1500);
      }, 500);

    } catch (err: any) {
      console.error('[Login] Erro fatal no login:', err);
      
      if (err.message === 'SUPABASE_DEADLOCK') {
        toast.error('Ocorreu um travamento no sistema de autenticação local. Limpando dados para correção rápida...', { duration: 5000 });
        localStorage.clear();
        setTimeout(() => window.location.reload(), 2000); // Reloading to apply clean state
        return;
      }
      
      const message = err.message === 'Failed to fetch' 
        ? 'Erro de rede: O banco de dados não respondeu.' 
        : (err.message || 'Erro ao realizar login. Verifique suas credenciais.');
      setError(message);
      toast.error('Falha na autenticação', { description: message });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-100">
      {/* Background Image - Strong presence */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 scale-105"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      {/* Dark overlay for better contrast with the white card */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />

      <div className="max-w-md w-full relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white/95 backdrop-blur-2xl p-10 rounded-[32px] border border-white/40 shadow-2xl shadow-slate-900/20">
          <div className="flex flex-col items-center mb-8">
            <div className="w-48 h-12 flex items-center justify-center mb-4">
              {isLogoLoading ? (
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : companyLogo ? (
                <img 
                  src={companyLogo} 
                  alt="Logo" 
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-2xl font-black text-indigo-600 tracking-tighter">FINFLOW</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Gestão Financeira Inteligente</p>
              {dbStatus === 'online' ? (
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" title="Conectado ao Database" />
              ) : dbStatus === 'offline' ? (
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" title="Sem conexão com Database" />
              ) : (
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" title="Verificando Conexão..." />
              )}
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Corporativo</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="email" 
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all disabled:opacity-50"
                  placeholder="exemplo@suaempresa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Senha</label>
                <a href="#" className="text-[11px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest">Esqueceu?</a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="password" 
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#003399] text-white rounded-2xl font-bold hover:bg-[#002266] hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5 transition-all shadow-md shadow-blue-100 disabled:opacity-70 disabled:translate-y-0"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Acessar Painel
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <footer className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
              &copy; 2026 PayGixy Platform &bull; Secure Access
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
