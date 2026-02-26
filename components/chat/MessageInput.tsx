/**
 * TPChat Message Input Component
 * Voice/video recording, emoji picker, text input
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Send,
  Mic,
  Video,
  Paperclip,
  Smile,
  X,
  Square,
  Pause,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MessageType } from '@/types/chat';

interface MessageInputProps {
  onSendMessage: (content: string, type: MessageType) => void;
  disabled?: boolean;
}

export function MessageInput({
  onSendMessage,
  disabled = false,
}: MessageInputProps): JSX.Element {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'voice' | 'video' | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const startRecording = useCallback(
    async (type: 'voice' | 'video') => {
      try {
        const constraints: MediaStreamConstraints =
          type === 'video'
            ? { video: true, audio: true }
            : { audio: true, video: false };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: e.data.type });
          const url = URL.createObjectURL(blob);
          onSendMessage(url, type);
        };

        mediaRecorder.start(100);
        setIsRecording(true);
        setRecordingType(type);
        setRecordingTime(0);

        // Start timer
        timerRef.current = window.setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } catch (error) {
        console.error('Failed to start recording:', error);
        alert('Could not access microphone/camera. Please check permissions.');
      }
    },
    [onSendMessage]
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsRecording(false);
      setRecordingType(null);
      setRecordingTime(0);
      setIsPaused(false);
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = window.setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
      setIsPaused(!isPaused);
    }
  }, [isRecording, isPaused]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      chunksRef.current = [];
      setIsRecording(false);
      setRecordingType(null);
      setRecordingTime(0);
      setIsPaused(false);
    }
  }, []);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim(), 'text');
      setMessage('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const emojis = [
    '😀', '😂', '🥰', '😎', '🤔', '👍', '👎', '❤️', '🔥', '🎉',
    '👋', '🙏', '💯', '✅', '❌', '⚠️', '💡', '📎', '📷', '🎤',
    '🎬', '📁', '📅', '⏰', '🌍', '🏠', '💼', '🎮', '📚', '💻',
  ];

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  if (isRecording) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--tg-bg-primary)] border-t border-[var(--tg-border)]">
        {/* Recording Indicator */}
        <div className="flex items-center gap-2 flex-1">
          <div className={cn(
            'w-3 h-3 rounded-full',
            recordingType === 'video' ? 'bg-blue-500' : 'bg-red-500',
            isPaused ? '' : 'animate-pulse'
          )} />
          <span className="text-sm font-medium text-[var(--tg-text-primary)]">
            {recordingType === 'video' ? 'Recording video' : 'Recording voice'}
          </span>
          <span className="text-sm text-[var(--tg-text-secondary)] font-mono">
            {formatTime(recordingTime)}
          </span>
        </div>

        {/* Recording Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={pauseRecording}
            className="text-[var(--tg-text-secondary)] hover:bg-[var(--tg-hover)]"
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            className="text-red-500 hover:bg-red-500/10"
          >
            <X className="w-5 h-5" />
          </Button>

          <Button
            variant="default"
            size="icon"
            onClick={stopRecording}
            className="bg-[var(--tg-accent)] hover:bg-[var(--tg-accent-hover)]"
          >
            <Square className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-full left-4 mb-2 p-3 bg-[var(--tg-bg-secondary)] rounded-xl border border-[var(--tg-border)] shadow-lg">
          <div className="grid grid-cols-10 gap-1">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className="w-8 h-8 flex items-center justify-center text-xl hover:bg-[var(--tg-hover)] rounded"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2 px-4 py-3 bg-[var(--tg-bg-primary)] border-t border-[var(--tg-border)]">
        {/* Attach Button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--tg-text-secondary)] hover:bg-[var(--tg-hover)] flex-shrink-0"
          disabled={disabled}
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            disabled={disabled}
            rows={1}
            className="w-full min-h-[40px] max-h-[120px] px-3 py-2 bg-[var(--tg-bg-tertiary)] border border-[var(--tg-border)] rounded-2xl text-[var(--tg-text-primary)] placeholder:text-[var(--tg-text-muted)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--tg-accent)]"
          />
        </div>

        {/* Emoji Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={cn(
            'text-[var(--tg-text-secondary)] hover:bg-[var(--tg-hover)] flex-shrink-0',
            showEmojiPicker && 'text-[var(--tg-accent)]'
          )}
          disabled={disabled}
        >
          <Smile className="w-5 h-5" />
        </Button>

        {/* Voice/Video/Send Buttons */}
        {message.trim() ? (
          <Button
            variant="default"
            size="icon"
            onClick={handleSend}
            disabled={disabled}
            className="bg-[var(--tg-accent)] hover:bg-[var(--tg-accent-hover)] flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        ) : (
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => startRecording('voice')}
              disabled={disabled}
              className="text-[var(--tg-text-secondary)] hover:bg-[var(--tg-hover)]"
            >
              <Mic className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => startRecording('video')}
              disabled={disabled}
              className="text-[var(--tg-text-secondary)] hover:bg-[var(--tg-hover)]"
            >
              <Video className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
