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
  userId: string | null; // Added for convenience
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
    // Initial check for session on page load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    
    // Set up a listener for any auth event (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // This separate effect handles all redirection logic
  useEffect(() => {
    if (loading) return; // Don't redirect until auth state is confirmed

    const isProtected = !publicPaths.includes(pathname);

    if (!user && isProtected) {
      router.push('/login'); // User is not logged in and on a protected page, send to login.
    } else if (user && (pathname === '/login' || pathname === '/register')) {
      router.push('/roadmap'); // User is logged in but on login/register page, send to roadmap.
    }
  }, [user, loading, pathname, router]);

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
      userId: user?.id ?? null, // Add userId for convenience
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