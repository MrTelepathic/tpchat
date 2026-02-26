/**
 * TPChat About Component
 * About page with project info and zero-trust explanation
 */

import React from 'react';
import {
  X,
  Shield,
  Lock,
  Key,
  EyeOff,
  ServerOff,
  Fingerprint,
  ExternalLink,
  Github,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AboutProps {
  isOpen: boolean;
  onClose: () => void;
}

export function About({ isOpen, onClose }: AboutProps): JSX.Element | null {
  if (!isOpen) return null;

  const securityFeatures = [
    {
      icon: Lock,
      title: 'End-to-End Encryption',
      description:
        'All messages are encrypted with AES-256-GCM using ECDH key exchange. Only you and the recipient can read your messages.',
    },
    {
      icon: ServerOff,
      title: 'No Central Servers',
      description:
        'TPChat is 100% client-side. There are no servers storing your data, no databases tracking your activity, and no cloud backups.',
    },
    {
      icon: EyeOff,
      title: 'Zero Data Collection',
      description:
        'We collect absolutely no data. No analytics, no telemetry, no cookies, no tracking of any kind.',
    },
    {
      icon: Key,
      title: 'Session Encryption',
      description:
        'Your session is encrypted with PBKDF2 using 310,000+ iterations. Session keys exist only in RAM and are destroyed on logout.',
    },
    {
      icon: Fingerprint,
      title: 'Anti-Replay Protection',
      description:
        'Built-in replay attack detection prevents message duplication and ensures message integrity.',
    },
    {
      icon: Shield,
      title: 'Integrity Verification',
      description:
        'Application bundle integrity is verified at runtime. Any tampering results in immediate session termination.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[var(--tg-bg-secondary)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--tg-border)]">
          <h2 className="text-lg font-semibold text-[var(--tg-text-primary)]">
            About TPChat
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-[var(--tg-text-secondary)] hover:bg-[var(--tg-hover)]"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--tg-accent)] to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-12 h-12 text-white"
              >
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--tg-text-primary)] mb-1">
              TPChat
            </h1>
            <p className="text-[var(--tg-text-secondary)]">
              Zero-Trust Encrypted Messaging Platform
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-[var(--tg-accent)]/10 text-[var(--tg-accent)] text-xs rounded-full">
                v1.0.0
              </span>
              <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-xs rounded-full">
                Stable
              </span>
            </div>
          </div>

          {/* Creator Info */}
          <div className="bg-[var(--tg-bg-tertiary)] rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-[var(--tg-text-primary)]">
                  Created by MrTelepathic
                </h3>
                <p className="text-sm text-[var(--tg-text-secondary)]">
                  Cryptography Engineer & Security Researcher
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-[var(--tg-border)] text-[var(--tg-text-primary)] hover:bg-[var(--tg-hover)]"
                onClick={() =>
                  window.open('https://github.com/MrTelepathic', '_blank')
                }
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-[var(--tg-border)] text-[var(--tg-text-primary)] hover:bg-[var(--tg-hover)]"
                onClick={() =>
                  window.open('https://github.com/MrTelepathic/tpchat', '_blank')
                }
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Repository
              </Button>
            </div>
          </div>

          {/* Zero-Trust Explanation */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-[var(--tg-text-primary)] mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--tg-accent)]" />
              What is Zero-Trust?
            </h3>
            <div className="bg-[var(--tg-bg-tertiary)] rounded-xl p-4 text-sm text-[var(--tg-text-secondary)] leading-relaxed space-y-3">
              <p>
                <strong className="text-[var(--tg-text-primary)]">
                  Zero-Trust Architecture
                </strong>{' '}
                is a security model that assumes no user, device, or system should be
                trusted by default - not even the platform itself.
              </p>
              <p>
                In TPChat, this means:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Your data is encrypted before it leaves your device</li>
                <li>The application cannot access your unencrypted messages</li>
                <li>No server can read, store, or analyze your communications</li>
                <li>Session keys exist only in memory and are never persisted</li>
                <li>Integrity checks prevent code tampering</li>
              </ul>
            </div>
          </div>

          {/* Security Features */}
          <div>
            <h3 className="text-lg font-semibold text-[var(--tg-text-primary)] mb-3">
              Security Features
            </h3>
            <div className="grid gap-3">
              {securityFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="flex gap-3 p-3 bg-[var(--tg-bg-tertiary)] rounded-xl"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--tg-accent)]/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-[var(--tg-accent)]" />
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--tg-text-primary)] text-sm">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-[var(--tg-text-secondary)] mt-0.5 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Specs */}
          <div className="mt-6 p-4 bg-[var(--tg-bg-tertiary)] rounded-xl">
            <h4 className="font-medium text-[var(--tg-text-primary)] mb-3 text-sm">
              Technical Specifications
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--tg-text-muted)]">Encryption:</span>
                <span className="text-[var(--tg-text-secondary)]">AES-256-GCM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--tg-text-muted)]">Key Exchange:</span>
                <span className="text-[var(--tg-text-secondary)]">ECDH (P-256)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--tg-text-muted)]">Key Derivation:</span>
                <span className="text-[var(--tg-text-secondary)]">HKDF-SHA256</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--tg-text-muted)]">Password Hash:</span>
                <span className="text-[var(--tg-text-secondary)]">PBKDF2 310k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--tg-text-muted)]">IV Length:</span>
                <span className="text-[var(--tg-text-secondary)]">96 bits</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--tg-text-muted)]">Auth Tag:</span>
                <span className="text-[var(--tg-text-secondary)]">128 bits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--tg-border)] text-center">
          <p className="text-xs text-[var(--tg-text-muted)]">
            TPChat is open-source software licensed under MIT License.
          </p>
          <p className="text-xs text-[var(--tg-text-muted)] mt-1">
            © 2024 MrTelepathic. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
