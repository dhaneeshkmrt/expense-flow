
'use client';

import { AppShell } from '@/components/app-shell';
import { useApp } from '@/lib/provider';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

// This layout will apply to all pages that need authentication
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loadingAuth } = useApp();

  useEffect(() => {
    if (!loadingAuth && !user) {
      redirect('/login');
    }
  }, [user, loadingAuth]);

  if (loadingAuth || !user) {
    // You can add a loading spinner here
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
