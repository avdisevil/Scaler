'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import {
  ComposeIcon,
  SettingsIcon,
  SearchIcon,
  LogOutIcon,
} from '@/components/ui/Icons';

interface SidebarHeaderProps {
  onNewMessageClick: () => void;
  onCreateGroupClick?: () => void;
  onSettingsClick: () => void;
  onSearchToggle?: () => void;
  isSearchActive?: boolean;
}

export function SidebarHeader({
  onNewMessageClick,
  onCreateGroupClick,
  onSettingsClick,
  onSearchToggle,
  isSearchActive,
}: SidebarHeaderProps) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
    showToast('Signed out successfully', 'info');
    router.push('/login');
  };

  return (
    <header className="h-16 px-4 border-b border-gray-200/80 bg-white flex items-center justify-between shrink-0 select-none relative z-20">
      <div className="flex items-center gap-3 relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="rounded-full ring-2 ring-transparent hover:ring-signal-blue/40 transition-all focus:outline-none focus:ring-signal-blue"
          title="Account Menu"
          aria-label="Account Menu"
          aria-expanded={isMenuOpen}
        >
          <Avatar
            src={user?.avatar_url}
            alt={user?.display_name || user?.phone || 'My Profile'}
            size="md"
            isOnline={true}
          />
        </button>

        <div>
          <h1 className="text-base font-bold text-gray-900 tracking-tight leading-none">
            Chats
          </h1>
          <span className="text-[11px] text-gray-400 font-normal">
            Signal Encrypted
          </span>
        </div>

        {/* PROFILE / USER MENU DROPDOWN */}
        {isMenuOpen && (
          <div className="absolute top-12 left-0 w-64 bg-white rounded-xl shadow-xl border border-gray-200/90 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* User Info Header */}
            <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center gap-3">
              <Avatar
                src={user?.avatar_url}
                alt={user?.display_name || 'User'}
                size="md"
                isOnline={true}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.display_name || 'Signal User'}
                </p>
                <p className="text-xs text-gray-500 font-mono truncate">
                  {user?.phone || 'No phone'}
                </p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onSettingsClick();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 text-left transition-colors"
              >
                <SettingsIcon className="w-4 h-4 text-gray-500" />
                <span>Settings</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 text-left transition-colors"
              >
                <LogOutIcon className="w-4 h-4 text-red-500" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {onSearchToggle && (
          <button
            type="button"
            onClick={onSearchToggle}
            className={`p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-signal-blue/50 ${
              isSearchActive ? 'bg-gray-100 text-signal-blue' : ''
            }`}
            title="Search chats"
            aria-label="Search chats"
          >
            <SearchIcon className="w-5 h-5" />
          </button>
        )}

        <button
          type="button"
          onClick={onNewMessageClick}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
          title="New message"
          aria-label="New Message"
        >
          <ComposeIcon className="w-5 h-5" />
        </button>

        {onCreateGroupClick && (
          <button
            type="button"
            onClick={onCreateGroupClick}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
            title="Create group"
            aria-label="Create Group"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={onSettingsClick}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
          title="Settings"
          aria-label="Settings"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
