/**
 * TPChat Cryptographic Types
 * Zero-Trust End-to-End Encryption
 */

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface ExportedKeyPair {
  publicKey: ArrayBuffer;
  privateKey: ArrayBuffer;
}

export interface EncryptedMessage {
  ciphertext: ArrayBuffer;
  iv: ArrayBuffer;
  tag: ArrayBuffer;
  encryptedKey: ArrayBuffer;
}

export interface SerializedEncryptedMessage {
  ciphertext: string;
  iv: string;
  tag: string;
  encryptedKey: string;
}

export interface MessagePayload {
  messageId: string;
  timestamp: number;
  nonce: string;
  content: string;
  sender: string;
  type: 'text' | 'voice' | 'video' | 'file';
}

export interface EncryptedPayload {
  encryptedData: SerializedEncryptedMessage;
  messageId: string;
  timestamp: number;
  senderPublicKey: string;
}

export interface SessionKeys {
  encryptionKey: CryptoKey;
  hmacKey: CryptoKey;
  derivedAt: number;
}

export interface SessionData {
  username: string;
  email?: string;
  publicKey: ArrayBuffer;
  privateKey: ArrayBuffer;
  theme: 'light' | 'dark' | 'system';
  createdAt: number;
  lastActivity: number;
}

export interface EncryptedSession {
  ciphertext: string;
  iv: string;
  salt: string;
  iterations: number;
}

export interface ReplayEntry {
  messageId: string;
  timestamp: number;
  nonce: string;
}

export interface IntegrityReport {
  expectedHash: string;
  computedHash: string;
  valid: boolean;
  timestamp: number;
}

export interface SecurityAuditResult {
  cryptoValid: boolean;
  replayProtectionActive: boolean;
  integrityValid: boolean;
  sessionEncrypted: boolean;
  cspEnabled: boolean;
  score: number;
  timestamp: number;
  details: string[];
}

export interface CryptoConstants {
  readonly AES_KEY_SIZE: number;
  readonly AES_TAG_LENGTH: number;
  readonly AES_IV_LENGTH: number;
  readonly ECDH_CURVE: string;
  readonly HKDF_INFO: string;
  readonly PBKDF2_ITERATIONS: number;
  readonly SALT_LENGTH: number;
  readonly NONCE_LENGTH: number;
}

export const CRYPTO_CONSTANTS: CryptoConstants = {
  AES_KEY_SIZE: 256,
  AES_TAG_LENGTH: 128,
  AES_IV_LENGTH: 12,
  ECDH_CURVE: 'P-256',
  HKDF_INFO: 'TPChat-v1-Message-Encryption',
  PBKDF2_ITERATIONS: 310000,
  SALT_LENGTH: 32,
  NONCE_LENGTH: 16,
} as const;
