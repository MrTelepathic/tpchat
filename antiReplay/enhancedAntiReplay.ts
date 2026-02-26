/**
 * TPChat Enhanced Anti-Replay Protection
 * Extended message structure with sender fingerprint
 */

import { CONFIG } from '@/config';
import type { MessagePayload } from '@/types/crypto';

// Extended message payload with anti-replay enhancements
export interface EnhancedMessagePayload extends MessagePayload {
  senderFingerprint: string; // Derived from public key hash
}

// Replay cache entry
interface ReplayEntry {
  messageId: string;
  timestamp: number;
  nonce: string;
  senderFingerprint: string;
  receivedAt: number;
}

// In-memory replay cache
const replayCache = new Map<string, ReplayEntry>();

// Configuration
const MAX_CACHE_SIZE = 10000;
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup interval
let cleanupInterval: number | null = null;

/**
 * Initialize enhanced anti-replay system
 */
export function initEnhancedAntiReplay(): void {
  if (cleanupInterval !== null) {
    return;
  }

  cleanupInterval = window.setInterval(() => {
    cleanupExpiredEntries();
  }, 5 * 60 * 1000); // Every 5 minutes

  console.log('Enhanced anti-replay system initialized');
}

/**
 * Stop anti-replay system
 */
export function stopEnhancedAntiReplay(): void {
  if (cleanupInterval !== null) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  replayCache.clear();
}

/**
 * Generate sender fingerprint from public key
 */
export async function generateSenderFingerprint(
  publicKey: ArrayBuffer
): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', publicKey);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

/**
 * Validate message for replay attack
 */
export function validateEnhancedMessage(
  messageId: string,
  nonce: string,
  timestamp: number,
  senderFingerprint: string
): { valid: boolean; reason?: string } {
  const now = Date.now();

  // Check 1: Message ID uniqueness
  const cacheKey = `${messageId}:${nonce}`;
  if (replayCache.has(cacheKey)) {
    return { valid: false, reason: 'Duplicate message ID' };
  }

  // Check 2: Timestamp not in future (with 5 minute buffer)
  if (timestamp > now + 5 * 60 * 1000) {
    return { valid: false, reason: 'Future timestamp' };
  }

  // Check 3: Timestamp not too old
  const threshold = CONFIG.REPLAY_TIMESTAMP_THRESHOLD;
  if (timestamp < now - threshold) {
    return { valid: false, reason: 'Expired timestamp' };
  }

  // Check 4: Sender fingerprint format
  if (!/^[a-f0-9]{32}$/i.test(senderFingerprint)) {
    return { valid: false, reason: 'Invalid sender fingerprint' };
  }

  // All checks passed, record message
  recordEnhancedMessage(messageId, nonce, timestamp, senderFingerprint);

  return { valid: true };
}

/**
 * Record message in replay cache
 */
function recordEnhancedMessage(
  messageId: string,
  nonce: string,
  timestamp: number,
  senderFingerprint: string
): void {
  // Evict oldest entries if cache is full
  if (replayCache.size >= MAX_CACHE_SIZE) {
    evictOldestEntries();
  }

  const cacheKey = `${messageId}:${nonce}`;
  const entry: ReplayEntry = {
    messageId,
    timestamp,
    nonce,
    senderFingerprint,
    receivedAt: Date.now(),
  };

  replayCache.set(cacheKey, entry);
}

/**
 * Evict oldest entries when cache is full
 */
function evictOldestEntries(): void {
  const entries = Array.from(replayCache.entries());
  entries.sort((a, b) => a[1].receivedAt - b[1].receivedAt);

  // Remove oldest 10%
  const toRemove = Math.floor(MAX_CACHE_SIZE * 0.1);
  for (let i = 0; i < toRemove && i < entries.length; i++) {
    replayCache.delete(entries[i][0]);
  }
}

