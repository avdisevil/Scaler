'use client';

import React, { useEffect, useRef } from 'react';
import { Message } from '@/types';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { LockIcon } from '@/components/ui/Icons';

interface MessageAreaProps {
  messages: Message[];
  currentUserId?: number;
  isGroup?: boolean;
  participants?: any[];
  isTyping?: boolean;
  typingUserName?: string;
  loading?: boolean;
}

export function MessageArea({
  messages,
  currentUserId,
  isGroup,
  participants = [],
  isTyping,
  typingUserName,
  loading = false,
}: MessageAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Sort messages by created_at to ensure chronological order
  const sortedMessages = [...messages].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#f6f7f9]">
        <div className="flex justify-center my-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-200/60 rounded-full text-gray-600 text-[11px] font-medium text-center max-w-sm select-none">
            <LockIcon className="w-3.5 h-3.5 shrink-0 text-gray-500" />
            <span>Messages are end-to-end encrypted.</span>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className={`w-48 h-12 rounded-2xl ${i % 2 === 0 ? 'bg-signal-blue/30' : 'bg-gray-200'} animate-pulse`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[#f6f7f9]">
      {/* Signal End-to-End Encryption Notice */}
      <div className="flex justify-center my-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-200/60 rounded-full text-gray-600 text-[11px] font-medium text-center max-w-sm select-none">
          <LockIcon className="w-3.5 h-3.5 shrink-0 text-gray-500" />
          <span>Messages are end-to-end encrypted.</span>
        </div>
      </div>

      {/* Empty State */}
      {sortedMessages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-signal-blue flex items-center justify-center mb-3">
            <LockIcon className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Start of conversation</h3>
          <p className="text-xs text-gray-500 max-w-[200px]">
            Your messages are end-to-end encrypted. Say hello!
          </p>
        </div>
      )}

      {/* Date Divider Pill */}
      {sortedMessages.length > 0 && (
        <div className="flex justify-center my-2">
          <span className="text-[11px] font-medium text-gray-400 bg-white/70 border border-gray-200/60 rounded-full px-2.5 py-0.5 select-none">
            Today
          </span>
        </div>
      )}

      {/* Message List */}
      {sortedMessages.map((message) => {
        const isSelf = message.sender_id === currentUserId;
        const participant = participants.find((p) => p.user_id === message.sender_id);
        const senderName = participant?.user?.display_name || participant?.user?.phone || `User #${message.sender_id}`;

        return (
          <MessageBubble
            key={message.id}
            message={message}
            isSelf={isSelf}
            senderName={senderName}
            isGroup={isGroup}
          />
        );
      })}

      {/* Typing Indicator Placeholder */}
      {isTyping && (
        <TypingIndicator userName={typingUserName} />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
