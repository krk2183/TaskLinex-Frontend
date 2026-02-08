"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  userId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId || storedUserId === 'undefined' || storedUserId === 'null') {
      // If there's no valid user ID, redirect them to the register page.
      router.push('/register');
    } else {
      setUserId(storedUserId);
    }
  }, [pathname, router]); // Rerun this check if the path changes

  // We can show a loading state here while the user ID is being verified.
  if (!userId) {
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