'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const { requestOtp, verifyOtp, requiresProfileSetup } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await requestOtp(phone);
      setOtpSent(true);
      setIsNewUser(!response.exists);
      showToast(`OTP sent: ${response.otp}`, 'info');
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to send OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await verifyOtp(phone, otp);
      showToast('OTP verified successfully', 'success');

      // Redirect based on user state directly from response
      if (response.requires_profile_setup) {
        router.push('/profile-setup');
      } else {
        router.push('/conversations');
      }
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Invalid OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          {otpSent ? 'Enter OTP' : 'Sign In'}
        </h1>

        {!otpSent ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <Input
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : 'Send OTP'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                {isNewUser
                  ? 'New user detected. Please verify your phone number to continue.'
                  : 'Welcome back! Please verify your phone number to continue.'}
              </p>
            </div>

            <Input
              label="OTP Code"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              required
            />
            <p className="text-xs text-gray-500 text-center">
              Development OTP: 123456
            </p>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : 'Verify OTP'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => setOtpSent(false)}
            >
              Back
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
