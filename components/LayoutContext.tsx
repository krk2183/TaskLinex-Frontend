"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface LayoutContextType {
  isExpanded: boolean;
  toggleSidebar: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Load dark mode preference from localStorage on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      const isDark = savedDarkMode === 'true';
      setIsDarkMode(isDark);
      // Apply dark mode class to document
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);
  
  const toggleSidebar = () => {
    setIsExpanded(prev => !prev);
  };
  
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      // Save to localStorage
      localStorage.setItem('darkMode', String(newValue));
      // Apply dark mode class to document
      if (newValue) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return newValue;
    });
  };
  
  const value = { 
    isExpanded, 
    toggleSidebar,
    isDarkMode,
    toggleDarkMode
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
