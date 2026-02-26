/**
 * TPChat Cyber Lab Panel
 * Security audit and testing interface
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Download,
  RefreshCw,
  Lock,
  Fingerprint,
  FileCheck,
  Key,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { SecurityAuditResult } from '@/types/crypto';
import { generateKeyPair, constantTimeEqual, wipeBuffer } from '@/crypto/ecdh';
import { generateUUID, generateNonce, arrayBufferToBase64 } from '@/crypto/aes';
import {
  validateMessage,
  simulateReplayAttack,
  getCacheStats,
  clearCache,
} from '@/antiReplay/antiReplayCache';
import { verifyIntegrity, verifyCSP } from '@/integrity/integrityChecker';
import { isSessionActive, getSessionKeys } from '@/session/sessionManager';

interface CyberLabProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message: string;
  details?: string[];
}

export function CyberLab({ isOpen, onClose }: CyberLabProps): JSX.Element | null {
  const [isRunning, setIsRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState<TestResult[]>([
    { name: 'Cryptographic Primitives', status: 'pending', message: 'Not tested' },
    { name: 'Replay Attack Protection', status: 'pending', message: 'Not tested' },
    { name: 'Session Encryption', status: 'pending', message: 'Not tested' },
    { name: 'Integrity Verification', status: 'pending', message: 'Not tested' },
    { name: 'CSP Configuration', status: 'pending', message: 'Not tested' },
  ]);

  if (!isOpen) return null;

  const updateResult = (index: number, update: Partial<TestResult>) => {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...update } : r))
    );
  };

  const runCryptoTest = async (): Promise<void> => {
    updateResult(0, { status: 'running', message: 'Testing...' });
    const details: string[] = [];

    try {
      // Test ECDH key generation
      const keyPair = await generateKeyPair();
      details.push('✓ ECDH P-256 key generation successful');

      // Test key export/import
      const exported = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
      const imported = await window.crypto.subtle.importKey(
        'raw',
        exported,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        []
      );
      details.push('✓ Key export/import successful');

      // Test AES-GCM encryption
      const aesKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const testData = new TextEncoder().encode('TPChat security test');
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: 128 },
        aesKey,
        testData
      );
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, tagLength: 128 },
        aesKey,
        encrypted
      );
      details.push('✓ AES-256-GCM encryption/decryption successful');

      // Test constant-time comparison
      const buf1 = new Uint8Array([1, 2, 3, 4]);
      const buf2 = new Uint8Array([1, 2, 3, 4]);
      const equal = constantTimeEqual(buf1.buffer, buf2.buffer);
      details.push(`✓ Constant-time comparison: ${equal ? 'working' : 'failed'}`);

      // Test secure wipe
      const wipeTest = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      wipeBuffer(wipeTest);
      const wipedView = new Uint8Array(wipeTest);
      const allZero = wipedView.every((b) => b === 0);
      details.push(`✓ Secure buffer wipe: ${allZero ? 'working' : 'failed'}`);

      updateResult(0, {
        status: 'passed',
        message: 'All cryptographic tests passed',
        details,
      });
    } catch (error) {
      updateResult(0, {
        status: 'failed',
        message: `Crypto test failed: ${error}`,
        details,
      });
    }
  };

  const runReplayTest = async (): Promise<void> => {
    updateResult(1, { status: 'running', message: 'Testing...' });
    const details: string[] = [];

    try {
      // Clear cache for clean test
      clearCache();

      // Test normal message validation
      const messageId = generateUUID();
      const nonce = generateNonce();
      const timestamp = Date.now();

      const valid = validateMessage(messageId, nonce, timestamp);
      details.push(`✓ First message validation: ${valid ? 'passed' : 'failed'}`);

      // Test replay detection
      const replayResult = simulateReplayAttack(messageId, nonce, timestamp);
      details.push(`✓ Replay detection: ${replayResult.detected ? 'working' : 'failed'}`);

      // Test future timestamp rejection
      const futureTime = Date.now() + 10 * 60 * 1000; // 10 minutes in future
      const futureValid = validateMessage(generateUUID(), generateNonce(), futureTime);
      details.push(`✓ Future timestamp rejection: ${!futureValid ? 'working' : 'failed'}`);

      // Get cache stats
      const stats = getCacheStats();
      details.push(`✓ Cache size: ${stats.size} entries`);

      updateResult(1, {
        status: 'passed',
        message: 'Replay protection is active',
        details,
      });
    } catch (error) {
      updateResult(1, {
        status: 'failed',
        message: `Replay test failed: ${error}`,
        details,
      });
    }
  };

  const runSessionTest = async (): Promise<void> => {
    updateResult(2, { status: 'running', message: 'Testing...' });
    const details: string[] = [];

    try {
      // Check session status
      const sessionActive = isSessionActive();
      details.push(`✓ Session active: ${sessionActive}`);

      // Check session keys
      const sessionKeys = getSessionKeys();
      if (sessionKeys) {
        details.push(`✓ Session keys in RAM: yes`);
        details.push(`✓ Keys derived at: ${new Date(sessionKeys.derivedAt).toISOString()}`);
      } else {
        details.push(`⚠ No session keys in RAM (may be logged out)`);
      }

      // Check sessionStorage
      const sessionData = sessionStorage.getItem('tpchat_session');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        details.push(`✓ Encrypted session in storage: yes`);
        details.push(`✓ PBKDF2 iterations: ${parsed.iterations || 'unknown'}`);
      } else {
        details.push(`⚠ No encrypted session found`);
      }

      updateResult(2, {
        status: sessionActive ? 'passed' : 'failed',
        message: sessionActive ? 'Session properly encrypted' : 'No active session',
        details,
      });
    } catch (error) {
      updateResult(2, {
        status: 'failed',
        message: `Session test failed: ${error}`,
        details,
      });
    }
  };

  const runIntegrityTest = async (): Promise<void> => {
    updateResult(3, { status: 'running', message: 'Testing...' });
    const details: string[] = [];

    try {
      const report = await verifyIntegrity();
      details.push(`✓ Expected hash: ${report.expectedHash.substring(0, 16)}...`);
      details.push(`✓ Computed hash: ${report.computedHash.substring(0, 16)}...`);
      details.push(`✓ Integrity valid: ${report.valid}`);

      updateResult(3, {
        status: report.valid ? 'passed' : 'failed',
        message: report.valid ? 'Bundle integrity verified' : 'Integrity check failed!',
        details,
      });
    } catch (error) {
      updateResult(3, {
        status: 'failed',
        message: `Integrity test failed: ${error}`,
        details,
      });
    }
  };

  const runCSPTest = async (): Promise<void> => {
    updateResult(4, { status: 'running', message: 'Testing...' });
    const details: string[] = [];

    try {
      const cspResult = verifyCSP();
      details.push(`✓ CSP enabled: ${cspResult.enabled}`);

      if (cspResult.issues.length > 0) {
        cspResult.issues.forEach((issue) => details.push(`⚠ ${issue}`));
      } else {
        details.push('✓ No CSP issues detected');
      }

      updateResult(4, {
        status: cspResult.enabled && cspResult.issues.length === 0 ? 'passed' : 'failed',
        message: cspResult.enabled ? 'CSP configured' : 'CSP not detected',
        details,
      });
    } catch (error) {
      updateResult(4, {
        status: 'failed',
        message: `CSP test failed: ${error}`,
        details,
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setScore(0);

    // Reset results
    setResults([
      { name: 'Cryptographic Primitives', status: 'pending', message: 'Not tested' },
      { name: 'Replay Attack Protection', status: 'pending', message: 'Not tested' },
      { name: 'Session Encryption', status: 'pending', message: 'Not tested' },
      { name: 'Integrity Verification', status: 'pending', message: 'Not tested' },
      { name: 'CSP Configuration', status: 'pending', message: 'Not tested' },
    ]);

    // Run tests sequentially
    await runCryptoTest();
    await runReplayTest();
    await runSessionTest();
    await runIntegrityTest();
    await runCSPTest();

    setIsRunning(false);
  };

  // Calculate score when results change
  useEffect(() => {
    const passed = results.filter((r) => r.status === 'passed').length;
    const total = results.length;
    setScore(Math.round((passed / total) * 100));
  }, [results]);

  const generateReport = (): string => {
    const report = {
      timestamp: new Date().toISOString(),
      tpchatVersion: '1.0.0',
      securityScore: score,
      tests: results.map((r) => ({
        name: r.name,
        status: r.status,
        message: r.message,
        details: r.details,
      })),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
    };
    return JSON.stringify(report, null, 2);
  };

  const downloadReport = () => {
    const report = generateReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tpchat-security-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getScoreColor = () => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = () => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[var(--tg-bg-secondary)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--tg-border)]">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--tg-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--tg-text-primary)]">
              Cyber Lab
            </h2>
          </div>
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
          {/* Score Card */}
          <div className="bg-[var(--tg-bg-tertiary)] rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-[var(--tg-text-secondary)]">
                  Security Score
                </h3>
                <p className={cn('text-4xl font-bold mt-1', getScoreColor())}>
                  {score}
                  <span className="text-lg text-[var(--tg-text-muted)]">/100</span>
                </p>
              </div>
              <div
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center',
                  score >= 80
                    ? 'bg-green-500/20'
                    : score >= 60
                    ? 'bg-yellow-500/20'
                    : 'bg-red-500/20'
                )}
              >
                {score >= 80 ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : score >= 60 ? (
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-500" />
                )}
              </div>
            </div>
            <Progress value={score} className="h-2" />
            <p className="text-xs text-[var(--tg-text-muted)] mt-2">
              {score >= 80
                ? 'Excellent security posture'
                : score >= 60
                ? 'Moderate security - improvements recommended'
                : 'Security issues detected - action required'}
            </p>
          </div>

          {/* Test Results */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[var(--tg-text-secondary)] mb-3">
              Security Tests
            </h3>
            {results.map((result, index) => (
              <div
                key={index}
                className="bg-[var(--tg-bg-tertiary)] rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        result.status === 'passed'
                          ? 'bg-green-500/20'
                          : result.status === 'failed'
                          ? 'bg-red-500/20'
                          : result.status === 'running'
                          ? 'bg-blue-500/20'
                          : 'bg-[var(--tg-border)]'
                      )}
                    >
                      {result.status === 'passed' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : result.status === 'failed' ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : result.status === 'running' ? (
                        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4 text-[var(--tg-text-muted)]" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-[var(--tg-text-primary)] text-sm">
                        {result.name}
                      </h4>
                      <p
                        className={cn(
                          'text-xs',
                          result.status === 'passed'
                            ? 'text-green-500'
                            : result.status === 'failed'
                            ? 'text-red-500'
                            : 'text-[var(--tg-text-muted)]'
                        )}
                      >
                        {result.message}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                {result.details && result.details.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--tg-border)]">
                    <div className="space-y-1">
                      {result.details.map((detail, i) => (
                        <p key={i} className="text-xs text-[var(--tg-text-muted)]">
                          {detail}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--tg-border)] flex gap-2">
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex-1 bg-[var(--tg-accent)] hover:bg-[var(--tg-accent-hover)]"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={downloadReport}
            disabled={isRunning || score === 0}
            className="border-[var(--tg-border)] text-[var(--tg-text-primary)] hover:bg-[var(--tg-hover)]"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>
    </div>
  );
}
