/**
 * TPChat Session Manager
 * Encrypted session storage with RAM-only session keys
 */

import type { SessionData, EncryptedSession, SessionKeys } from '@/types/crypto';
import { CRYPTO_CONSTANTS } from '@/types/crypto';
import { generateSalt, deriveSessionKeys } from '@/crypto/pbkdf2';
import { arrayBufferToBase64, base64ToArrayBuffer } from '@/crypto/aes';

const SESSION_KEY = 'tpchat_session';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes inactivity timeout
const INACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute

// Session key only stored in RAM - never persisted
let ramSessionKey: CryptoKey | null = null;
let sessionKeys: SessionKeys | null = null;
let inactivityTimer: number | null = null;
let lastActivity: number = Date.now();

/**
 * Initialize session with username and password
 */
export async function initializeSession(
  username: string,
  password: string,
  email?: string
): Promise<void> {
  // Generate salt
  const salt = generateSalt();

  // Derive session keys from password
  const keys = await deriveSessionKeys(password, salt, CRYPTO_CONSTANTS.PBKDF2_ITERATIONS);
  sessionKeys = {
    encryptionKey: keys.encryptionKey,
    hmacKey: keys.hmacKey,
    derivedAt: Date.now(),
  };
  ramSessionKey = keys.encryptionKey;

  // Create session data (without sensitive keys)
  const sessionData: SessionData = {
    username: username.toLowerCase().trim(),
    email: email?.toLowerCase().trim(),
    publicKey: new ArrayBuffer(0), // Will be set after key generation
    privateKey: new ArrayBuffer(0), // Will be set after key generation
    theme: 'system',
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };

  // Encrypt and store session
  await encryptAndStoreSession(sessionData, keys.encryptionKey, salt);

  // Start inactivity monitoring
  startInactivityMonitor();

  // Set up unload handlers
  setupUnloadHandlers();
}

/**
 * Encrypt session data and store in sessionStorage
 */
async function encryptAndStoreSession(
  sessionData: SessionData,
  key: CryptoKey,
  salt: ArrayBuffer
): Promise<void> {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(sessionData));

  // Generate IV for this encryption
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt session data
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    key,
    plaintext
  );

  // Create encrypted session object
  const encryptedSession: EncryptedSession = {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
    iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS,
  };

  // Store in sessionStorage
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(encryptedSession));
}

/**
 * Decrypt session from storage
 */
async function decryptSession(
  encryptedSession: EncryptedSession,
  password: string,
  username: string
): Promise<SessionData> {
  // Recreate salt from username + stored salt
  const encoder = new TextEncoder();
  const usernameData = encoder.encode(username.toLowerCase().trim());
  const storedSalt = base64ToArrayBuffer(encryptedSession.salt);

  const combinedSalt = new Uint8Array(usernameData.byteLength + storedSalt.byteLength);
  combinedSalt.set(new Uint8Array(usernameData), 0);
  combinedSalt.set(new Uint8Array(storedSalt), usernameData.byteLength);

  const hashBuffer = await window.crypto.subtle.digest('SHA-256', combinedSalt);

  // Derive key
  const keys = await deriveSessionKeys(password, hashBuffer, encryptedSession.iterations);
  ramSessionKey = keys.encryptionKey;
  sessionKeys = {
    encryptionKey: keys.encryptionKey,
    hmacKey: keys.hmacKey,
    derivedAt: Date.now(),
  };

  // Decrypt session data
  const ciphertext = base64ToArrayBuffer(encryptedSession.ciphertext);
  const iv = base64ToArrayBuffer(encryptedSession.iv);

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    keys.encryptionKey,
    ciphertext
  );

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decrypted);
  const sessionData: SessionData = JSON.parse(jsonString);

  // Update last activity
  sessionData.lastActivity = Date.now();
  lastActivity = Date.now();

  // Re-encrypt with updated activity
  await encryptAndStoreSession(sessionData, keys.encryptionKey, storedSalt);

  return sessionData;
}

