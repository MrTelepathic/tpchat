/**
 * TPChat PBKDF2 Session Key Derivation
 * PBKDF2 SHA-256 with ≥310k iterations
 */

import { CRYPTO_CONSTANTS } from '@/types/crypto';

const { PBKDF2_ITERATIONS, SALT_LENGTH } = CRYPTO_CONSTANTS;

/**
 * Generate cryptographically secure random salt
 */
export function generateSalt(): ArrayBuffer {
  return window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Derive encryption key from password using PBKDF2
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: ArrayBuffer,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  // Import password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive AES-256-GCM key using PBKDF2
  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive multiple keys from password (encryption + HMAC)
 */
export async function deriveSessionKeys(
  password: string,
  salt: ArrayBuffer,
  iterations: number = PBKDF2_ITERATIONS
): Promise<{ encryptionKey: CryptoKey; hmacKey: CryptoKey }> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive 512 bits total (256 for encryption, 256 for HMAC)
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    512
  );

  // Split into two 256-bit keys
  const encKeyData = derivedBits.slice(0, 32);
  const hmacKeyData = derivedBits.slice(32, 64);

  // Import as CryptoKeys
  const [encryptionKey, hmacKey] = await Promise.all([
    window.crypto.subtle.importKey(
      'raw',
      encKeyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    ),
    window.crypto.subtle.importKey(
      'raw',
      hmacKeyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    ),
  ]);

  // Wipe derived bits from memory
  const encView = new Uint8Array(encKeyData);
  const hmacView = new Uint8Array(hmacKeyData);
  encView.fill(0);
  hmacView.fill(0);

  return { encryptionKey, hmacKey };
}

/**
 * Create password-based key with generated salt
 * Returns key and salt for storage
 */
export async function createPasswordKey(
  password: string,
  username: string
): Promise<{ key: CryptoKey; salt: ArrayBuffer; iterations: number }> {
  // Create salt from username + random entropy
  const randomSalt = generateSalt();
  const encoder = new TextEncoder();
  const usernameData = encoder.encode(username.toLowerCase().trim());

  // Combine username with random salt
  const combinedSalt = new Uint8Array(usernameData.byteLength + randomSalt.byteLength);
  combinedSalt.set(new Uint8Array(usernameData), 0);
  combinedSalt.set(new Uint8Array(randomSalt), usernameData.byteLength);

  // Hash combined salt to get fixed-length salt
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', combinedSalt);

  const key = await deriveKeyFromPassword(password, hashBuffer, PBKDF2_ITERATIONS);

  return {
    key,
    salt: hashBuffer,
    iterations: PBKDF2_ITERATIONS,
  };
}

/**
 * Calculate password strength score (0-100)
 */
export function calculatePasswordStrength(password: string): number {
  let score = 0;

  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^a-zA-Z0-9]/.test(password)) score += 20;

  // Check for common patterns
  const commonPatterns = ['123', 'abc', 'password', 'qwerty', '111'];
  const hasCommonPattern = commonPatterns.some((pattern) =>
    password.toLowerCase().includes(pattern)
  );
  if (!hasCommonPattern) score += 10;

  return Math.min(100, score);
}
