/**
 * TPChat Login Component
 * Username/password login with session initialization
 */

import React, { useState } from 'react';
import { Lock, User, Mail, Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { initializeSession } from '@/session/sessionManager';
import { calculatePasswordStrength } from '@/crypto/pbkdf2';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps): JSX.Element {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const passwordStrength = calculatePasswordStrength(password);
  const strengthColor =
    passwordStrength < 40
      ? 'bg-red-500'
      : passwordStrength < 70
      ? 'bg-yellow-500'
      : 'bg-green-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (isRegistering) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (passwordStrength < 40) {
        setError('Password is too weak. Please use a stronger password.');
        return;
      }

      if (!agreedToTerms) {
        setError('Please agree to the terms to continue');
        return;
      }
    }

    setIsLoading(true);

    try {
      // Initialize encrypted session
      await initializeSession(
        username.trim(),
        password,
        email.trim() || undefined
      );

      onLogin();
    } catch (err) {
      setError('Failed to initialize session. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--tg-bg-primary)] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--tg-accent)] to-purple-600 flex items-center justify-center mb-4 shadow-lg">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-10 h-10 text-white"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--tg-text-primary)]">
            TPChat
          </h1>
          <p className="text-sm text-[var(--tg-text-secondary)] mt-1">
            Zero-Trust Encrypted Messaging
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[var(--tg-bg-secondary)] rounded-2xl p-6 shadow-xl border border-[var(--tg-border)]">
          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 mb-6 p-2 bg-[var(--tg-accent)]/10 rounded-lg">
            <Shield className="w-4 h-4 text-[var(--tg-accent)]" />
            <span className="text-xs text-[var(--tg-accent)]">
              End-to-End Encrypted • No Data Collection
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[var(--tg-text-primary)]">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tg-text-muted)]" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-[var(--tg-bg-tertiary)] border-[var(--tg-border)] text-[var(--tg-text-primary)] placeholder:text-[var(--tg-text-muted)] focus-visible:ring-[var(--tg-accent)]"
                />
              </div>
            </div>

            {/* Email (Optional) */}
            {isRegistering && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[var(--tg-text-primary)]">
                  Email <span className="text-[var(--tg-text-muted)]">(optional)</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tg-text-muted)]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-[var(--tg-bg-tertiary)] border-[var(--tg-border)] text-[var(--tg-text-primary)] placeholder:text-[var(--tg-text-muted)] focus-visible:ring-[var(--tg-accent)]"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[var(--tg-text-primary)]">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tg-text-muted)]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-[var(--tg-bg-tertiary)] border-[var(--tg-border)] text-[var(--tg-text-primary)] placeholder:text-[var(--tg-text-muted)] focus-visible:ring-[var(--tg-accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tg-text-muted)] hover:text-[var(--tg-text-secondary)]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Password Strength */}
              {isRegistering && password && (
                <div className="space-y-1">
                  <div className="h-1 bg-[var(--tg-border)] rounded-full overflow-hidden">
                    <div
                      className={cn('h-full transition-all', strengthColor)}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--tg-text-muted)]">
                    Password strength:{' '}
                    {passwordStrength < 40
                      ? 'Weak'
                      : passwordStrength < 70
                      ? 'Medium'
                      : 'Strong'}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            {isRegistering && (
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-[var(--tg-text-primary)]"
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--tg-text-muted)]" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-[var(--tg-bg-tertiary)] border-[var(--tg-border)] text-[var(--tg-text-primary)] placeholder:text-[var(--tg-text-muted)] focus-visible:ring-[var(--tg-accent)]"
                  />
                </div>
              </div>
            )}

            {/* Terms Checkbox */}
            {isRegistering && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) =>
                    setAgreedToTerms(checked as boolean)
                  }
                  className="mt-1"
                />
                <Label
                  htmlFor="terms"
                  className="text-xs text-[var(--tg-text-secondary)] leading-relaxed cursor-pointer"
                >
                  I understand that TPChat uses client-side encryption. If I lose
                  my password, my data cannot be recovered. I agree to the{' '}
                  <span className="text-[var(--tg-accent)]">Terms of Service</span>{' '}
                  and{' '}
                  <span className="text-[var(--tg-accent)]">Privacy Policy</span>.
                </Label>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--tg-accent)] hover:bg-[var(--tg-accent-hover)] text-white"
            >
              {isLoading
                ? 'Please wait...'
                : isRegistering
                ? 'Create Account'
                : 'Sign In'}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-sm text-[var(--tg-accent)] hover:underline"
            >
              {isRegistering
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[var(--tg-text-muted)]">
            TPChat v1.0 • Zero-Trust Architecture
          </p>
          <p className="text-xs text-[var(--tg-text-muted)] mt-1">
            ECDH + AES-256-GCM • PBKDF2 310k iterations
          </p>
        </div>
      </div>
    </div>
  );
}
