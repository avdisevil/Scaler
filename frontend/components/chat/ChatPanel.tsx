'use client';

import React from 'react';
import { Conversation, Message } from '@/types';
import { ChatHeader } from './ChatHeader';
import { MessageArea } from './MessageArea';
import { MessageComposer } from './MessageComposer';
import { EmptyChatState } from './EmptyChatState';

interface ChatPanelProps {
  conversation: Conversation | null;
  messages: Message[];
  currentUserId?: number;
  onBack?: () => void;
  onSendMessage?: (content: string) => void;
  onNewChatClick?: () => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  onOpenGroupMembers?: () => void;
  participants?: any[];
  isTyping?: boolean;
  typingUserName?: string;
  loading?: boolean;
}

export function ChatPanel({
  conversation,
  messages,
  currentUserId,
  onBack,
  onSendMessage,
  onNewChatClick,
  onTypingStart,
  onTypingStop,
  onOpenGroupMembers,
  participants = [],
  isTyping = false,
  typingUserName,
  loading = false,
}: ChatPanelProps) {
  if (!conversation) {
    return <EmptyChatState onNewChatClick={onNewChatClick} />;
  }

  return (
    <section className="flex-1 flex flex-col h-full bg-[#f6f7f9] overflow-hidden">
      <ChatHeader
        conversation={conversation}
        onBack={onBack}
        onOpenGroupMembers={onOpenGroupMembers}
      />

      <MessageArea
        messages={messages}
        currentUserId={currentUserId}
        isGroup={conversation.is_group}
        participants={participants}
        isTyping={isTyping}
        typingUserName={typingUserName}
        loading={loading}
      />

      <MessageComposer
        onSendMessage={onSendMessage}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
      />
    </section>
  );
}
