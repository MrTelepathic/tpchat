/**
 * TPChat Cryptographic Unit Tests
 * Comprehensive tests for all crypto primitives
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateKeyPair,
  exportKeyPair,
  importPublicKey,
  importPrivateKey,
  deriveSharedSecret,
  deriveAESKey,
  performKeyExchange,
  constantTimeEqual,
  wipeBuffer,
} from '@/crypto/ecdh';
import {
  generateIV,
  generateNonce,
  generateUUID,
  encryptMessage,
  decryptMessage,
  serializeEncryptedMessage,
  deserializeEncryptedMessage,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from '@/crypto/aes';
import {
  generateSalt,
  deriveKeyFromPassword,
  deriveSessionKeys,
  calculatePasswordStrength,
} from '@/crypto/pbkdf2';
import type { MessagePayload } from '@/types/crypto';

describe('Cryptographic Primitives', () => {
  describe('ECDH Key Exchange', () => {
    it('should generate a valid key pair', async () => {
      const keyPair = await generateKeyPair();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.publicKey.type).toBe('public');
      expect(keyPair.privateKey.type).toBe('private');
    });

    it('should export and import keys correctly', async () => {
      const keyPair = await generateKeyPair();
      const exported = await exportKeyPair(keyPair);

      expect(exported.publicKey.byteLength).toBeGreaterThan(0);
      expect(exported.privateKey.byteLength).toBeGreaterThan(0);

      const importedPublic = await importPublicKey(exported.publicKey);
      const importedPrivate = await importPrivateKey(exported.privateKey);

      expect(importedPublic.type).toBe('public');
      expect(importedPrivate.type).toBe('private');
    });

    it('should derive the same shared secret from both ends', async () => {
      const aliceKeyPair = await generateKeyPair();
      const bobKeyPair = await generateKeyPair();

      const aliceShared = await deriveSharedSecret(
        aliceKeyPair.privateKey,
        bobKeyPair.publicKey
      );
      const bobShared = await deriveSharedSecret(
        bobKeyPair.privateKey,
        aliceKeyPair.publicKey
      );

      expect(constantTimeEqual(aliceShared, bobShared)).toBe(true);
    });

    it('should derive valid AES keys', async () => {
      const keyPair = await generateKeyPair();
      const exported = await exportKeyPair(keyPair);

      const aesKey = await deriveAESKey(exported.publicKey.slice(0, 32));
      expect(aesKey).toBeDefined();
      expect(aesKey.type).toBe('secret');
      expect(aesKey.algorithm.name).toBe('AES-GCM');
    });

    it('should perform complete key exchange', async () => {
      const recipientKeyPair = await generateKeyPair();
      const { ephemeralKeyPair, aesKey } = await performKeyExchange(
        recipientKeyPair.publicKey
      );

      expect(ephemeralKeyPair).toBeDefined();
      expect(aesKey).toBeDefined();
      expect(aesKey.algorithm.name).toBe('AES-GCM');
    });
  });

  describe('AES-256-GCM Encryption', () => {
    it('should generate unique IVs', () => {
      const iv1 = generateIV();
      const iv2 = generateIV();
      expect(iv1.byteLength).toBe(12);
      expect(iv2.byteLength).toBe(12);
      expect(constantTimeEqual(iv1, iv2)).toBe(false);
    });

    it('should generate valid nonces', () => {
      const nonce = generateNonce();
      expect(nonce).toBeDefined();
      expect(nonce.length).toBe(32); // 16 bytes = 32 hex chars
      expect(/^[a-f0-9]+$/.test(nonce)).toBe(true);
    });

    it('should generate valid UUIDs', () => {
      const uuid = generateUUID();
      expect(uuid).toBeDefined();
      expect(uuid.length).toBe(36);
      expect(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)).toBe(true);
    });

    it('should encrypt and decrypt messages', async () => {
      const aesKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      const payload: MessagePayload = {
        messageId: generateUUID(),
        timestamp: Date.now(),
        nonce: generateNonce(),
        content: 'Test message content',
        sender: 'test-user',
        type: 'text',
      };

      const encrypted = await encryptMessage(aesKey, payload);
      expect(encrypted.ciphertext.byteLength).toBeGreaterThan(0);
      expect(encrypted.iv.byteLength).toBe(12);
      expect(encrypted.tag.byteLength).toBe(16); // 128 bits = 16 bytes

      const decrypted = await decryptMessage(aesKey, encrypted);
      expect(decrypted.content).toBe(payload.content);
      expect(decrypted.sender).toBe(payload.sender);
      expect(decrypted.messageId).toBe(payload.messageId);
    });

    it('should serialize and deserialize encrypted messages', async () => {
      const aesKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      const payload: MessagePayload = {
        messageId: generateUUID(),
        timestamp: Date.now(),
        nonce: generateNonce(),
        content: 'Test serialization',
        sender: 'test-user',
        type: 'text',
      };

      const encrypted = await encryptMessage(aesKey, payload);
      const serialized = serializeEncryptedMessage(encrypted);

      expect(serialized.ciphertext).toBeDefined();
      expect(serialized.iv).toBeDefined();
      expect(serialized.tag).toBeDefined();

      const deserialized = deserializeEncryptedMessage(serialized);
      expect(deserialized.ciphertext.byteLength).toBe(encrypted.ciphertext.byteLength);
      expect(deserialized.iv.byteLength).toBe(encrypted.iv.byteLength);

      const decrypted = await decryptMessage(aesKey, deserialized);
      expect(decrypted.content).toBe(payload.content);
    });

    it('should fail decryption with wrong key', async () => {
      const correctKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      const wrongKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      const payload: MessagePayload = {
        messageId: generateUUID(),
        timestamp: Date.now(),
        nonce: generateNonce(),
        content: 'Secret message',
        sender: 'test-user',
        type: 'text',
      };

      const encrypted = await encryptMessage(correctKey, payload);

      await expect(decryptMessage(wrongKey, encrypted)).rejects.toThrow();
    });
  });

  describe('PBKDF2 Key Derivation', () => {
    it('should generate random salt', () => {
      const salt = generateSalt();
      expect(salt.byteLength).toBe(32);

      const salt2 = generateSalt();
      expect(constantTimeEqual(salt, salt2)).toBe(false);
    });

    it('should derive key from password', async () => {
      const salt = generateSalt();
      const key = await deriveKeyFromPassword('test-password', salt, 100000);

      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
    });

    it('should derive consistent keys from same password', async () => {
      const salt = generateSalt();
      const key1 = await deriveKeyFromPassword('same-password', salt, 100000);
      const key2 = await deriveKeyFromPassword('same-password', salt, 100000);

      const exported1 = await window.crypto.subtle.exportKey('raw', key1);
      const exported2 = await window.crypto.subtle.exportKey('raw', key2);

      expect(constantTimeEqual(exported1, exported2)).toBe(true);
    });

    it('should derive different keys from different passwords', async () => {
      const salt = generateSalt();
      const key1 = await deriveKeyFromPassword('password1', salt, 100000);
      const key2 = await deriveKeyFromPassword('password2', salt, 100000);

      const exported1 = await window.crypto.subtle.exportKey('raw', key1);
      const exported2 = await window.crypto.subtle.exportKey('raw', key2);

      expect(constantTimeEqual(exported1, exported2)).toBe(false);
    });

    it('should derive session keys (encryption + HMAC)', async () => {
      const salt = generateSalt();
      const keys = await deriveSessionKeys('test-password', salt, 100000);

      expect(keys.encryptionKey).toBeDefined();
      expect(keys.hmacKey).toBeDefined();
      expect(keys.encryptionKey.algorithm.name).toBe('AES-GCM');
      expect(keys.hmacKey.algorithm.name).toBe('HMAC');
    });

    it('should calculate password strength correctly', () => {
      expect(calculatePasswordStrength('123')).toBeLessThan(40);
      expect(calculatePasswordStrength('password')).toBeLessThan(50);
      expect(calculatePasswordStrength('Password123!')).toBeGreaterThan(60);
      expect(calculatePasswordStrength('MyStr0ng!P@ssw0rd')).toBeGreaterThan(80);
    });
  });

  describe('Utility Functions', () => {
    it('should perform constant-time comparison', () => {
      const buf1 = new Uint8Array([1, 2, 3, 4]).buffer;
      const buf2 = new Uint8Array([1, 2, 3, 4]).buffer;
      const buf3 = new Uint8Array([1, 2, 3, 5]).buffer;

      expect(constantTimeEqual(buf1, buf2)).toBe(true);
      expect(constantTimeEqual(buf1, buf3)).toBe(false);
    });

    it('should handle different length buffers in constant-time comparison', () => {
      const buf1 = new Uint8Array([1, 2, 3]).buffer;
      const buf2 = new Uint8Array([1, 2, 3, 4]).buffer;

      expect(constantTimeEqual(buf1, buf2)).toBe(false);
    });

    it('should securely wipe buffers', () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      wipeBuffer(buffer);

      const view = new Uint8Array(buffer);
      expect(view.every((b) => b === 0)).toBe(true);
    });

    it('should convert ArrayBuffer to Base64 and back', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5]).buffer;
      const base64 = arrayBufferToBase64(original);
      const converted = base64ToArrayBuffer(base64);

      expect(constantTimeEqual(original, converted)).toBe(true);
    });

    it('should handle empty buffers in base64 conversion', () => {
      const empty = new ArrayBuffer(0);
      const base64 = arrayBufferToBase64(empty);
      const converted = base64ToArrayBuffer(base64);

      expect(converted.byteLength).toBe(0);
    });
  });
});

describe('Security Properties', () => {
  it('should generate unique message IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateUUID());
    }
    expect(ids.size).toBe(100);
  });

  it('should generate unique nonces', () => {
    const nonces = new Set();
    for (let i = 0; i < 100; i++) {
      nonces.add(generateNonce());
    }
    expect(nonces.size).toBe(100);
  });

  it('should generate unique IVs', () => {
    const ivs = new Set();
    for (let i = 0; i < 100; i++) {
      const iv = generateIV();
      ivs.add(arrayBufferToBase64(iv));
    }
    expect(ivs.size).toBe(100);
  });
});
