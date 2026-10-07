'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AppShell } from '@/components/layout/AppShell';

export default function ConversationDetailPage() {
  const { isAuthenticated, loading, requiresProfileSetup } = useAuth();
  const router = useRouter();
  const params = useParams();
  const conversationId = params?.id ? parseInt(params.id as string, 10) : null;

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (requiresProfileSetup) {
        router.push('/profile-setup');
      }
    }
  }, [isAuthenticated, loading, requiresProfileSetup, router]);

  if (loading || !isAuthenticated || requiresProfileSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f7f9]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <AppShell initialConversationId={conversationId} />;
}
