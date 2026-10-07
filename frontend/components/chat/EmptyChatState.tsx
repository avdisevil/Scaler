'use client';

import React from 'react';
import { LockIcon, ComposeIcon } from '@/components/ui/Icons';

interface EmptyChatStateProps {
  onNewChatClick?: () => void;
}

export function EmptyChatState({ onNewChatClick }: EmptyChatStateProps) {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-6 bg-[#f7f8fa] text-center select-none">
      <div className="max-w-sm flex flex-col items-center">
        {/* Signal Lock / Secure Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-center text-signal-blue mb-4">
          <LockIcon className="w-8 h-8" />
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-1 tracking-tight">
          Signal Desktop
        </h2>

        <p className="text-xs text-gray-500 mb-5 leading-relaxed max-w-xs">
          End-to-end encrypted messaging. Select a conversation from the left to start chatting, or start a new message.
        </p>

        {onNewChatClick && (
          <button
            type="button"
            onClick={onNewChatClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-signal-blue hover:bg-blue-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
          >
            <ComposeIcon className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        )}

        <div className="mt-8 flex items-center gap-1.5 text-[11px] text-gray-400">
          <LockIcon className="w-3.5 h-3.5" />
          <span>Your messages are private & secure</span>
        </div>
      </div>
    </div>
  );
}
