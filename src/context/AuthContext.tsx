import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../services/supabase/client';
import { 
  getCurrentUser, 
  signInUser, 
  registerUser, 
  signOutUser,
  isAuthenticated,
  type LocalUser 
} from '../services/auth/localAuth';
import { getServerUrl } from '../services/sync/syncService';

type AuthContextValue = {
  // Supabase session (if using Supabase)
  session: Session | null;
  // Local user (if using local auth)
  localUser: LocalUser | null;
  isLoading: boolean;
  // Check if server is configured (requires auth)
  requiresAuth: boolean;
  // Check if user is authenticated (either Supabase or local)
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [localUser, setLocalUser] = useState<LocalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresAuth, setRequiresAuth] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Check if server is configured (requires auth)
      const serverUrl = getServerUrl();
      const hasServer = !!serverUrl;
      setRequiresAuth(hasServer);

      // Initialize Supabase auth if configured
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          setSession(data.session ?? null);
        }

        const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (mounted) {
            setSession(nextSession);
          }
        });

        if (mounted) {
          setIsLoading(false);
        }

        return () => {
          sub.subscription.unsubscribe();
        };
      } else {
        // Initialize local auth
        const user = await getCurrentUser();
        if (mounted) {
          setLocalUser(user);
          setIsLoading(false);
        }
      }
    };

    const cleanupPromise = init();
    return () => {
      mounted = false;
      void cleanupPromise;
    };
  }, []);

  const isAuthenticated = !!session || !!localUser;

  const signIn = async (email: string, password: string) => {
    if (isSupabaseConfigured && supabase) {
      // Use Supabase auth
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        setSession(data.session);
      }
    } else {
      // Use local auth
      const user = await signInUser(email, password);
      setLocalUser(user);
    }
  };

  const signUp = async (email: string, password: string) => {
    if (isSupabaseConfigured && supabase) {
      // Use Supabase auth
      const { error, data } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        setSession(data.session);
      }
    } else {
      // Use local auth
      const user = await registerUser(email, password);
      setLocalUser(user);
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
    } else {
      await signOutUser();
      setLocalUser(null);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      localUser,
      isLoading,
      requiresAuth,
      isAuthenticated,
      signIn,
      signUp,
      signOut,
    }),
    [session, localUser, isLoading, requiresAuth, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

