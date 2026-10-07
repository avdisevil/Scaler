'use client';

import React from 'react';

interface TypingIndicatorProps {
  userName?: string;
}

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-gray-500 animate-fadeIn">
      <div className="bg-white border border-gray-200/80 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1.5 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
      </div>
      {userName && (
        <span className="text-[11px] text-gray-400 font-medium">
          {userName} is typing...
        </span>
      )}
    </div>
  );
}
