'use client';

import { useAuth } from '@/lib/auth-provider';
import { redirect } from 'next/navigation';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex justify-center items-center">
        {/* You can add a proper loader here */}
        <p>Loading...</p>
      </div>
    );
  }

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }

  return null;
}
