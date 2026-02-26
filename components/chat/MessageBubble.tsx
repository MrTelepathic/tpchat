/**
 * TPChat Message Bubble Component
 * Telegram-style message bubbles
 */

import React from 'react';
import { Check, CheckCheck, Pencil, Mic, Video, File } from 'lucide-react';
import type { Message } from '@/types/chat';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  showAvatar = false,
}: MessageBubbleProps): JSX.Element {
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderContent = () => {
    switch (message.type) {
      case 'voice':
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--tg-accent)]/20 flex items-center justify-center">
              <Mic className="w-4 h-4 text-[var(--tg-accent)]" />
            </div>
            <div className="flex-1">
              <div className="h-1.5 w-24 bg-[var(--tg-accent)]/30 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-[var(--tg-accent)] rounded-full" />
              </div>
              <span className="text-xs text-[var(--tg-text-secondary)] mt-1">
                {message.mediaDuration
                  ? `${Math.floor(message.mediaDuration / 60)}:${(message.mediaDuration % 60)
                      .toString()
                      .padStart(2, '0')}`
                  : '0:00'}
              </span>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="relative">
            <div className="w-48 h-32 bg-black/50 rounded-lg flex items-center justify-center">
              <Video className="w-8 h-8 text-white/70" />
            </div>
            {message.mediaDuration && (
              <span className="absolute bottom-2 right-2 text-xs text-white bg-black/50 px-1.5 py-0.5 rounded">
                {Math.floor(message.mediaDuration / 60)}:
                {(message.mediaDuration % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="flex items-center gap-3 p-2 bg-black/5 rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-[var(--tg-accent)]/20 flex items-center justify-center flex-shrink-0">
              <File className="w-5 h-5 text-[var(--tg-accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.fileName || 'File'}</p>
              {message.fileSize && (
                <p className="text-xs text-[var(--tg-text-secondary)]">
                  {(message.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>;
    }
  };

  return (
    <div
      className={cn(
        'flex gap-2 mb-2',
        message.isOutgoing ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar (for incoming messages in groups) */}
      {!message.isOutgoing && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--tg-accent)] to-purple-600 flex items-center justify-center text-xs font-medium text-white flex-shrink-0 mt-1">
          {getInitials(message.senderName)}
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          'relative max-w-[70%] min-w-[80px] rounded-2xl px-3 py-2',
          message.isOutgoing
            ? 'bg-[var(--tg-message-out)] text-white rounded-br-sm'
            : 'bg-[var(--tg-message-in)] text-[var(--tg-text-primary)] rounded-bl-sm',
          !message.isOutgoing && showAvatar && 'ml-10'
        )}
      >
        {/* Sender name (for incoming group messages) */}
        {!message.isOutgoing && showAvatar && (
          <p className="text-xs font-medium text-[var(--tg-accent)] mb-1">
            {message.senderName}
          </p>
        )}

        {/* Message Content */}
        <div className="pr-14">{renderContent()}</div>

        {/* Timestamp & Status */}
        <div
          className={cn(
            'absolute bottom-1 right-2 flex items-center gap-1',
            message.type !== 'text' && 'bottom-2'
          )}
        >
          {message.isEdited && (
            <Pencil className="w-3 h-3 opacity-60" />
          )}
          <span
            className={cn(
              'text-xs',
              message.isOutgoing
                ? 'text-white/70'
                : 'text-[var(--tg-text-muted)]'
            )}
          >
            {formatTime(message.timestamp)}
          </span>
          {message.isOutgoing && (
            <span className={message.isRead ? 'text-[var(--tg-accent)]' : 'opacity-60'}>
              {message.isRead ? (
                <CheckCheck className="w-3.5 h-3.5" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </div>

        {/* Bubble Tail */}
        <div
          className={cn(
            'absolute bottom-0 w-3 h-3',
            message.isOutgoing
              ? '-right-1.5 bg-[var(--tg-message-out)] rounded-bl-full'
              : '-left-1.5 bg-[var(--tg-message-in)] rounded-br-full'
          )}
          style={{
            clipPath: message.isOutgoing
              ? 'polygon(0 0, 0% 100%, 100% 100%)'
              : 'polygon(100% 0, 0% 100%, 100% 100%)',
          }}
        />
      </div>
    </div>
  );
}
