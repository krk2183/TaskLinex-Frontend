"use client";

import React from 'react';
import { AuthProvider } from '../(auth)/register/AuthContext';
import SideBar from '../../components/SideBar';
import { LayoutProvider } from '../../components/LayoutContext';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutProvider>
      <AuthProvider>
        <div className="flex h-screen bg-slate-50 dark:bg-[#0B1120]">
          <SideBar />
          <main className="flex-1 flex flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </AuthProvider>
    </LayoutProvider>
  );
}