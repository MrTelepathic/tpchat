/**
 * TPChat Main Application Component
 * Zero-Trust Encrypted Messaging Platform
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Menu,
  Settings,
  Moon,
  Sun,
  Monitor,
  LogOut,
  Shield,
  Beaker,
  Info,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ThemeProvider, useTheme } from '@/theme/themeProvider';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { Login } from '@/components/Login';
import { About } from '@/components/About';
import { CyberLab } from '@/securityAudit/CyberLab';
import { useChat } from '@/hooks/useChat';
import {
  isSessionActive,
  destroySession,
  recordActivity,
} from '@/session/sessionManager';
import { initAntiReplay, stopAntiReplay } from '@/antiReplay/antiReplayCache';
import { applyCSP } from '@/integrity/integrityChecker';
import './App.css';

function AppContent(): JSX.Element {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [cyberLabOpen, setCyberLabOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { theme, resolvedTheme, setTheme } = useTheme();

  const {
    chats,
    activeChat,
    activeChatId,
    activeMessages,
    users,
    selectChat,
    sendMessage,
    pinChat,
    muteChat,
    deleteChat,
  } = useChat();

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      const hasSession = isSessionActive();
      setIsLoggedIn(hasSession);
      setIsLoading(false);

      if (hasSession) {
        initAntiReplay();
        applyCSP();
      }
    };

    checkSession();

    // Handle resize for mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setShowSidebar(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      stopAntiReplay();
    };
  }, []);

  // Handle login
  const handleLogin = useCallback(() => {
    setIsLoggedIn(true);
    initAntiReplay();
    applyCSP();
  }, []);

  // Handle logout
  const handleLogout = useCallback(() => {
    destroySession();
    stopAntiReplay();
    setIsLoggedIn(false);
    setMenuOpen(false);
  }, []);

  // Handle chat selection (mobile)
  const handleSelectChat = useCallback(
    (chatId: string) => {
      selectChat(chatId);
      if (isMobile) {
        setShowSidebar(false);
      }
      recordActivity();
    },
    [selectChat, isMobile]
  );

  // Handle back button (mobile)
  const handleBack = useCallback(() => {
    selectChat(null);
    setShowSidebar(true);
  }, [selectChat]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tg-bg-primary)]">
        <div className="animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--tg-accent)] to-purple-600 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-8 h-8 text-white animate-spin"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex bg-[var(--tg-bg-primary)] overflow-hidden">
      {/* Sidebar - Desktop always visible, Mobile conditional */}
      {(!isMobile || showSidebar) && (
        <div
          className={cn(
            'h-full',
            isMobile ? 'fixed inset-0 z-40 w-full' : 'w-80 flex-shrink-0'
          )}
        >
          <ChatSidebar
            chats={chats}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onPinChat={pinChat}
            onMuteChat={muteChat}
            onDeleteChat={deleteChat}
            onOpenMenu={() => setMenuOpen(true)}
          />
        </div>
      )}

      {/* Chat Area */}
      {(!isMobile || !showSidebar) && (
        <div className="flex-1 h-full">
          <ChatArea
            chat={activeChat}
            messages={activeMessages}
            users={users}
            onSendMessage={sendMessage}
            onBack={handleBack}
            isMobile={isMobile}
          />
        </div>
      )}

      {/* Navigation Menu Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="w-80 bg-[var(--tg-bg-secondary)] border-r border-[var(--tg-border)] p-0"
        >
          <SheetHeader className="p-4 border-b border-[var(--tg-border)]">
            <SheetTitle className="text-[var(--tg-text-primary)] flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--tg-accent)] to-purple-600 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-4 h-4 text-white"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              TPChat
            </SheetTitle>
          </SheetHeader>

          <div className="p-4 space-y-2">
            {/* User Profile */}
            <div className="flex items-center gap-3 p-3 bg-[var(--tg-bg-tertiary)] rounded-xl mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--tg-accent)] to-purple-600 flex items-center justify-center text-white font-medium">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-[var(--tg-text-primary)]">User</p>
                <p className="text-xs text-[var(--tg-text-secondary)]">Online</p>
              </div>
            </div>

            {/* Theme Selection */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--tg-text-muted)] uppercase tracking-wider">
                Theme
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors',
                    theme === 'light'
                      ? 'border-[var(--tg-accent)] bg-[var(--tg-accent)]/10'
                      : 'border-[var(--tg-border)] hover:bg-[var(--tg-hover)]'
                  )}
                >
                  <Sun className="w-5 h-5 text-[var(--tg-text-secondary)]" />
                  <span className="text-xs text-[var(--tg-text-secondary)]">Light</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors',
                    theme === 'dark'
                      ? 'border-[var(--tg-accent)] bg-[var(--tg-accent)]/10'
                      : 'border-[var(--tg-border)] hover:bg-[var(--tg-hover)]'
                  )}
                >
                  <Moon className="w-5 h-5 text-[var(--tg-text-secondary)]" />
                  <span className="text-xs text-[var(--tg-text-secondary)]">Dark</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors',
                    theme === 'system'
                      ? 'border-[var(--tg-accent)] bg-[var(--tg-accent)]/10'
                      : 'border-[var(--tg-border)] hover:bg-[var(--tg-hover)]'
                  )}
                >
                  <Monitor className="w-5 h-5 text-[var(--tg-text-secondary)]" />
                  <span className="text-xs text-[var(--tg-text-secondary)]">Auto</span>
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-1 pt-4">
              <p className="text-xs font-medium text-[var(--tg-text-muted)] uppercase tracking-wider">
                Options
              </p>

              <button
                onClick={() => {
                  setCyberLabOpen(true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--tg-hover)] transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--tg-accent)]/10 flex items-center justify-center">
                  <Beaker className="w-4 h-4 text-[var(--tg-accent)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--tg-text-primary)]">
                    Cyber Lab
                  </p>
                  <p className="text-xs text-[var(--tg-text-secondary)]">
                    Security audit & tests
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  setAboutOpen(true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--tg-hover)] transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--tg-accent)]/10 flex items-center justify-center">
                  <Info className="w-4 h-4 text-[var(--tg-accent)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--tg-text-primary)]">
                    About TPChat
                  </p>
                  <p className="text-xs text-[var(--tg-text-secondary)]">
                    Project info & security
                  </p>
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <LogOut className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-500">Logout</p>
                  <p className="text-xs text-[var(--tg-text-secondary)]">
                    End session & clear data
                  </p>
                </div>
              </button>
            </div>

            {/* Security Info */}
            <div className="mt-4 p-3 bg-[var(--tg-accent)]/5 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-3.5 h-3.5 text-[var(--tg-accent)]" />
                <span className="text-xs font-medium text-[var(--tg-accent)]">
                  Zero-Trust Active
                </span>
              </div>
              <p className="text-xs text-[var(--tg-text-muted)]">
                ECDH + AES-256-GCM encryption
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* About Modal */}
      <About isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />

      {/* Cyber Lab Modal */}
      <CyberLab isOpen={cyberLabOpen} onClose={() => setCyberLabOpen(false)} />
    </div>
  );
}

function App(): JSX.Element {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