/**
 * Clean up expired entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  let removed = 0;

  for (const [key, entry] of replayCache.entries()) {
    if (now - entry.receivedAt > CACHE_EXPIRY_MS) {
      replayCache.delete(key);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`Anti-replay cache cleanup: removed ${removed} expired entries`);
  }
}

/**
 * Check if message is a replay
 */
export function isReplay(messageId: string, nonce: string): boolean {
  const cacheKey = `${messageId}:${nonce}`;
  return replayCache.has(cacheKey);
}

/**
 * Get cache statistics
 */
export function getEnhancedCacheStats(): {
  size: number;
  maxSize: number;
  expiryMs: number;
  uniqueSenders: number;
} {
  const senderFingerprints = new Set<string>();
  for (const entry of replayCache.values()) {
    senderFingerprints.add(entry.senderFingerprint);
  }

  return {
    size: replayCache.size,
    maxSize: MAX_CACHE_SIZE,
    expiryMs: CACHE_EXPIRY_MS,
    uniqueSenders: senderFingerprints.size,
  };
}

/**
 * Get entries by sender fingerprint
 */
export function getEntriesBySender(senderFingerprint: string): ReplayEntry[] {
  return Array.from(replayCache.values()).filter(
    (entry) => entry.senderFingerprint === senderFingerprint
  );
}

/**
 * Clear entire cache
 */
export function clearEnhancedCache(): void {
  replayCache.clear();
  console.log('Anti-replay cache cleared');
}

/**
 * Simulate replay attack (for testing)
 */
export function simulateEnhancedReplayAttack(
  messageId: string,
  nonce: string,
  timestamp: number,
  senderFingerprint: string
): { detected: boolean; message: string } {
  // First, record the message normally
  const firstValidation = validateEnhancedMessage(
    messageId,
    nonce,
    timestamp,
    senderFingerprint
  );

  if (!firstValidation.valid) {
    return {
      detected: true,
      message: `Initial validation failed: ${firstValidation.reason}`,
    };
  }

  // Try to replay the same message
  const replayValidation = validateEnhancedMessage(
    messageId,
    nonce,
    timestamp,
    senderFingerprint
  );

  return {
    detected: !replayValidation.valid,
    message: replayValidation.valid
      ? 'Replay detection FAILED - security issue!'
      : `Replay detected: ${replayValidation.reason}`,
  };
}

/**
 * Simulate future timestamp attack (for testing)
 */
export function simulateFutureTimestampAttack(): {
  detected: boolean;
  message: string;
} {
  const futureTime = Date.now() + 10 * 60 * 1000; // 10 minutes in future
  const result = validateEnhancedMessage(
    crypto.randomUUID(),
    'test-nonce',
    futureTime,
    'a'.repeat(32)
  );

  return {
    detected: !result.valid,
    message: result.valid
      ? 'Future timestamp detection FAILED!'
      : `Future timestamp rejected: ${result.reason}`,
  };
}

/**
 * Simulate expired timestamp attack (for testing)
 */
export function simulateExpiredTimestampAttack(): {
  detected: boolean;
  message: string;
} {
  const expiredTime = Date.now() - CONFIG.REPLAY_TIMESTAMP_THRESHOLD - 60000;
  const result = validateEnhancedMessage(
    crypto.randomUUID(),
    'test-nonce',
    expiredTime,
    'a'.repeat(32)
  );

  return {
    detected: !result.valid,
    message: result.valid
      ? 'Expired timestamp detection FAILED!'
      : `Expired timestamp rejected: ${result.reason}`,
  };
}

/**
 * Export cache for audit (sanitized)
 */
export function exportCacheForAudit(): {
  totalEntries: number;
  timestampRange: { oldest: number; newest: number };
  uniqueSenders: number;
} {
  const entries = Array.from(replayCache.values());
  const timestamps = entries.map((e) => e.timestamp);
  const senderFingerprints = new Set(entries.map((e) => e.senderFingerprint));

  return {
    totalEntries: entries.length,
    timestampRange: {
      oldest: Math.min(...timestamps),
      newest: Math.max(...timestamps),
    },
    uniqueSenders: senderFingerprints.size,
  };
}
