/**
 * TPChat Native Crypto Engine
 * Uses browser's Web Crypto API directly
 */

import { BaseCryptoEngine, type EngineCapabilities } from './cryptoEngine';
import { CRYPTO_CONFIG } from '@/config';
import type { KeyPair, EncryptedMessage, MessagePayload } from '@/types/crypto';

export class NativeCryptoEngine extends BaseCryptoEngine {
  readonly name = 'Native Web Crypto';
  readonly version = '1.0';
  readonly isPostQuantum = false;

  async initialize(): Promise<boolean> {
    // Check Web Crypto API availability
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      console.error('Web Crypto API not available');
      return false;
    }

    this._ready = true;
    return true;
  }

  async generateKeyPair(): Promise<KeyPair> {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: CRYPTO_CONFIG.ECDH_CURVE,
      },
      true,
      ['deriveKey', 'deriveBits']
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    };
  }

  async deriveSharedSecret(
    privateKey: CryptoKey,
    publicKey: CryptoKey
  ): Promise<ArrayBuffer> {
    return await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: publicKey,
      },
      privateKey,
      CRYPTO_CONFIG.AES_KEY_SIZE
    );
  }

  async deriveAESKey(sharedSecret: ArrayBuffer): Promise<CryptoKey> {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: CRYPTO_CONFIG.PBKDF2_HASH,
        salt: new Uint8Array(0),
        info: new TextEncoder().encode(CRYPTO_CONFIG.HKDF_INFO),
      },
      baseKey,
      {
        name: 'AES-GCM',
        length: CRYPTO_CONFIG.AES_KEY_SIZE,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptMessage(
    aesKey: CryptoKey,
    payload: MessagePayload
  ): Promise<EncryptedMessage> {
    const iv = this.generateRandomBytes(CRYPTO_CONFIG.AES_IV_LENGTH);
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(payload));

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
        tagLength: CRYPTO_CONFIG.AES_TAG_LENGTH,
      },
      aesKey,
      plaintext
    );

    // Extract ciphertext and tag
    const ciphertextLength = encrypted.byteLength - CRYPTO_CONFIG.AES_TAG_LENGTH / 8;
    const ciphertext = encrypted.slice(0, ciphertextLength);
    const tag = encrypted.slice(ciphertextLength);

    return {
      ciphertext,
      iv,
      tag,
      encryptedKey: new ArrayBuffer(0),
    };
  }

  async decryptMessage(
    aesKey: CryptoKey,
    encryptedMessage: EncryptedMessage
  ): Promise<MessagePayload> {
    const combined = new Uint8Array(
      encryptedMessage.ciphertext.byteLength + encryptedMessage.tag.byteLength
    );
    combined.set(new Uint8Array(encryptedMessage.ciphertext), 0);
    combined.set(new Uint8Array(encryptedMessage.tag), encryptedMessage.ciphertext.byteLength);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(encryptedMessage.iv),
        tagLength: CRYPTO_CONFIG.AES_TAG_LENGTH,
      },
      aesKey,
      combined
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decrypted);
    const payload: MessagePayload = JSON.parse(jsonString);

    // Securely wipe decrypted data
    this.secureWipe(decrypted);

    return payload;
  }

  async deriveKeyFromPassword(
    password: string,
    salt: ArrayBuffer,
    iterations: number
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(salt),
        iterations,
        hash: CRYPTO_CONFIG.PBKDF2_HASH,
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: CRYPTO_CONFIG.AES_KEY_SIZE,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  getCapabilities(): EngineCapabilities {
    return {
      supportsECDH: true,
      supportsAESGCM: true,
      supportsPBKDF2: true,
      supportsHKDF: true,
      supportsPostQuantum: false,
      wasmAccelerated: false,
      maxKeySize: 256,
    };
  }

  cleanup(): void {
    this._ready = false;
  }
}
