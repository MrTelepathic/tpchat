/**
 * TPChat Chat Area Component
 * Main chat display with header and messages
 */

import React, { useRef, useEffect } from 'react';
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  ArrowLeft,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Chat, Message, User } from '@/types/chat';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';

interface ChatAreaProps {
  chat: Chat | null;
  messages: Message[];
  users: Record<string, User>;
  onSendMessage: (content: string, type: 'text' | 'voice' | 'video' | 'file') => void;
  onBack?: () => void;
  isMobile?: boolean;
}

export function ChatArea({
  chat,
  messages,
  users,
  onSendMessage,
  onBack,
  isMobile = false,
}: ChatAreaProps): JSX.Element {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusText = (user: User | undefined): string => {
    if (!user) return '';
    switch (user.status) {
      case 'online':
        return 'online';
      case 'recently':
        return 'last seen recently';
      case 'last_week':
        return 'last seen last week';
      case 'offline':
        return user.lastSeen
          ? `last seen ${new Date(user.lastSeen).toLocaleDateString()}`
          : 'offline';
      default:
        return '';
    }
  };

  const formatMessageDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  if (!chat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[var(--tg-bg-primary)]">
        <div className="w-32 h-32 rounded-full bg-[var(--tg-accent)]/10 flex items-center justify-center mb-4">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-16 h-16 text-[var(--tg-accent)]"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h2 className="text-xl font-medium text-[var(--tg-text-primary)] mb-2">
          TPChat
        </h2>
        <p className="text-[var(--tg-text-secondary)] text-center max-w-sm px-4">
          Select a chat to start messaging
          <br />
          <span className="text-xs mt-2 block opacity-70">
            End-to-end encrypted with Zero-Trust architecture
          </span>
        </p>
      </div>
    );
  }

  const otherUser = users[chat.participants[0]];

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--tg-bg-primary)]">
      {/* Chat Header */}
      <div className="h-14 flex items-center px-3 gap-3 bg-[var(--tg-bg-primary)] border-b border-[var(--tg-border)]">
        {/* Back Button (Mobile) */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-[var(--tg-text-secondary)] hover:bg-[var(--tg-hover)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}

        {/* Avatar */}
        <div className="relative">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium',
              chat.avatar
                ? 'bg-cover bg-center'
                : 'bg-gradient-to-br from-[var(--tg-accent)] to-purple-600 text-white'
            )}
            style={
              chat.avatar ? { backgroundImage: `url(${chat.avatar})` } : undefined
            }
          >
            {!chat.avatar && getInitials(chat.name)}
          </div>
          {otherUser?.status === 'online' && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[var(--tg-online)] rounded-full border-2 border-[var(--tg-bg-primary)]" />
          )}
        </div>

        {/* Chat Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-[var(--tg-text-primary)] truncate">
            {chat.name}
          </h3>
          <p className="text-xs text-[var(--tg-text-secondary)]">
            {getStatusText(otherUser)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-[var(--tg-text-secondary)] hover:bg-[var(--tg-hover)]"
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-[var(--tg-text-secondary)] hover:bg-[var(--tg-hover)]"
          >
            <Video className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-[var(--tg-text-secondary)] hover:bg-[var(--tg-hover)]"
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-[var(--tg-text-secondary)] hover:bg-[var(--tg-hover)]"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {/* Encryption Notice */}
        <div className="flex justify-center mb-4">
          <div className="px-3 py-1.5 bg-[var(--tg-accent)]/10 rounded-full">
            <p className="text-xs text-[var(--tg-accent)] flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Messages are end-to-end encrypted
            </p>
          </div>
        </div>

        {/* Messages by Date */}
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date Divider */}
            <div className="flex justify-center my-4">
              <span className="px-3 py-1 text-xs text-[var(--tg-text-muted)] bg-[var(--tg-bg-secondary)] rounded-full">
                {formatMessageDate(dateMessages[0].timestamp)}
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-1">
              {dateMessages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  showAvatar={
                    chat.type === 'group' &&
                    !message.isOutgoing &&
                    (index === 0 ||
                      dateMessages[index - 1].senderId !== message.senderId)
                  }
                />
              ))}
            </div>
          </div>
        ))}

        {/* Scroll Anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <MessageInput onSendMessage={onSendMessage} />
    </div>
  );
}
