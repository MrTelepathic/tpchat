/**
 * TPChat Chat Hook
 * Manage chat state and operations
 */

import { useState, useCallback, useEffect } from 'react';
import type { Chat, Message, User, MessageType } from '@/types/chat';
import { generateUUID, generateNonce } from '@/crypto/aes';
import { validateMessage, initAntiReplay } from '@/antiReplay/antiReplayCache';
import { recordActivity } from '@/session/sessionManager';

// Mock data for demonstration
const MOCK_USERS: User[] = [
  {
    id: 'user1',
    username: 'alice',
    displayName: 'Alice',
    status: 'online',
    lastSeen: Date.now(),
  },
  {
    id: 'user2',
    username: 'bob',
    displayName: 'Bob',
    status: 'recently',
    lastSeen: Date.now() - 5 * 60 * 1000,
  },
  {
    id: 'user3',
    username: 'charlie',
    displayName: 'Charlie',
    status: 'offline',
    lastSeen: Date.now() - 2 * 60 * 60 * 1000,
  },
];

const MOCK_CHATS: Chat[] = [
  {
    id: 'chat1',
    type: 'private',
    name: 'Alice',
    participants: ['user1'],
    unreadCount: 2,
    isPinned: true,
    isMuted: false,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 30 * 60 * 1000,
    lastMessage: {
      id: 'msg1',
      chatId: 'chat1',
      senderId: 'user1',
      senderName: 'Alice',
      content: 'Hey! How are you doing?',
      type: 'text',
      timestamp: Date.now() - 30 * 60 * 1000,
      isOutgoing: false,
      isRead: false,
      isEdited: false,
    },
  },
  {
    id: 'chat2',
    type: 'private',
    name: 'Bob',
    participants: ['user2'],
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 60 * 60 * 1000,
    lastMessage: {
      id: 'msg2',
      chatId: 'chat2',
      senderId: 'user2',
      senderName: 'Bob',
      content: 'Thanks for the help!',
      type: 'text',
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
      isOutgoing: true,
      isRead: true,
      isEdited: false,
    },
  },
  {
    id: 'chat3',
    type: 'private',
    name: 'Charlie',
    participants: ['user3'],
    unreadCount: 1,
    isPinned: false,
    isMuted: true,
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 4 * 60 * 60 * 1000,
    lastMessage: {
      id: 'msg3',
      chatId: 'chat3',
      senderId: 'user3',
      senderName: 'Charlie',
      content: 'Voice message (0:42)',
      type: 'voice',
      timestamp: Date.now() - 4 * 60 * 60 * 1000,
      isOutgoing: false,
      isRead: false,
      isEdited: false,
      mediaDuration: 42,
    },
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  chat1: [
    {
      id: 'msg0',
      chatId: 'chat1',
      senderId: 'me',
      senderName: 'You',
      content: 'Hi Alice! Long time no see.',
      type: 'text',
      timestamp: Date.now() - 24 * 60 * 60 * 1000,
      isOutgoing: true,
      isRead: true,
      isEdited: false,
    },
    {
      id: 'msg1',
      chatId: 'chat1',
      senderId: 'user1',
      senderName: 'Alice',
      content: 'Hey! How are you doing?',
      type: 'text',
      timestamp: Date.now() - 30 * 60 * 1000,
      isOutgoing: false,
      isRead: false,
      isEdited: false,
    },
    {
      id: 'msg1b',
      chatId: 'chat1',
      senderId: 'user1',
      senderName: 'Alice',
      content: 'Want to grab coffee later? ☕',
      type: 'text',
      timestamp: Date.now() - 29 * 60 * 1000,
      isOutgoing: false,
      isRead: false,
      isEdited: false,
    },
  ],
  chat2: [
    {
      id: 'msg2a',
      chatId: 'chat2',
      senderId: 'user2',
      senderName: 'Bob',
      content: 'Can you help me with the project?',
      type: 'text',
      timestamp: Date.now() - 3 * 60 * 60 * 1000,
      isOutgoing: false,
      isRead: true,
      isEdited: false,
    },
    {
      id: 'msg2b',
      chatId: 'chat2',
      senderId: 'me',
      senderName: 'You',
      content: 'Sure, what do you need?',
      type: 'text',
      timestamp: Date.now() - 2.5 * 60 * 60 * 1000,
      isOutgoing: true,
      isRead: true,
      isEdited: false,
    },
    {
      id: 'msg2',
      chatId: 'chat2',
      senderId: 'user2',
      senderName: 'Bob',
      content: 'Thanks for the help!',
      type: 'text',
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
      isOutgoing: false,
      isRead: true,
      isEdited: false,
    },
  ],
  chat3: [
    {
      id: 'msg3a',
      chatId: 'chat3',
      senderId: 'me',
      senderName: 'You',
      content: 'Hey Charlie, check this out!',
      type: 'text',
      timestamp: Date.now() - 5 * 60 * 60 * 1000,
      isOutgoing: true,
      isRead: true,
      isEdited: false,
    },
    {
      id: 'msg3',
      chatId: 'chat3',
      senderId: 'user3',
      senderName: 'Charlie',
      content: 'Voice message (0:42)',
      type: 'voice',
      timestamp: Date.now() - 4 * 60 * 60 * 1000,
      isOutgoing: false,
      isRead: false,
      isEdited: false,
      mediaDuration: 42,
    },
  ],
};

export function useChat() {
  const [chats, setChats] = useState<Chat[]>(MOCK_CHATS);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>(MOCK_MESSAGES);
  const [users] = useState<Record<string, User>>(
    MOCK_USERS.reduce((acc, user) => ({ ...acc, [user.id]: user }), {})
  );
  const [isLoading, setIsLoading] = useState(false);

  // Initialize anti-replay protection
  useEffect(() => {
    initAntiReplay();
  }, []);

  const activeChat = activeChatId
    ? chats.find((c) => c.id === activeChatId) || null
    : null;

  const activeMessages = activeChatId ? messages[activeChatId] || [] : [];

  const selectChat = useCallback((chatId: string | null) => {
    setActiveChatId(chatId);
    if (chatId) {
      recordActivity();
      // Mark messages as read
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
        )
      );
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string, type: MessageType = 'text') => {
      if (!activeChatId) return;

      const messageId = generateUUID();
      const nonce = generateNonce();
      const timestamp = Date.now();

      // Validate for replay
      if (!validateMessage(messageId, nonce, timestamp)) {
        console.error('Message validation failed - possible replay attack');
        return;
      }

      const newMessage: Message = {
        id: messageId,
        chatId: activeChatId,
        senderId: 'me',
        senderName: 'You',
        content,
        type,
        timestamp,
        isOutgoing: true,
        isRead: false,
        isEdited: false,
      };

      setMessages((prev) => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), newMessage],
      }));

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? { ...chat, lastMessage: newMessage, updatedAt: timestamp }
            : chat
        )
      );

      recordActivity();
    },
    [activeChatId]
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!activeChatId) return;

      setMessages((prev) => ({
        ...prev,
        [activeChatId]:
          prev[activeChatId]?.filter((m) => m.id !== messageId) || [],
      }));

      recordActivity();
    },
    [activeChatId]
  );

  const editMessage = useCallback(
    (messageId: string, newContent: string) => {
      if (!activeChatId) return;

      setMessages((prev) => ({
        ...prev,
        [activeChatId]:
          prev[activeChatId]?.map((m) =>
            m.id === messageId
              ? { ...m, content: newContent, isEdited: true }
              : m
          ) || [],
      }));

      recordActivity();
    },
    [activeChatId]
  );

  const pinChat = useCallback((chatId: string, pinned: boolean) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, isPinned: pinned } : chat))
    );
    recordActivity();
  }, []);

  const muteChat = useCallback((chatId: string, muted: boolean) => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, isMuted: muted } : chat))
    );
    recordActivity();
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    setMessages((prev) => {
      const { [chatId]: _, ...rest } = prev;
      return rest;
    });
    if (activeChatId === chatId) {
      setActiveChatId(null);
    }
    recordActivity();
  }, [activeChatId]);

  return {
    chats,
    activeChat,
    activeChatId,
    activeMessages,
    users,
    isLoading,
    selectChat,
    sendMessage,
    deleteMessage,
    editMessage,
    pinChat,
    muteChat,
    deleteChat,
  };
}