/**
 * Restore session from storage (requires password re-entry)
 */
export async function restoreSession(
  username: string,
  password: string
): Promise<SessionData | null> {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    const encryptedSession: EncryptedSession = JSON.parse(stored);
    const sessionData = await decryptSession(encryptedSession, password, username);

    // Start inactivity monitoring
    startInactivityMonitor();
    setupUnloadHandlers();

    return sessionData;
  } catch (error) {
    console.error('Session restoration failed:', error);
    return null;
  }
}

/**
 * Get current session data (decrypted)
 */
export async function getSessionData(): Promise<SessionData | null> {
  if (!ramSessionKey) return null;

  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    const encryptedSession: EncryptedSession = JSON.parse(stored);
    const ciphertext = base64ToArrayBuffer(encryptedSession.ciphertext);
    const iv = base64ToArrayBuffer(encryptedSession.iv);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      ramSessionKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decrypted);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to get session data:', error);
    return null;
  }
}

/**
 * Update session data
 */
export async function updateSessionData(
  updates: Partial<SessionData>
): Promise<void> {
  const currentData = await getSessionData();
  if (!currentData || !ramSessionKey) {
    throw new Error('No active session');
  }

  const updatedData: SessionData = {
    ...currentData,
    ...updates,
    lastActivity: Date.now(),
  };

  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) throw new Error('Session storage corrupted');

  const encryptedSession: EncryptedSession = JSON.parse(stored);
  const salt = base64ToArrayBuffer(encryptedSession.salt);

  await encryptAndStoreSession(updatedData, ramSessionKey, salt);
  recordActivity();
}

/**
 * Record user activity to prevent timeout
 */
export function recordActivity(): void {
  lastActivity = Date.now();
}

/**
 * Start inactivity monitoring
 */
function startInactivityMonitor(): void {
  if (inactivityTimer) {
    window.clearInterval(inactivityTimer);
  }

  inactivityTimer = window.setInterval(() => {
    const inactiveTime = Date.now() - lastActivity;
    if (inactiveTime > SESSION_TIMEOUT) {
      console.log('Session timed out due to inactivity');
      destroySession();
      window.location.reload();
    }
  }, INACTIVITY_CHECK_INTERVAL);
}

/**
 * Setup unload handlers to destroy session on tab close/refresh
 */
function setupUnloadHandlers(): void {
  // Destroy session on page unload (refresh, close, navigate away)
  window.addEventListener('beforeunload', () => {
    destroySession();
  });

  // Also handle visibility change (tab switch)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Optional: could add delay here for tab switching
      // For now, we keep session active
    }
  });
}

/**
 * Destroy session completely
 */
export function destroySession(): void {
  // Clear RAM session key
  ramSessionKey = null;
  sessionKeys = null;

  // Clear inactivity timer
  if (inactivityTimer) {
    window.clearInterval(inactivityTimer);
    inactivityTimer = null;
  }

  // Clear sessionStorage
  sessionStorage.removeItem(SESSION_KEY);

  // Clear all session-related data
  lastActivity = 0;
}

/**
 * Check if session is active
 */
export function isSessionActive(): boolean {
  return ramSessionKey !== null && sessionStorage.getItem(SESSION_KEY) !== null;
}

/**
 * Get session key (only available in RAM)
 */
export function getSessionKey(): CryptoKey | null {
  return ramSessionKey;
}

/**
 * Get session keys object
 */
export function getSessionKeys(): SessionKeys | null {
  return sessionKeys;
}

/**
 * Optional: Detect DevTools and destroy session
 * This is a basic implementation - can be enhanced
 */
export function setupDevToolsDetection(): void {
  const threshold = 160;

  const checkDevTools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;

    if (widthThreshold || heightThreshold) {
      console.warn('DevTools detected - destroying session');
      destroySession();
      window.location.reload();
    }
  };

  // Check periodically
  setInterval(checkDevTools, 1000);
}
