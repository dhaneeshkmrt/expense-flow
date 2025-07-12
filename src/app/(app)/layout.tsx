'use client';

import { useAuth } from '@/lib/auth-provider';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="ml-4 h-8 w-32" />
      </div>
    );
  }

  if (!user) {
    redirect('/login');
  }

  return <AppShell>{children}</AppShell>;
}
