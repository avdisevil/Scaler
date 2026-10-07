'use client';

import React from 'react';
import { Conversation } from '@/types';
import { ConversationItem } from './ConversationItem';
import { ComposeIcon, SearchIcon } from '@/components/ui/Icons';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  searchQuery: string;
  loading?: boolean;
  isSearching?: boolean;
  searchError?: string | null;
  onRetrySearch?: () => void;
  onNewMessageClick: () => void;
}

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3 border-b border-gray-100/60 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="w-24 h-4 bg-gray-200 rounded" />
          <div className="w-10 h-3 bg-gray-100 rounded" />
        </div>
        <div className="w-36 h-3 bg-gray-100 rounded mt-2" />
      </div>
    </div>
  );
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  searchQuery,
  loading,
  isSearching,
  searchError,
  onRetrySearch,
  onNewMessageClick,
}: ConversationListProps) {
  // Initial loading state skeleton
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        <ConversationSkeleton />
        <ConversationSkeleton />
        <ConversationSkeleton />
        <ConversationSkeleton />
      </div>
    );
  }

  // Active search flight indicator
  if (isSearching) {
    return (
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50 opacity-70">
        <ConversationSkeleton />
        <ConversationSkeleton />
      </div>
    );
  }

  // Search error state
  if (searchError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-xs text-red-600 font-medium mb-2">{searchError}</p>
        {onRetrySearch && (
          <button
            type="button"
            onClick={onRetrySearch}
            className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Retry Search
          </button>
        )}
      </div>
    );
  }

  // Empty state when user has no conversations yet
  if (conversations.length === 0 && !searchQuery.trim()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-signal-blue flex items-center justify-center mb-3">
          <ComposeIcon className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">No chats yet</h3>
        <p className="text-xs text-gray-500 mb-4 max-w-[200px]">
          Start a secure conversation with your contacts
        </p>
        <button
          type="button"
          onClick={onNewMessageClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-signal-blue text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors shadow-xs"
        >
          <ComposeIcon className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>
      </div>
    );
  }

  // Empty state when search query returns no matches
  if (conversations.length === 0 && searchQuery.trim()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400">
        <SearchIcon className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm font-medium text-gray-600">No results found</p>
        <p className="text-xs text-gray-400 mt-0.5">
          No chats matching &quot;{searchQuery}&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-1 space-y-0.5">
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
