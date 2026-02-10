"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient, Session, User } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);

interface AuthContextType {
  user: User | null;
  jwt: string | null;
  login: (email: string, password: string) => Promise<any>;
  signup: (email: string, password: string, options?: any) => Promise<any>;
  logout: () => Promise<void>;
  loading: boolean;
}

const publicPaths = ['/register', '/login', '/'];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const setData = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) console.error('Error getting session:', error);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        console.log("Supabase JWT:", session.access_token);
      }
      setLoading(false);
      
      if (session) {
         if (publicPaths.includes(pathname) && pathname !== '/') {
             router.push('/roadmap');
         }
      } else {
         if (!publicPaths.includes(pathname)) {
             router.push('/register');
         }
      }
    });

    setData();

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signup = async (email: string, password: string, options?: any) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password, 
      options 
    });
    if (error) {
      console.error("Supabase Signup Error:", error);
      throw error;
    }
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    router.push('/register');
  };

  if (loading && !publicPaths.includes(pathname)) {
    return null; 
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      jwt: session?.access_token ?? null, 
      login, 
      signup, 
      logout, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};