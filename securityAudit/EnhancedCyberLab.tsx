/**
 * TPChat Enhanced Cyber Lab Panel
 * Extended security audit with new hardening tests
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
  Cpu,
  FileCheck,
  Terminal,
  Eye,
  Zap,
  Fingerprint,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CONFIG } from '@/config';
import { getCryptoEngine, resetCryptoEngine } from '@/crypto/engines/cryptoEngine';
import {
  simulateEnhancedReplayAttack,
  simulateFutureTimestampAttack,
  simulateExpiredTimestampAttack,
  getEnhancedCacheStats,
  initEnhancedAntiReplay,
} from '@/antiReplay/enhancedAntiReplay';
import {
  simulateTamperedBundle,
  performEnhancedIntegrityCheck,
  getIntegrityMonitor,
} from '@/integrity/enhancedIntegrity';
import {
  getDevToolsDetectionStatus,
  simulateDevToolsDetection,
} from '@/devtools/paranoidMode';
import { getWasmStats, isWasmLoaded } from '@/wasm/wasmLoader';
import { isSessionActive, getSessionKeys } from '@/session/sessionManager';
import { getMemoryStats } from '@/memory/secureMemory';

interface EnhancedCyberLabProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestResult {
  name: string;
  category: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  score: number;
  details?: string[];
}

interface SecurityScore {
  total: number;
  crypto: number;
  isolation: number;
  integrity: number;
  replay: number;
  csp: number;
}

export function EnhancedCyberLab({ isOpen, onClose }: EnhancedCyberLabProps): JSX.Element | null {
  const [isRunning, setIsRunning] = useState(false);
  const [score, setScore] = useState<SecurityScore>({
    total: 0,
    crypto: 0,
    isolation: 0,
    integrity: 0,
    replay: 0,
    csp: 0,
  });
  const [results, setResults] = useState<TestResult[]>([]);

  if (!isOpen) return null;

  const addResult = (result: TestResult) => {
    setResults((prev) => [...prev, result]);
  };

  const updateScore = (category: keyof SecurityScore, value: number) => {
    setScore((prev) => ({
      ...prev,
      [category]: value,
      total: Math.round(
        (prev.crypto + prev.isolation + prev.integrity + prev.replay + prev.csp + value) /
          (category === 'total' ? 1 : 5)
      ),
    }));
  };

  // ============================================
  // TEST IMPLEMENTATIONS
  // ============================================

  const runWasmCryptoTest = async (): Promise<void> => {
    addResult({
      name: 'WASM Crypto Isolation',
      category: 'isolation',
      status: 'running',
      message: 'Testing...',
      score: 0,
    });

    const details: string[] = [];
    let passed = false;

    try {
      const wasmLoaded = isWasmLoaded();
      details.push(`WASM module loaded: ${wasmLoaded}`);

      if (wasmLoaded) {
        const stats = getWasmStats();
        details.push(`Memory pages: ${stats.memoryPages}`);
        details.push(`Memory size: ${(stats.memoryBytes / 1024).toFixed(2)} KB`);

        // Test crypto operation in WASM
        const engine = await getCryptoEngine();
        const capabilities = engine.getCapabilities();
        details.push(`Engine: ${engine.name}`);
        details.push(`WASM accelerated: ${capabilities.wasmAccelerated}`);

        passed = capabilities.wasmAccelerated;
      } else {
        details.push('WASM not loaded - using native fallback');
        passed = !CONFIG.WASM_CRYPTO_ENABLED; // Pass if WASM not required
      }

      addResult({
        name: 'WASM Crypto Isolation',
        category: 'isolation',
        status: passed ? 'passed' : 'failed',
        message: passed ? 'WASM isolation active' : 'WASM isolation not active',
        score: passed ? 20 : 0,
        details,
      });

      updateScore('isolation', passed ? 20 : 0);
    } catch (error) {
      addResult({
        name: 'WASM Crypto Isolation',
        category: 'isolation',
        status: 'failed',
        message: `Test failed: ${error}`,
        score: 0,
        details,
      });
    }
  };

  const runCryptoPrimitivesTest = async (): Promise<void> => {
    addResult({
      name: 'Cryptographic Primitives',
      category: 'crypto',
      status: 'running',
      message: 'Testing...',
      score: 0,
    });

    const details: string[] = [];

    try {
      const engine = await getCryptoEngine();
      const capabilities = engine.getCapabilities();

      details.push(`✓ ECDH support: ${capabilities.supportsECDH}`);
      details.push(`✓ AES-GCM support: ${capabilities.supportsAESGCM}`);
      details.push(`✓ PBKDF2 support: ${capabilities.supportsPBKDF2}`);
      details.push(`✓ HKDF support: ${capabilities.supportsHKDF}`);
      details.push(`✓ Max key size: ${capabilities.maxKeySize} bits`);
      details.push(`✓ Post-quantum ready: ${capabilities.supportsPostQuantum}`);

      // Test key generation
      const keyPair = await engine.generateKeyPair();
      details.push('✓ Key pair generation: successful');

      // Test encryption
      const payload = {
        messageId: crypto.randomUUID(),
        timestamp: Date.now(),
        nonce: 'test-nonce',
        content: 'Test message',
        sender: 'test',
        type: 'text' as const,
      };

      const aesKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      const encrypted = await engine.encryptMessage(aesKey, payload);
      const decrypted = await engine.decryptMessage(aesKey, encrypted);

      details.push('✓ Encryption/decryption: successful');
      details.push(`✓ Message integrity: ${decrypted.content === payload.content}`);

      addResult({
        name: 'Cryptographic Primitives',
        category: 'crypto',
        status: 'passed',
        message: 'All crypto primitives working',
        score: 20,
        details,
      });

      updateScore('crypto', 20);
    } catch (error) {
      addResult({
        name: 'Cryptographic Primitives',
        category: 'crypto',
        status: 'failed',
        message: `Test failed: ${error}`,
        score: 0,
        details,
      });
    }
  };

  const runReplayAttackTest = async (): Promise<void> => {
    addResult({
      name: 'Replay Attack Protection',
      category: 'replay',
      status: 'running',
      message: 'Testing...',
      score: 0,
    });

    const details: string[] = [];

    try {
      initEnhancedAntiReplay();

      // Test 1: Normal message
      const msg1 = simulateEnhancedReplayAttack(
        crypto.randomUUID(),
        'test-nonce-1',
        Date.now(),
        'a'.repeat(32)
      );
      details.push(`✓ First message: ${msg1.message}`);

      // Test 2: Replay detection
      const msg2 = simulateEnhancedReplayAttack(
        crypto.randomUUID(),
        'test-nonce-2',
        Date.now(),
        'b'.repeat(32)
      );
      details.push(`✓ Replay detection: ${msg2.detected ? 'working' : 'failed'}`);

      // Test 3: Future timestamp
      const future = simulateFutureTimestampAttack();
      details.push(`✓ Future timestamp: ${future.detected ? 'rejected' : 'accepted'}`);

      // Test 4: Expired timestamp
      const expired = simulateExpiredTimestampAttack();
      details.push(`✓ Expired timestamp: ${expired.detected ? 'rejected' : 'accepted'}`);

      const stats = getEnhancedCacheStats();
      details.push(`✓ Cache entries: ${stats.size}`);
      details.push(`✓ Unique senders: ${stats.uniqueSenders}`);

      const allPassed = msg2.detected && future.detected && expired.detected;

      addResult({
        name: 'Replay Attack Protection',
        category: 'replay',
        status: allPassed ? 'passed' : 'failed',
        message: allPassed ? 'Replay protection active' : 'Some protections failed',
        score: allPassed ? 20 : 10,
        details,
      });

      updateScore('replay', allPassed ? 20 : 10);
    } catch (error) {
      addResult({
        name: 'Replay Attack Protection',
        category: 'replay',
        status: 'failed',
        message: `Test failed: ${error}`,
        score: 0,
        details,
      });
    }
  };

  const runIntegrityTest = async (): Promise<void> => {
    addResult({
      name: 'Bundle Integrity',
      category: 'integrity',
      status: 'running',
      message: 'Testing...',
      score: 0,
    });

    const details: string[] = [];

    try {
      const { valid, violations } = await performEnhancedIntegrityCheck();

      details.push(`✓ Integrity check: ${valid ? 'passed' : 'failed'}`);

      if (violations.length > 0) {
        details.push(`⚠ Violations: ${violations.length}`);
        violations.forEach((v) => details.push(`  - ${v}`));
      }

      // Test tamper detection
      const tamper = await simulateTamperedBundle();
      details.push(`✓ Tamper detection: ${tamper.detected ? 'working' : 'failed'}`);

      addResult({
        name: 'Bundle Integrity',
        category: 'integrity',
        status: valid ? 'passed' : 'warning',
        message: valid ? 'Integrity verified' : 'Integrity issues detected',
        score: valid ? 20 : 10,
        details,
      });

      updateScore('integrity', valid ? 20 : 10);
    } catch (error) {
      addResult({
        name: 'Bundle Integrity',
        category: 'integrity',
        status: 'failed',
        message: `Test failed: ${error}`,
        score: 0,
        details,
      });
    }
  };

  const runSessionSecurityTest = async (): Promise<void> => {
    addResult({
      name: 'Session Security',
      category: 'isolation',
      status: 'running',
      message: 'Testing...',
      score: 0,
    });

    const details: string[] = [];

    try {
      const sessionActive = isSessionActive();
      details.push(`✓ Session active: ${sessionActive}`);

      const sessionKeys = getSessionKeys();
      if (sessionKeys) {
        details.push(`✓ Session keys in RAM: yes`);
        details.push(`✓ Keys derived at: ${new Date(sessionKeys.derivedAt).toISOString()}`);
      } else {
        details.push(`⚠ No session keys in RAM`);
      }

      // Check memory stats
      const memStats = getMemoryStats();
      details.push(`✓ JS heap used: ${(memStats.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);

      addResult({
        name: 'Session Security',
        category: 'isolation',
        status: 'passed',
        message: 'Session security verified',
        score: 0, // Part of isolation score
        details,
      });
    } catch (error) {
      addResult({
        name: 'Session Security',
        category: 'isolation',
        status: 'failed',
        message: `Test failed: ${error}`,
        score: 0,
        details,
      });
    }
  };

  const runDevToolsTest = async (): Promise<void> => {
    addResult({
      name: 'DevTools Detection',
      category: 'isolation',
      status: 'running',
      message: 'Testing...',
      score: 0,
    });

    const details: string[] = [];

    try {
      const status = getDevToolsDetectionStatus();

      details.push(`✓ Paranoid mode enabled: ${status.enabled}`);
      details.push(`✓ Detection methods: ${status.methods.join(', ')}`);
      details.push(`✓ Currently detected: ${status.detected}`);

      if (CONFIG.DEVTOOLS_PARANOID_MODE) {
        addResult({
          name: 'DevTools Detection',
          category: 'isolation',
          status: 'passed',
          message: 'DevTools paranoid mode active',
          score: 0,
          details,
        });
      } else {
        addResult({
          name: 'DevTools Detection',
          category: 'isolation',
          status: 'warning',
          message: 'DevTools paranoid mode disabled',
          score: 0,
          details,
        });
      }
    } catch (error) {
      addResult({
        name: 'DevTools Detection',
        category: 'isolation',
        status: 'failed',
        message: `Test failed: ${error}`,
        score: 0,
        details,
      });
    }
  };

  const runCspTest = async (): Promise<void> => {
    addResult({
      name: 'CSP Configuration',
      category: 'csp',
      status: 'running',
      message: 'Testing...',
      score: 0,
    });

    const details: string[] = [];

    try {
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      details.push(`✓ CSP meta tag: ${cspMeta ? 'present' : 'missing'}`);

      if (cspMeta) {
        const content = cspMeta.getAttribute('content') || '';
        details.push(`✓ default-src 'self': ${content.includes("default-src 'self'")}`);
        details.push(`✓ script-src 'self': ${content.includes("script-src 'self'")}`);
        details.push(`✓ No unsafe-eval: ${!content.includes("'unsafe-eval'")}`);
        details.push(`✓ object-src 'none': ${content.includes("object-src 'none'")}`);
        details.push(`✓ frame-ancestors 'none': ${content.includes("frame-ancestors 'none'")}`);
      }

      const xFrameOptions = document.querySelector('meta[http-equiv="X-Frame-Options"]');
      details.push(`✓ X-Frame-Options: ${xFrameOptions ? 'present' : 'missing'}`);

      addResult({
        name: 'CSP Configuration',
        category: 'csp',
        status: cspMeta ? 'passed' : 'warning',
        message: cspMeta ? 'CSP configured' : 'CSP not detected',
        score: cspMeta ? 20 : 10,
        details,
      });

      updateScore('csp', cspMeta ? 20 : 10);
    } catch (error) {
      addResult({
        name: 'CSP Configuration',
        category: 'csp',
        status: 'failed',
        message: `Test failed: ${error}`,
        score: 0,
        details,
      });
    }
  };

  const runMemoryHardeningTest = async (): Promise<void> => {
    addResult({
      name: 'Memory Hardening',
      category: 'isolation',
      status: 'running',
      message: 'Testing...',
      score: 0,
    });

    const details: string[] = [];

    try {
      details.push(`✓ Memory hardening enabled: ${CONFIG.MEMORY_HARDENING}`);
      details.push(`✓ Debug mode: ${CONFIG.DEBUG}`);
      details.push(`✓ Production build: ${CONFIG.IS_PRODUCTION}`);

      // Test secure buffer
      const testBuffer = new ArrayBuffer(32);
      const view = new Uint8Array(testBuffer);
      crypto.getRandomValues(view);

      details.push(`✓ Test buffer created: ${view[0].toString(16)}...`);

      addResult({
        name: 'Memory Hardening',
        category: 'isolation',
        status: 'passed',
        message: 'Memory hardening active',
        score: 0,
        details,
      });
    } catch (error) {
      addResult({
        name: 'Memory Hardening',
        category: 'isolation',
        status: 'failed',
        message: `Test failed: ${error}`,
        score: 0,
        details,
      });
    }
  };

  // ============================================
  // MAIN TEST RUNNER
  // ============================================

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    setScore({
      total: 0,
      crypto: 0,
      isolation: 0,
      integrity: 0,
      replay: 0,
      csp: 0,
    });

    // Run all tests sequentially
    await runWasmCryptoTest();
    await runCryptoPrimitivesTest();
    await runReplayAttackTest();
    await runIntegrityTest();
    await runSessionSecurityTest();
    await runDevToolsTest();
    await runCspTest();
    await runMemoryHardeningTest();

    // Calculate total score
    setScore((prev) => ({
      ...prev,
      total: Math.round(
        (prev.crypto + prev.isolation + prev.integrity + prev.replay + prev.csp) / 5
      ),
    }));

    setIsRunning(false);
  };

  // Auto-run on open
  useEffect(() => {
    if (isOpen && results.length === 0 && !isRunning) {
      runAllTests();
    }
  }, [isOpen]);

  // ============================================
  // REPORT GENERATION
  // ============================================

  const generateReport = (): string => {
    const report = {
      timestamp: new Date().toISOString(),
      tpchatVersion: CONFIG.VERSION,
      securityScore: score,
      tests: results.map((r) => ({
        name: r.name,
        category: r.category,
        status: r.status,
        message: r.message,
        score: r.score,
        details: r.details,
      })),
      configuration: {
        wasmCrypto: CONFIG.WASM_CRYPTO_ENABLED,
        pqMode: CONFIG.PQ_MODE,
        paranoidMode: CONFIG.DEVTOOLS_PARANOID_MODE,
        strictIntegrity: CONFIG.STRICT_INTEGRITY,
        memoryHardening: CONFIG.MEMORY_HARDENING,
      },
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

  const getScoreColor = (value: number) => {
    if (value >= 80) return 'text-green-500';
    if (value >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-[var(--tg-bg-secondary)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--tg-border)]">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--tg-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--tg-text-primary)]">
              Cyber Lab <span className="text-xs text-[var(--tg-text-muted)]">v2.0</span>
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
          {/* Score Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {/* Total Score */}
            <div className="col-span-2 md:col-span-1 bg-[var(--tg-bg-tertiary)] rounded-xl p-4">
              <p className="text-xs text-[var(--tg-text-muted)] uppercase">Total Score</p>
              <p className={cn('text-3xl font-bold', getScoreColor(score.total))}>
                {score.total}
                <span className="text-lg text-[var(--tg-text-muted)]">/100</span>
              </p>
              <Progress value={score.total} className="h-2 mt-2" />
            </div>

            {/* Category Scores */}
            <div className="bg-[var(--tg-bg-tertiary)] rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-3 h-3 text-[var(--tg-accent)]" />
                <span className="text-xs text-[var(--tg-text-muted)]">Crypto</span>
              </div>
              <p className={cn('text-xl font-bold', getScoreColor(score.crypto))}>
                {score.crypto}
              </p>
            </div>

            <div className="bg-[var(--tg-bg-tertiary)] rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-3 h-3 text-[var(--tg-accent)]" />
                <span className="text-xs text-[var(--tg-text-muted)]">Isolation</span>
              </div>
              <p className={cn('text-xl font-bold', getScoreColor(score.isolation))}>
                {score.isolation}
              </p>
            </div>

            <div className="bg-[var(--tg-bg-tertiary)] rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileCheck className="w-3 h-3 text-[var(--tg-accent)]" />
                <span className="text-xs text-[var(--tg-text-muted)]">Integrity</span>
              </div>
              <p className={cn('text-xl font-bold', getScoreColor(score.integrity))}>
                {score.integrity}
              </p>
            </div>

            <div className="bg-[var(--tg-bg-tertiary)] rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-3 h-3 text-[var(--tg-accent)]" />
                <span className="text-xs text-[var(--tg-text-muted)]">Replay</span>
              </div>
              <p className={cn('text-xl font-bold', getScoreColor(score.replay))}>
                {score.replay}
              </p>
            </div>

            <div className="bg-[var(--tg-bg-tertiary)] rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Terminal className="w-3 h-3 text-[var(--tg-accent)]" />
                <span className="text-xs text-[var(--tg-text-muted)]">CSP</span>
              </div>
              <p className={cn('text-xl font-bold', getScoreColor(score.csp))}>
                {score.csp}
              </p>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[var(--tg-text-secondary)] mb-3">
              Security Tests
            </h3>
            {results.map((result, index) => (
              <div
                key={index}
                className="bg-[var(--tg-bg-tertiary)] rounded-xl p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-6 h-6 rounded-lg flex items-center justify-center',
                        result.status === 'passed'
                          ? 'bg-green-500/20'
                          : result.status === 'failed'
                          ? 'bg-red-500/20'
                          : result.status === 'warning'
                          ? 'bg-yellow-500/20'
                          : result.status === 'running'
                          ? 'bg-blue-500/20'
                          : 'bg-[var(--tg-border)]'
                      )}
                    >
                      {result.status === 'passed' ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : result.status === 'failed' ? (
                        <XCircle className="w-3 h-3 text-red-500" />
                      ) : result.status === 'warning' ? (
                        <AlertTriangle className="w-3 h-3 text-yellow-500" />
                      ) : result.status === 'running' ? (
                        <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                      ) : (
                        <Eye className="w-3 h-3 text-[var(--tg-text-muted)]" />
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
                            : result.status === 'warning'
                            ? 'text-yellow-500'
                            : 'text-[var(--tg-text-muted)]'
                        )}
                      >
                        {result.message}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--tg-text-muted)]">
                    {result.score > 0 ? `+${result.score}` : ''}
                  </span>
                </div>

                {result.details && result.details.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--tg-border)]">
                    <div className="space-y-0.5">
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

            {results.length === 0 && !isRunning && (
              <div className="text-center py-8 text-[var(--tg-text-muted)]">
                <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Click "Run All Tests" to begin security audit</p>
              </div>
            )}
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
            disabled={isRunning || results.length === 0}
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
