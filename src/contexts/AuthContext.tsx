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
    try {
      // Usar o client oficial simplificadamente para evitar erros de token manual
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        return {
          id: userId,
          email,
          role: (data.role || 'admin') as UserRole,
          company_id: data.company_id
        };
      }
      
      if (error) {
        console.warn(`[Auth] Perfil não carregado via client:`, error.message);
      }
    } catch (err) {
      console.warn(`[Auth] Erro inesperado ao buscar perfil:`, err);
    }
    
    // Fallback de segurança para não travar o login, mas sem company_id por padrão
    return { id: userId, email, role: 'admin' as UserRole }; 
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
