'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Conversation } from '@/types';
import { SidebarHeader } from './SidebarHeader';
import { ConversationList } from './ConversationList';
import { SearchIcon, XIcon } from '@/components/ui/Icons';
import { apiClient } from '@/lib/api';

interface SidebarProps {
  conversations: Conversation[];
  selectedId: number | null;
  onSelectConversation: (id: number) => void;
  onOpenNewMessage: () => void;
  onOpenCreateGroup?: () => void;
  onOpenSettings: () => void;
  loading?: boolean;
}

export function Sidebar({
  conversations,
  selectedId,
  onSelectConversation,
  onOpenNewMessage,
  onOpenCreateGroup,
  onOpenSettings,
  loading,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Conversation[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Request sequence counter to guarantee stale responses never overwrite newer results
  const searchSeqRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const executeSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const currentSeq = ++searchSeqRef.current;
    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await apiClient.getConversations(trimmed);
      // Discard stale responses if a newer keystroke has initiated a subsequent query
      if (currentSeq !== searchSeqRef.current) return;
      setSearchResults(results);
    } catch (err: any) {
      if (currentSeq !== searchSeqRef.current) return;
      setSearchError(err?.response?.data?.detail || err?.message || 'Search failed. Please try again.');
    } finally {
      if (currentSeq === searchSeqRef.current) {
        setIsSearching(false);
      }
    }
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setSearchQuery(nextVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!nextVal.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    // Debounce 300ms to prevent request on every keystroke
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(nextVal);
    }, 300);
  };

  const handleClearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchQuery('');
    setSearchResults(null);
    setIsSearching(false);
    setSearchError(null);
  };

  const handleRetrySearch = () => {
    executeSearch(searchQuery);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const displayedConversations = searchResults !== null ? searchResults : conversations;

  return (
    <aside className="w-full md:w-80 lg:w-[360px] h-full bg-white border-r border-gray-200/80 flex flex-col shrink-0 overflow-hidden select-none">
      {/* Sidebar Header with Profile Menu */}
      <SidebarHeader
        onNewMessageClick={onOpenNewMessage}
        onCreateGroupClick={onOpenCreateGroup}
        onSettingsClick={onOpenSettings}
      />

      {/* Debounced Search Bar */}
      <div className="px-3 pt-2.5 pb-2 bg-white">
        <div className="relative flex items-center">
          <SearchIcon className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search"
            className="w-full bg-[#f0f2f5] hover:bg-[#e9ebed] focus:bg-white text-gray-900 text-sm pl-9 pr-8 py-1.5 rounded-lg border border-transparent focus:border-signal-blue/50 focus:ring-2 focus:ring-signal-blue/20 outline-none transition-all placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
              aria-label="Clear search"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <ConversationList
        conversations={displayedConversations}
        selectedId={selectedId}
        onSelect={onSelectConversation}
        searchQuery={searchQuery}
        loading={loading}
        isSearching={isSearching}
        searchError={searchError}
        onRetrySearch={handleRetrySearch}
        onNewMessageClick={onOpenNewMessage}
      />
    </aside>
  );
}
