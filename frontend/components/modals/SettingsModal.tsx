'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import {
  LockIcon,
  ShieldIcon,
  SettingsIcon,
  UserIcon,
  XIcon,
} from '@/components/ui/Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      showToast('Display name cannot be empty', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.updateUser({ display_name: displayName.trim() });
      showToast('Profile updated successfully', 'success');
      setIsEditing(false);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to update profile';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    onClose();
    logout();
    showToast('Signed out successfully', 'info');
    window.location.href = '/login';
  };

  const handleCancelEdit = () => {
    setDisplayName(user?.display_name || '');
    setIsEditing(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col max-h-[85vh] select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/80">
          <h2 className="text-base font-bold text-gray-900">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close settings"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="p-5 bg-gray-50 border-b border-gray-200/80">
          <div className="flex items-center gap-4">
            <Avatar
              src={user?.avatar_url}
              alt={user?.display_name || 'My Profile'}
              size="lg"
              isOnline={true}
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-gray-900 truncate">
                {user?.display_name || 'Signal User'}
              </h3>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                {user?.phone || 'No phone set'}
              </p>
              {user?.email && (
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="p-3 divide-y divide-gray-100 overflow-y-auto">
          {/* Profile Section */}
          <div className="py-2">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200">
              <div className="p-2 rounded-lg bg-signal-blue text-white">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">Profile</p>
                <p className="text-xs text-gray-400">Display name, avatar</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs font-medium text-signal-blue hover:text-blue-600"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {isEditing && (
              <div className="px-3 py-2 space-y-2">
                <div>
                  <label htmlFor="display-name" className="block text-xs font-semibold text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-signal-blue focus:ring-2 focus:ring-signal-blue/20"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-signal-blue hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Placeholder Sections */}
          <div className="py-2">
            <button
              type="button"
              onClick={() => showToast('Privacy settings (Coming Soon)', 'info')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 text-left transition-colors"
            >
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <LockIcon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">Privacy & Security</p>
                <p className="text-xs text-gray-400">Screen lock, read receipts, disappearing messages</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => showToast('Notifications settings (Coming Soon)', 'info')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 text-left transition-colors"
            >
              <div className="p-2 rounded-lg bg-blue-50 text-signal-blue">
                <ShieldIcon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">Notifications</p>
                <p className="text-xs text-gray-400">Message sound, previews, badges</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => showToast('Appearance settings (Coming Soon)', 'info')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 text-left transition-colors"
            >
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <SettingsIcon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">Appearance</p>
                <p className="text-xs text-gray-400">Theme, message font scale</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => showToast('Linked Devices (Coming Soon)', 'info')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 text-left transition-colors"
            >
              <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                <ShieldIcon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">Linked Devices</p>
                <p className="text-xs text-gray-400">Desktop, tablet, linked devices</p>
              </div>
            </button>
          </div>

          <div className="pt-3 pb-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs transition-colors"
            >
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
