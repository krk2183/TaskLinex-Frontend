"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  userId: string | null;
}

const publicPaths = ['/register', '/login', '/'];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    
    const storedUserId = localStorage.getItem('userId');
    
    if (!storedUserId) {
      // If not logged in and trying to access a protected route, redirect to login
      if (!publicPaths.includes(pathname)) {
        router.push('/register'); // Or /login if you have a dedicated route, but keeping register as fallback based on file structure
      }
    } else {
      setUserId(storedUserId);
      // Optional: Redirect to roadmap if already logged in and on a public auth page
      if (publicPaths.includes(pathname) && pathname !== '/') {
        router.push('/roadmap');
      }
    }
  }, [pathname, router]); // Rerun this check if the path changes

  // We can show a loading state here while the user ID is being verified.
  if (!userId && !publicPaths.includes(pathname)) {
    return null; // Or a loading spinner
  }

  return <AuthContext.Provider value={{ userId }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};