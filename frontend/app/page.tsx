'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Home() {
  const { isAuthenticated, loading, requiresProfileSetup } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        if (requiresProfileSetup) {
          router.push('/profile-setup');
        } else {
          router.push('/conversations');
        }
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, loading, requiresProfileSetup, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
