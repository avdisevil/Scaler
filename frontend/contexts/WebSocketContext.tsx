'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { wsClient, WebSocketEvent } from '@/lib/websocket';

interface WebSocketContextType {
  isConnected: boolean;
  subscribeToConversation: (conversationId: number) => void;
  unsubscribeFromConversation: (conversationId: number) => void;
  sendTypingStart: (conversationId: number) => void;
  sendTypingStop: (conversationId: number) => void;
  on: (event: WebSocketEvent, handler: (data: any) => void) => void;
  off: (event: WebSocketEvent, handler: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      wsClient.connect(token);
    } else {
      wsClient.disconnect();
    }

    return () => {
      wsClient.disconnect();
    };
  }, [token]);

  const value: WebSocketContextType = {
    isConnected: wsClient.isConnected(),
    subscribeToConversation: wsClient.subscribeToConversation.bind(wsClient),
    unsubscribeFromConversation: wsClient.unsubscribeFromConversation.bind(wsClient),
    sendTypingStart: wsClient.sendTypingStart.bind(wsClient),
    sendTypingStop: wsClient.sendTypingStop.bind(wsClient),
    on: wsClient.on.bind(wsClient),
    off: wsClient.off.bind(wsClient),
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
