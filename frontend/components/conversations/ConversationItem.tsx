'use client';

import React from 'react';
import { Conversation } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { UsersIcon, CheckCheckIcon } from '@/components/ui/Icons';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: number) => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
}: ConversationItemProps) {
  const displayName = conversation.name || (conversation.is_group ? 'Group Chat' : 'Direct Message');
  
  // Format timestamp (e.g. "10:45 AM", "Yesterday", or "Oct 6")
  const formatTimestamp = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch {
      return '';
    }
  };

  const timestamp = formatTimestamp(conversation.latest_message_time || conversation.updated_at);
  const unreadCount = conversation.unread_count || 0;

  return (
    <div
      onClick={() => onSelect(conversation.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(conversation.id);
        }
      }}
      className={`group relative flex items-center gap-3 px-3 py-3 mx-2 my-0.5 rounded-xl cursor-pointer transition-colors duration-150 outline-none focus:ring-2 focus:ring-signal-blue/50 ${
        isActive
          ? 'bg-[#e7ebee] text-gray-900 font-medium'
          : 'hover:bg-gray-100 text-gray-700'
      }`}
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

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span
            className={`text-sm truncate ${
              unreadCount > 0 ? 'font-semibold text-gray-900' : isActive ? 'font-semibold text-gray-900' : 'font-medium text-gray-800'
            }`}
          >
            {displayName}
          </span>
          {timestamp && (
            <span
              className={`text-xs shrink-0 ${
                unreadCount > 0 ? 'text-signal-blue font-semibold' : 'text-gray-400'
              }`}
            >
              {timestamp}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-xs truncate ${
              unreadCount > 0
                ? 'font-medium text-gray-900'
                : 'text-gray-500'
            }`}
          >
            {conversation.last_message || 'Tap to start conversation'}
          </p>

          {unreadCount > 0 && (
            <span className="shrink-0 bg-signal-blue text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
