'use client';

import React from 'react';
import { Conversation } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import {
  ArrowLeftIcon,
  SearchIcon,
  MoreVerticalIcon,
  UsersIcon,
} from '@/components/ui/Icons';

interface ChatHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
  onInfoClick?: () => void;
  onOpenGroupMembers?: () => void;
}

export function ChatHeader({ conversation, onBack, onInfoClick, onOpenGroupMembers }: ChatHeaderProps) {
  const displayName = conversation.name || (conversation.is_group ? 'Group Chat' : 'Direct Message');

  const formatLastSeen = (value?: string | null) => {
    if (!value) return 'Offline';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return 'Offline';
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Last seen just now';
      if (diffMins < 60) return `Last seen ${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Last seen ${diffHours}h ago`;
      return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    } catch {
      return 'Offline';
    }
  };

  const subtitle = conversation.is_group
    ? 'Group Chat'
    : conversation.is_online
    ? 'Online'
    : formatLastSeen(conversation.last_seen_at);

  return (
    <header className="h-16 px-4 bg-white border-b border-gray-200/80 flex items-center justify-between z-10 shrink-0 select-none">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-signal-blue/40"
            aria-label="Back to conversations"
            title="Back"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        )}

        <button
          type="button"
          onClick={conversation.is_group ? onOpenGroupMembers : onInfoClick}
          className="flex items-center gap-3 text-left min-w-0 group focus:outline-none focus:ring-2 focus:ring-signal-blue/40 rounded-lg px-2 py-1 -mx-2 hover:bg-gray-50 transition-colors"
          aria-label={conversation.is_group ? 'View group members' : 'View conversation info'}
        >
          <div className="relative shrink-0">
            <Avatar
              src={conversation.avatar_url}
              alt={displayName}
              size="md"
              isOnline={!conversation.is_group && conversation.is_online}
            />
            {conversation.is_group && (
              <span className="absolute -bottom-1 -right-1 bg-gray-200 text-gray-600 rounded-full p-0.5 border border-white">
                <UsersIcon className="w-3 h-3" />
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate leading-tight group-hover:text-signal-blue transition-colors">
              {displayName}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              {!conversation.is_group && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    conversation.is_online ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                  aria-hidden="true"
                />
              )}
              <span className="text-xs text-gray-500 truncate leading-none">
                {subtitle}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-signal-blue/40"
          title="Search conversation"
          aria-label="Search conversation"
        >
          <SearchIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onInfoClick}
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-signal-blue/40"
          title="More options"
          aria-label="More options"
        >
          <MoreVerticalIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
