/**
 * TPChat Anti-Replay Protection
 * In-memory cache for detecting and preventing replay attacks
 */

import type { ReplayEntry } from '@/types/crypto';

// In-memory replay cache - never persisted
const replayCache = new Map<string, ReplayEntry>();

// Maximum cache size (prevent memory exhaustion)
const MAX_CACHE_SIZE = 10000;

// Cache expiration time (24 hours)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

let cleanupTimer: number | null = null;

/**
 * Initialize anti-replay system
 */
export function initAntiReplay(): void {
  startCleanupTimer();
}

/**
 * Check if message has been seen before (replay detection)
 */
export function isReplay(messageId: string, nonce: string): boolean {
  const key = `${messageId}:${nonce}`;
  return replayCache.has(key);
}

/**
 * Record message as seen
 */
export function recordMessage(
  messageId: string,
  nonce: string,
  timestamp: number
): void {
  const key = `${messageId}:${nonce}`;

  // Check cache size and evict oldest if needed
  if (replayCache.size >= MAX_CACHE_SIZE) {
    evictOldestEntries();
  }

  const entry: ReplayEntry = {
    messageId,
    timestamp,
    nonce,
  };

  replayCache.set(key, entry);
}

/**
 * Validate message and record if new
 * Returns true if message is valid (not a replay)
 */
export function validateMessage(
  messageId: string,
  nonce: string,
  timestamp: number
): boolean {
  // Check for replay
  if (isReplay(messageId, nonce)) {
    console.warn(`Replay attack detected: message ${messageId}`);
    return false;
  }

  // Check timestamp is reasonable (not too far in future or past)
  const now = Date.now();
  const messageTime = timestamp;

  // Reject messages from more than 5 minutes in the future
  if (messageTime > now + 5 * 60 * 1000) {
    console.warn(`Future timestamp detected: message ${messageId}`);
    return false;
  }

  // Reject messages older than 24 hours (with some buffer)
  if (messageTime < now - CACHE_EXPIRY) {
    console.warn(`Expired timestamp detected: message ${messageId}`);
    return false;
  }

  // Record this message
  recordMessage(messageId, nonce, timestamp);
  return true;
}

/**
 * Evict oldest entries when cache is full
 */
function evictOldestEntries(): void {
  const entries = Array.from(replayCache.entries());
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

  // Remove oldest 10% of entries
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
    if (now - entry.timestamp > CACHE_EXPIRY) {
      replayCache.delete(key);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`Anti-replay cache cleanup: removed ${removed} expired entries`);
  }
}

/**
 * Start periodic cleanup timer
 */
function startCleanupTimer(): void {
  if (cleanupTimer) {
    window.clearInterval(cleanupTimer);
  }

  cleanupTimer = window.setInterval(() => {
    cleanupExpiredEntries();
  }, CLEANUP_INTERVAL);
}

/**
 * Stop cleanup timer
 */
export function stopAntiReplay(): void {
  if (cleanupTimer) {
    window.clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
  replayCache.clear();
}

/**
 * Get cache statistics (for security audit)
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  expiryMs: number;
} {
  return {
    size: replayCache.size,
    maxSize: MAX_CACHE_SIZE,
    expiryMs: CACHE_EXPIRY,
  };
}

/**
 * Clear entire cache (for testing or emergency)
 */
export function clearCache(): void {
  replayCache.clear();
}

/**
 * Simulate replay attack for testing
 */
export function simulateReplayAttack(
  messageId: string,
  nonce: string,
  timestamp: number
): { detected: boolean; message: string } {
  // First, record the message normally
  recordMessage(messageId, nonce, timestamp);

  // Try to replay the same message
  const isReplayAttack = isReplay(messageId, nonce);

  return {
    detected: isReplayAttack,
    message: isReplayAttack
      ? 'Replay attack successfully detected and blocked'
      : 'Replay detection failed - security issue!',
  };
}
