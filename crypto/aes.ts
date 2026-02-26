/**
 * TPChat AES-256-GCM Encryption Implementation
 * Per-message encryption with unique IV
 */

import {
  CRYPTO_CONSTANTS,
  type EncryptedMessage,
  type SerializedEncryptedMessage,
  type MessagePayload,
} from '@/types/crypto';
import { wipeBuffer, constantTimeEqual } from './ecdh';

const { AES_IV_LENGTH, AES_TAG_LENGTH } = CRYPTO_CONSTANTS;

/**
 * Generate cryptographically secure random IV
 */
export function generateIV(): ArrayBuffer {
  return window.crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
}

/**
 * Generate cryptographically secure random nonce
 */
export function generateNonce(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate UUID v4 for message ID
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Encrypt message payload with AES-256-GCM
 */
export async function encryptMessage(
  aesKey: CryptoKey,
  payload: MessagePayload
): Promise<EncryptedMessage> {
  const iv = generateIV();
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(payload));

  // Encrypt with AES-256-GCM
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: AES_TAG_LENGTH,
    },
    aesKey,
    plaintext
  );

  // Extract ciphertext and authentication tag
  // AES-GCM appends tag to ciphertext
  const ciphertextLength = encrypted.byteLength - (AES_TAG_LENGTH / 8);
  const ciphertext = encrypted.slice(0, ciphertextLength);
  const tag = encrypted.slice(ciphertextLength);

  // Wrap the AES key with ephemeral public key for recipient
  // In actual implementation, this would use the recipient's public key
  // For now, we return the encrypted data structure

  return {
    ciphertext,
    iv,
    tag,
    encryptedKey: new ArrayBuffer(0), // Placeholder for encrypted key
  };
}

/**
 * Decrypt message with AES-256-GCM
 */
export async function decryptMessage(
  aesKey: CryptoKey,
  encryptedMessage: EncryptedMessage
): Promise<MessagePayload> {
  // Combine ciphertext and tag for AES-GCM decryption
  const combined = new Uint8Array(
    encryptedMessage.ciphertext.byteLength + encryptedMessage.tag.byteLength
  );
  combined.set(new Uint8Array(encryptedMessage.ciphertext), 0);
  combined.set(new Uint8Array(encryptedMessage.tag), encryptedMessage.ciphertext.byteLength);

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: encryptedMessage.iv,
        tagLength: AES_TAG_LENGTH,
      },
      aesKey,
      combined
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decrypted);
    const payload: MessagePayload = JSON.parse(jsonString);

    // Securely wipe decrypted data from memory
    wipeBuffer(decrypted);

    return payload;
  } catch (error) {
    throw new Error('Decryption failed: invalid key or corrupted data');
  }
}

/**
 * Serialize encrypted message for transmission/storage
 */
export function serializeEncryptedMessage(
  encrypted: EncryptedMessage
): SerializedEncryptedMessage {
  return {
    ciphertext: arrayBufferToBase64(encrypted.ciphertext),
    iv: arrayBufferToBase64(encrypted.iv),
    tag: arrayBufferToBase64(encrypted.tag),
    encryptedKey: arrayBufferToBase64(encrypted.encryptedKey),
  };
}

/**
 * Deserialize encrypted message from transmission/storage
 */
export function deserializeEncryptedMessage(
  serialized: SerializedEncryptedMessage
): EncryptedMessage {
  return {
    ciphertext: base64ToArrayBuffer(serialized.ciphertext),
    iv: base64ToArrayBuffer(serialized.iv),
    tag: base64ToArrayBuffer(serialized.tag),
    encryptedKey: base64ToArrayBuffer(serialized.encryptedKey),
  };
}

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypt and serialize message in one operation
 */
export async function encryptAndSerialize(
  aesKey: CryptoKey,
  payload: MessagePayload
): Promise<SerializedEncryptedMessage> {
  const encrypted = await encryptMessage(aesKey, payload);
  return serializeEncryptedMessage(encrypted);
}

/**
 * Deserialize and decrypt message in one operation
 */
export async function deserializeAndDecrypt(
  aesKey: CryptoKey,
  serialized: SerializedEncryptedMessage
): Promise<MessagePayload> {
  const encrypted = deserializeEncryptedMessage(serialized);
  return await decryptMessage(aesKey, encrypted);
}

/**
 * Verify message integrity using constant-time comparison
 */
export function verifyMessageIntegrity(
  originalTag: ArrayBuffer,
  computedTag: ArrayBuffer
): boolean {
  return constantTimeEqual(originalTag, computedTag);
}
