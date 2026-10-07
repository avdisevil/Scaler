'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Conversation, Message, Contact } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { wsClient } from '@/lib/websocket';
import { Sidebar } from '@/components/conversations/Sidebar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { NewMessageModal } from '@/components/modals/NewMessageModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { CreateGroupModal } from '@/components/modals/CreateGroupModal';
import { GroupMembersModal } from '@/components/modals/GroupMembersModal';

interface AppShellProps {
  initialConversationId?: number | null;
}

export function AppShell({ initialConversationId = null }: AppShellProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(initialConversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isGroupMembersOpen, setIsGroupMembersOpen] = useState(false);
  const [groupParticipants, setGroupParticipants] = useState<any[]>([]);
  const [currentParticipants, setCurrentParticipants] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState<string>('');

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedIdRef = useRef<number | null>(selectedId);
  const conversationsRef = useRef<Conversation[]>(conversations);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Load conversations from backend
  const loadConversations = useCallback(async () => {
    try {
      const data = await apiClient.getConversations();
      setConversations(data);
    } catch (err) {
      // Error handled silently - empty state will show
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Load contacts from backend for the new message modal
  const loadContacts = useCallback(async () => {
    try {
      const data = await apiClient.getContacts();
      setContacts(data);
    } catch (err) {
      // Error handled silently
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token || !user) {
      return;
    }

    const handleMessageNew = (data: any) => {
      const { message, conversation_id, temp_id } = data;
      if (conversation_id === selectedIdRef.current) {
        setMessages((prev) => {
          if (temp_id && message.sender_id === user.id) {
            const tempIndex = prev.findIndex((m) => m.id === temp_id);
            if (tempIndex !== -1) {
              const updated = [...prev];
              updated[tempIndex] = message;
              return updated;
            }
          }
          if (message.sender_id !== user.id) {
            if (prev.some((m) => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          }
          const existingIndex = prev.findIndex(
            (m) =>
              m.content === message.content &&
              m.sender_id === message.sender_id &&
              Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 5000
          );
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = message;
            return updated;
          }
          return prev;
        });
      }
      // Update conversation list locally for new messages in other conversations
      if (conversation_id !== selectedIdRef.current) {
        setConversations((prev) => {
          const convIndex = prev.findIndex((c) => c.id === conversation_id);
          if (convIndex !== -1) {
            const updated = [...prev];
            updated[convIndex] = {
              ...updated[convIndex],
              last_message: message.content,
              updated_at: message.created_at,
              unread_count: (updated[convIndex].unread_count || 0) + 1
            };
            // Move to top
            const [movedConv] = updated.splice(convIndex, 1);
            return [movedConv, ...updated];
          }
          return prev;
        });
      }
    };

    const handleMessageStatus = (data: any) => {
      const { message_id, status } = data;
      setMessages((prev) =>
        prev.map((msg) => (msg.id === message_id ? { ...msg, status } : msg))
      );
      // Don't reload conversations on status updates - this causes flickering
      // Unread counts will update when user navigates or periodically
    };

    const handleTypingStart = (data: any) => {
      const { conversation_id, user_id } = data;
      if (conversation_id === selectedIdRef.current && user_id !== user.id) {
        setIsTyping(true);
        const typingUser = conversationsRef.current.find((c) => c.id === conversation_id);
        setTypingUserName(typingUser?.name || 'Someone');
      }
    };

    const handleTypingStop = (data: any) => {
      const { conversation_id } = data;
      if (conversation_id === selectedIdRef.current) {
        setIsTyping(false);
      }
    };

    const handlePresence = () => {
      // Presence updates don't need to reload the conversation list
      // Online status is only shown in chat header, not in conversation list
      // This prevents flickering from frequent presence updates
    };

    wsClient.on('message_new', handleMessageNew);
    wsClient.on('message_status', handleMessageStatus);
    wsClient.on('typing_start', handleTypingStart);
    wsClient.on('typing_stop', handleTypingStop);
    wsClient.on('presence_update', handlePresence);

    return () => {
      wsClient.off('message_new', handleMessageNew);
      wsClient.off('message_status', handleMessageStatus);
      wsClient.off('typing_start', handleTypingStart);
      wsClient.off('typing_stop', handleTypingStop);
      wsClient.off('presence_update', handlePresence);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user, showToast]);

  useEffect(() => {
    loadConversations();
    loadContacts();
  }, []);

  // Load messages when selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setCurrentParticipants([]);
      return;
    }

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const msgs = await apiClient.getMessages(selectedId);
        setMessages(msgs);

        // Load participants for group chats
        const conv = conversations.find((c) => c.id === selectedId);
        if (conv?.is_group) {
          const participants = await apiClient.getParticipants(selectedId);
          setCurrentParticipants(participants);
        }

        // Subscribe to conversation via WebSocket
        wsClient.subscribeToConversation(selectedId);

        // Mark messages as read
        wsClient.send('mark_read', { conversation_id: selectedId });

        // Update unread count locally without full reload
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === selectedId ? { ...conv, unread_count: 0 } : conv
          )
        );
      } catch (err) {
        console.error('Failed to load messages for conversation:', err);
        showToast('Failed to load messages', 'error');
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();

    return () => {
      if (selectedId) {
        wsClient.unsubscribeFromConversation(selectedId);
      }
    };
  }, [selectedId, conversations, showToast]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
    [conversations, selectedId]
  );

  const handleSelectConversation = (id: number) => {
    setSelectedId(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/conversations/${id}`);
    }
  };

  const handleBackToSidebar = () => {
    setSelectedId(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/conversations');
    }
  };

  const handleSelectContactToChat = async (contactUserId: number) => {
    try {
      // Create or locate direct conversation with this contact (deduplicated by backend)
      const newConv = await apiClient.createConversation(null, false, [contactUserId]);
      await loadConversations();
      setSelectedId(newConv.id);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `/conversations/${newConv.id}`);
      }
      setIsNewMessageOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Failed to start conversation', 'error');
    }
  };

  const handleCreateGroup = async (group: any) => {
    await loadConversations();
    setSelectedId(group.id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/conversations/${group.id}`);
    }
  };

  const handleLoadGroupParticipants = async () => {
    if (!selectedId) return;
    try {
      const participants = await apiClient.getParticipants(selectedId);
      setGroupParticipants(participants);
    } catch (err) {
      // Error handled silently
    }
  };

  const handleOpenGroupMembers = () => {
    handleLoadGroupParticipants();
    setIsGroupMembersOpen(true);
  };

  const handleSendMessage = useCallback((content: string) => {
    if (!selectedId || !content.trim()) return;

    const tempId = -Date.now(); // Negative temporary ID

    // Send via WebSocket
    wsClient.send('send_message', {
      conversation_id: selectedId,
      content: content.trim(),
      message_type: 'text',
      temp_id: tempId // Include temp ID for matching
    });

    // Optimistically add message with "sending" status
    const tempMessage: Message = {
      id: tempId,
      conversation_id: selectedId,
      sender_id: user?.id || 0,
      content: content.trim(),
      message_type: 'text',
      status: 'sending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempMessage]);
  }, [selectedId, user?.id]);

  const handleTypingStart = useCallback(() => {
    if (!selectedId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    wsClient.sendTypingStart(selectedId);

    typingTimeoutRef.current = setTimeout(() => {
      wsClient.sendTypingStop(selectedId);
    }, 3000);
  }, [selectedId]);

  const handleTypingStop = useCallback(() => {
    if (!selectedId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    wsClient.sendTypingStop(selectedId);
  }, [selectedId]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-900 font-sans antialiased">
      {/* LEFT SIDEBAR: Hidden on mobile when a chat is selected */}
      <div
        className={`${
          selectedId !== null ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-[360px] h-full shrink-0`}
      >
        <Sidebar
          conversations={conversations}
          selectedId={selectedId}
          onSelectConversation={handleSelectConversation}
          onOpenNewMessage={() => setIsNewMessageOpen(true)}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          loading={false}
        />
      </div>

      {/* RIGHT CHAT PANEL: Hidden on mobile when no chat is selected */}
      <div
        className={`${
          selectedId === null ? 'hidden md:flex' : 'flex'
        } flex-1 h-full min-w-0`}
      >
        <ChatPanel
          conversation={activeConversation}
          messages={messages}
          currentUserId={user?.id}
          onBack={handleBackToSidebar}
          onSendMessage={handleSendMessage}
          onNewChatClick={() => setIsNewMessageOpen(true)}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          isTyping={isTyping}
          typingUserName={typingUserName}
          onOpenGroupMembers={activeConversation?.is_group ? handleOpenGroupMembers : undefined}
          participants={currentParticipants}
          loading={false}
        />
      </div>

      {/* New Message Modal */}
      <NewMessageModal
        isOpen={isNewMessageOpen}
        onClose={() => setIsNewMessageOpen(false)}
        contacts={contacts}
        onSelectContact={handleSelectContactToChat}
        onRefreshContacts={loadContacts}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        contacts={contacts}
        onGroupCreated={handleCreateGroup}
      />

      {/* Group Members Modal */}
      <GroupMembersModal
        isOpen={isGroupMembersOpen}
        onClose={() => setIsGroupMembersOpen(false)}
        conversationId={selectedId || 0}
        participants={groupParticipants}
        currentUserId={user?.id || 0}
        isAdmin={groupParticipants.some((p) => p.user_id === user?.id && p.role === 'admin')}
        onParticipantsChange={handleLoadGroupParticipants}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
