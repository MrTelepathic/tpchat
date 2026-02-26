/**
 * TPChat Chat Types
 * Message and conversation types
 */

export type MessageType = 'text' | 'voice' | 'video' | 'file' | 'image';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: MessageType;
  timestamp: number;
  isOutgoing: boolean;
  isRead: boolean;
  isEdited: boolean;
  replyTo?: string;
  mediaUrl?: string;
  mediaDuration?: number;
  fileName?: string;
  fileSize?: number;
}

export interface Chat {
  id: string;
  type: 'private' | 'group';
  name: string;
  avatar?: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  status: 'online' | 'offline' | 'recently' | 'last_week';
  lastSeen?: number;
  publicKey?: ArrayBuffer;
}

export interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  messages: Record<string, Message[]>;
  users: Record<string, User>;
  isLoading: boolean;
  error: string | null;
}

export interface RecordingState {
  isRecording: boolean;
  mediaType: 'voice' | 'video' | null;
  startTime: number;
  stream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];
}

export interface TypingIndicator {
  chatId: string;
  userId: string;
  timestamp: number;
}
