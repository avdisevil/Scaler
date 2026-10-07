'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ProfileSetupPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, completeProfile, isAuthenticated, requiresProfileSetup, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const presetAvatars = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=Alice',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Bob',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Charlie',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Diana',
    'https://api.dicebear.com/7.x/bottts/svg?seed=SignalUser',
  ];

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!requiresProfileSetup) {
        router.push('/conversations');
      }
    }
  }, [isAuthenticated, requiresProfileSetup, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      showToast('User session not found. Please log in again.', 'error');
      return;
    }

    setLoading(true);

    try {
      await completeProfile(user.id, displayName, email || undefined, avatarUrl || undefined);
      showToast('Profile setup complete!', 'success');
      router.push('/conversations');
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to complete profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Complete Your Profile</h1>
        <p className="text-gray-600 text-center mb-6">
          Let&apos;s set up your profile to get started
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Display Name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="John Doe"
            required
            minLength={2}
          />

          <Input
            label="Email (Optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Choose an Avatar (Optional)
            </label>
            <div className="flex gap-2 mb-3 justify-center">
              {presetAvatars.map((preset, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => setAvatarUrl(preset)}
                  className={`w-10 h-10 rounded-full border-2 overflow-hidden transition-all ${
                    avatarUrl === preset ? 'border-signal-blue scale-110' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preset} alt={`Preset ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <Input
              label="Or Custom Avatar URL"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : 'Complete Setup'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
