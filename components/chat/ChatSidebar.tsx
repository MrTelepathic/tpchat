/**
 * TPChat Sidebar Component
 * Telegram-style chat list sidebar
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Menu,
  MoreVertical,
  Pin,
  VolumeX,
  Check,
  CheckCheck,
} from 'lucide-react';
import type { Chat } from '@/types/chat';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onPinChat: (chatId: string, pinned: boolean) => void;
  onMuteChat: (chatId: string, muted: boolean) => void;
  onDeleteChat: (chatId: string) => void;
  onOpenMenu: () => void;
}

export function ChatSidebar({
  chats,
  activeChatId,
  onSelectChat,
  onPinChat,
  onMuteChat,
  onDeleteChat,
  onOpenMenu,
}: ChatSidebarProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = useMemo(() => {
    let result = [...chats];

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (chat) =>
          chat.name.toLowerCase().includes(query) ||
          chat.lastMessage?.content.toLowerCase().includes(query)
      );
    }

    // Sort: pinned first, then by last message time
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.lastMessage?.timestamp || b.updatedAt) - (a.lastMessage?.timestamp || a.updatedAt);
    });

    return result;
  }, [chats, searchQuery]);

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[var(--tg-bg-secondary)] border-r border-[var(--tg-border)]">
      {/* Header */}
      <div className="h-14 flex items-center px-3 gap-2 bg-[var(--tg-bg-primary)]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMenu}
          className="text-[var(--tg-text-secondary)] hover:bg-[var(--tg-hover)]"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tg-text-muted)]" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-[var(--tg-bg-tertiary)] border-none text-[var(--tg-text-primary)] placeholder:text-[var(--tg-text-muted)] focus-visible:ring-1 focus-visible:ring-[var(--tg-accent)]"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={cn(
              'relative flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
              'hover:bg-[var(--tg-hover)]',
              activeChatId === chat.id && 'bg-[var(--tg-accent)]/10'
            )}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium',
                  chat.avatar
                    ? 'bg-cover bg-center'
                    : 'bg-gradient-to-br from-[var(--tg-accent)] to-purple-600 text-white'
                )}
                style={
                  chat.avatar
                    ? { backgroundImage: `url(${chat.avatar})` }
                    : undefined
                }
              >
                {!chat.avatar && getInitials(chat.name)}
              </div>
            </div>

            {/* Chat Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--tg-text-primary)] truncate">
                  {chat.name}
                </span>
                <span className="text-xs text-[var(--tg-text-muted)] flex-shrink-0 ml-2">
                  {chat.lastMessage && formatTime(chat.lastMessage.timestamp)}
                </span>
              </div>

              <div className="flex items-center justify-between mt-0.5">
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  {chat.lastMessage?.isOutgoing && (
                    <span className="text-[var(--tg-accent)]">
                      {chat.lastMessage.isRead ? (
                        <CheckCheck className="w-3.5 h-3.5" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </span>
                  )}
                  <span
                    className={cn(
                      'text-sm truncate',
                      chat.unreadCount > 0
                        ? 'text-[var(--tg-text-primary)]'
                        : 'text-[var(--tg-text-secondary)]'
                    )}
                  >
                    {chat.lastMessage?.type === 'voice'
                      ? 'Voice message'
                      : chat.lastMessage?.content || 'No messages'}
                  </span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {chat.isPinned && (
                    <Pin className="w-3.5 h-3.5 text-[var(--tg-text-muted)]" />
                  )}
                  {chat.isMuted && (
                    <VolumeX className="w-3.5 h-3.5 text-[var(--tg-text-muted)]" />
                  )}
                  {chat.unreadCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-[var(--tg-accent)] text-white text-xs font-medium flex items-center justify-center">
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Context Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:bg-[var(--tg-hover)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4 text-[var(--tg-text-secondary)]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onPinChat(chat.id, !chat.isPinned)}>
                  {chat.isPinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMuteChat(chat.id, !chat.isMuted)}>
                  {chat.isMuted ? 'Unmute' : 'Mute'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDeleteChat(chat.id)}
                  className="text-red-500"
                >
                  Delete Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        {filteredChats.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-[var(--tg-text-muted)]">
            <Search className="w-10 h-10 mb-2 opacity-50" />
            <p>No chats found</p>
          </div>
        )}
      </div>
    </div>
  );
}
