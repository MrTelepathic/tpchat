/**
 * TPChat ECDH Key Exchange Implementation
 * Uses P-256 curve for ECDH key agreement
 */

import { CRYPTO_CONSTANTS, type KeyPair, type ExportedKeyPair } from '@/types/crypto';

const { ECDH_CURVE } = CRYPTO_CONSTANTS;

/**
 * Generate a new ECDH key pair
 */
export async function generateKeyPair(): Promise<KeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: ECDH_CURVE,
    },
    true, // extractable for session storage encryption
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Export key pair to ArrayBuffer for encrypted session storage
 */
export async function exportKeyPair(keyPair: KeyPair): Promise<ExportedKeyPair> {
  const [publicKey, privateKey] = await Promise.all([
    window.crypto.subtle.exportKey('raw', keyPair.publicKey),
    window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
  ]);

  return { publicKey, privateKey };
}

/**
 * Import public key from ArrayBuffer
 */
export async function importPublicKey(keyData: ArrayBuffer): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'ECDH',
      namedCurve: ECDH_CURVE,
    },
    true,
    []
  );
}

/**
 * Import private key from ArrayBuffer
 */
export async function importPrivateKey(keyData: ArrayBuffer): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'ECDH',
      namedCurve: ECDH_CURVE,
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Derive shared secret using ECDH
 */
export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  return await window.crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    256 // 256 bits for AES-256 key
  );
}

/**
 * Derive AES-GCM key from shared secret using HKDF
 */
export async function deriveAESKey(sharedSecret: ArrayBuffer): Promise<CryptoKey> {
  // First, import the shared secret as a key for HKDF
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  // Derive AES-256-GCM key using HKDF
  return await window.crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0), // Salt already handled in ECDH
      info: new TextEncoder().encode(CRYPTO_CONSTANTS.HKDF_INFO),
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: CRYPTO_CONSTANTS.AES_KEY_SIZE,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Complete key exchange: generate ephemeral keys and derive shared AES key
 */
export async function performKeyExchange(
  recipientPublicKey: CryptoKey
): Promise<{ ephemeralKeyPair: KeyPair; aesKey: CryptoKey }> {
  // Generate ephemeral key pair
  const ephemeralKeyPair = await generateKeyPair();

  // Derive shared secret
  const sharedSecret = await deriveSharedSecret(
    ephemeralKeyPair.privateKey,
    recipientPublicKey
  );

  // Derive AES key using HKDF
  const aesKey = await deriveAESKey(sharedSecret);

  // Securely wipe shared secret from memory
  wipeBuffer(sharedSecret);

  return { ephemeralKeyPair, aesKey };
}

/**
 * Derive AES key from own private key and sender's public key (for decryption)
 */
export async function deriveDecryptionKey(
  privateKey: CryptoKey,
  senderPublicKey: CryptoKey
): Promise<CryptoKey> {
  const sharedSecret = await deriveSharedSecret(privateKey, senderPublicKey);
  const aesKey = await deriveAESKey(sharedSecret);
  wipeBuffer(sharedSecret);
  return aesKey;
}

/**
 * Securely wipe a buffer by overwriting with zeros
 */
export function wipeBuffer(buffer: ArrayBuffer): void {
  const view = new Uint8Array(buffer);
  view.fill(0);
}

/**
 * Constant-time comparison of two ArrayBuffers
 * Prevents timing attacks
 */
export function constantTimeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  const viewA = new Uint8Array(a);
  const viewB = new Uint8Array(b);
  let result = 0;

  for (let i = 0; i < viewA.length; i++) {
    result |= viewA[i] ^ viewB[i];
  }

  return result === 0;
}
