'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SendIcon } from '@/components/ui/Icons';

interface MessageComposerProps {
  onSendMessage?: (content: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
}

export function MessageComposer({ onSendMessage, onTypingStart, onTypingStop, disabled }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || disabled) return;

    if (onSendMessage) {
      onSendMessage(content.trim());
    }
    setContent('');

    if (onTypingStop) {
      onTypingStop();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (newContent.trim() && onTypingStart) {
      onTypingStart();
    } else if (!newContent.trim() && onTypingStop) {
      onTypingStop();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Stop typing when component unmounts
  useEffect(() => {
    return () => {
      if (onTypingStop) {
        onTypingStop();
      }
    };
  }, [onTypingStop]);

  return (
    <footer className="p-3 bg-white border-t border-gray-200/80 shrink-0">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-5xl mx-auto">
        {/* Input Pill Container */}
        <div className="flex-1 flex items-center bg-[#f0f2f5] hover:bg-[#e9ebed] focus-within:bg-white rounded-2xl px-3 py-1 border border-transparent focus-within:border-signal-blue/40 focus-within:ring-2 focus-within:ring-signal-blue/20 transition-all">
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            disabled={disabled}
            className="w-full bg-transparent border-0 focus:outline-none text-sm text-gray-900 placeholder:text-gray-400 py-1.5 px-1 leading-normal"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!content.trim() || disabled}
          className={`p-2.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-signal-blue/40 shrink-0 ${
            content.trim() && !disabled
              ? 'bg-signal-blue text-white hover:bg-blue-600 shadow-xs cursor-pointer'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          title="Send message"
          aria-label="Send message"
        >
          <SendIcon className="w-4 h-4 translate-x-0.5" />
        </button>
      </form>
    </footer>
  );
}
