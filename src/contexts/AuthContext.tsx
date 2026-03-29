import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  company_id?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, email: string): Promise<AuthUser> => {
    let retries = 3;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/['"]/g, '');
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.replace(/['"]/g, '');
    
    while (retries > 0) {
      try {
        // Obter sessão atual diretamente do localStorage para não depender do client que pode estar travado
        let token = supabaseKey;
        try {
          // Fallback para pegar a sessão se existir, usando a mesma chave definida em supabase.ts
          const localStr = localStorage.getItem('saasfinflow-local-auth-token') || localStorage.getItem('sb-' + supabaseUrl?.split('//')[1].split('.')[0] + '-auth-token');
          if (localStr) {
            const parsed = JSON.parse(localStr);
            if (parsed?.access_token) token = parsed.access_token;
          }
        } catch(e) {}

        const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`, {
          headers: {
            'apikey': supabaseKey as string,
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const json = await res.json();
        const data = json && json.length > 0 ? json[0] : null;

        if (data) {
          return {
            id: userId,
            email,
            role: (data.role || 'admin') as UserRole,
            company_id: data.company_id
          };
        } else {
           console.warn(`[Auth] Perfil não encontrado para ${userId}`);
           if (retries === 1) return { id: userId, email, role: 'admin' as UserRole };
        }
      } catch (err) {
        console.warn(`[Auth] Erro inesperado na busca de perfil (${4 - retries}/3):`, err);
      }
      retries--;
      if (retries > 0) await new Promise(r => setTimeout(r, 800)); // Espera curta antes de tentar de novo
    }
    return { id: userId, email, role: 'admin' as UserRole }; // Fallback final
  }, []);

  useEffect(() => {
    let active = true;

    // Detectar sessão explicitamente através de onAuthStateChange: 
    // Em supabase-js v2, onAuthStateChange dispara o evento INITIAL_SESSION logo na montagem, descartando a necessidade de chamada paralela que causa deadlocks de lock (storage)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      console.log(`[Auth] Stable state detected: ${event}`);
      
      if (!active) return;

      setSession(s);
      
      if (s) {
        const profile = await fetchProfile(s.user.id, s.user.email!);
        if (active) {
          setUser(profile);
          setLoading(false);
        }
      } else {
        if (active) {
          console.log('[Auth] Sessão encerrada ou não encontrada em onAuthStateChange.');
          setUser(null);
          setLoading(false);
        }
      }
    });

    // Fail-safe de 10 segundos para conexões lentas ou pausadas
    const timer = setTimeout(() => {
      if (active && loading) {
        console.warn('[Auth] Time-out atingido. Liberando tela inicial por segurança.');
        setLoading(false);
      }
    }, 10000);

    return () => {
      active = false;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [fetchProfile]);

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (session) {
      const profile = await fetchProfile(session.user.id, session.user.email!);
      setUser(profile);
    }
  };

  const value = React.useMemo(() => ({
    user,
    session,
    loading,
    signOut,
    refreshUser
  }), [user, session, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
