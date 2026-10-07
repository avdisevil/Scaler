'use client';

import React from 'react';
import { Message } from '@/types';
import { CheckIcon, CheckCheckIcon } from '@/components/ui/Icons';

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  senderName?: string;
  isGroup?: boolean;
}

export function MessageBubble({
  message,
  isSelf,
  senderName,
  isGroup,
}: MessageBubbleProps) {
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderStatus = () => {
    if (!isSelf) return null;
    switch (message.status) {
      case 'sending':
        return <span className="text-[10px] text-blue-200">⋯</span>;
      case 'sent':
        return <CheckIcon className="w-3 h-3 text-blue-200" />;
      case 'delivered':
        return <CheckCheckIcon className="w-3 h-3 text-blue-200" isRead={false} />;
      case 'read':
        return <CheckCheckIcon className="w-3.5 h-3.5 text-white font-bold" isRead={true} />;
      default:
        return <CheckIcon className="w-3 h-3 text-blue-200" />;
    }
  };

  return (
    <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} mb-2`}>
      {/* Sender name for group chats on incoming messages */}
      {!isSelf && isGroup && senderName && (
        <span className="text-[11px] font-semibold text-gray-500 mb-0.5 ml-2">
          {senderName}
        </span>
      )}

      <div
        className={`relative max-w-[82%] sm:max-w-[70%] md:max-w-[62%] px-3.5 py-2 text-sm leading-relaxed shadow-2xs select-text ${
          isSelf
            ? 'bg-signal-blue text-white rounded-2xl rounded-br-xs'
            : 'bg-white text-gray-900 border border-gray-200/75 rounded-2xl rounded-bl-xs'
        }`}
      >
        <p className="whitespace-pre-wrap break-words pr-2">{message.content}</p>

        <div
          className={`flex items-center justify-end gap-1 mt-0.5 select-none ${
            isSelf ? 'text-blue-100' : 'text-gray-400'
          }`}
        >
          <span className="text-[10px]">
            {formatTime(message.created_at)}
          </span>
          {renderStatus()}
        </div>
      </div>
    </div>
  );
}
