export type WebSocketEvent =
  | 'message_new'
  | 'message_status'
  | 'typing_start'
  | 'typing_stop'
  | 'presence_update'
  | 'conversation_update'
  | 'participant_added'
  | 'participant_removed'
  | 'message_reaction';

type WebSocketEventHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private eventHandlers: Map<WebSocketEvent, Set<WebSocketEventHandler>> = new Map();
  private currentConversation: number | null = null;

  connect(token: string) {
    this.token = token;
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws?token=${token}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;

        if (this.currentConversation) {
          this.subscribeToConversation(this.currentConversation);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const eventType = data.event as WebSocketEvent;
          const eventData = data.data;

          const handlers = this.eventHandlers.get(eventType);
          if (handlers) {
            handlers.forEach((handler) => handler(eventData));
          }
        } catch (error) {
          // Silent parse error - could be malformed data
        }
      };

      this.ws.onclose = () => {
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        // Error logged by browser console automatically
      };
    } catch (error) {
      this.attemptReconnect();
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.token = null;
    this.reconnectAttempts = 0;
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.token) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect(this.token!);
      }, this.reconnectDelay);
    }
  }

  send(event: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  on(event: WebSocketEvent, handler: WebSocketEventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: WebSocketEvent, handler: WebSocketEventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  subscribeToConversation(conversationId: number) {
    this.currentConversation = conversationId;
    this.send('subscribe_conversation', { conversation_id: conversationId });
  }

  unsubscribeFromConversation(conversationId: number) {
    this.send('unsubscribe_conversation', { conversation_id: conversationId });
    if (this.currentConversation === conversationId) {
      this.currentConversation = null;
    }
  }

  sendTypingStart(conversationId: number) {
    this.send('typing_start', { conversation_id: conversationId });
  }

  sendTypingStop(conversationId: number) {
    this.send('typing_stop', { conversation_id: conversationId });
  }

  sendPresenceUpdate(status: 'online' | 'offline') {
    this.send('presence_update', { status });
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WebSocketClient();
