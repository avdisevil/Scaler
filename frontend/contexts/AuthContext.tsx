'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { User, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresProfileSetup, setRequiresProfileSetup] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
      setRequiresProfileSetup(!userData.registration_complete);
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async (phone: string) => {
    const response = await apiClient.requestOtp(phone);
    return response;
  };

  const verifyOtp = async (phone: string, otp_code: string) => {
    const response = await apiClient.verifyOtp(phone, otp_code);
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    setToken(response.access_token);
    setRequiresProfileSetup(response.requires_profile_setup);

    await fetchCurrentUser();
    return response;
  };

  const completeProfile = async (userId: number, displayName: string, email?: string, avatarUrl?: string) => {
    const response = await apiClient.completeProfile(userId, displayName, email, avatarUrl);
    setRequiresProfileSetup(false);
    await fetchCurrentUser();
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setToken(null);
      setUser(null);
      setRequiresProfileSetup(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    requestOtp,
    verifyOtp,
    completeProfile,
    logout,
    isAuthenticated: !!user,
    loading,
    requiresProfileSetup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
