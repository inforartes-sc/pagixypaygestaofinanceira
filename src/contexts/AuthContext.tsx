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
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    
    // Pegar a chave local configurada em supabase.ts
    const localKey = 'saasfinflow-local-auth';

    while (retries > 0) {
      try {
        let token = supabaseKey;
        try {
          const localStr = localStorage.getItem(localKey);
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
           console.warn(`[Auth] Perfil não encontrado no banco para ${userId}`);
           if (retries === 1) break;
        }
      } catch (err) {
        console.warn(`[Auth] Falha no fetch manual de perfil (${4 - retries}/3):`, err);
      }
      retries--;
      if (retries > 0) await new Promise(r => setTimeout(r, 800));
    }
    
    return { id: userId, email, role: 'admin' as UserRole }; 
  }, []);

  useEffect(() => {
    let active = true;

    // Detectar sessão explicitamente através de onAuthStateChange: 
    // Em supabase-js v2, onAuthStateChange dispara o evento INITIAL_SESSION logo na montagem, descartando a necessidade de chamada paralela que causa deadlocks de lock (storage)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!active) return;
      
      console.log(`[Auth] Stable state detected: ${event}`);
      setSession(s);
      
      if (s) {
        // Se já temos o user e o ID é o mesmo, não precisamos buscar de novo
        if (user && user.id === s.user.id) {
           setLoading(false);
           return;
        }

        const profileData = await fetchProfile(s.user.id, s.user.email!);
        if (active) {
          setUser(profileData);
          setLoading(false);
        }
      } else {
        if (active) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    // Fail-safe de 15 segundos para conexões lentas ou pausadas
    const timer = setTimeout(() => {
      if (active && loading) {
        console.warn('[Auth] Time-out atingido. Otimizando estado atual.');
        setLoading(false);
      }
    }, 15000);

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
