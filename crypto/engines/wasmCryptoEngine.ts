/**
 * TPChat WASM Crypto Engine
 * Isolated crypto operations in WebAssembly sandbox
 */

import { BaseCryptoEngine, type EngineCapabilities } from './cryptoEngine';
import { CRYPTO_CONFIG, CONFIG } from '@/config';
import {
  loadWasmModule,
  isWasmLoaded,
  getWasmExports,
  copyToWasm,
  copyFromWasm,
  wasmAllocate,
  wasmDeallocate,
  wasmSecureWipe,
  wasmConstantTimeCompare,
  getWasmStats,
} from '@/wasm/wasmLoader';
import type { KeyPair, EncryptedMessage, MessagePayload } from '@/types/crypto';

// Memory layout in WASM
const MEMORY_LAYOUT = {
  PUBLIC_KEY: 0,
  PRIVATE_KEY: 128,
  SHARED_SECRET: 256,
  AES_KEY: 384,
  IV: 512,
  PLAINTEXT: 640,
  CIPHERTEXT: 2048,
  TAG: 4096,
  OUTPUT: 8192,
} as const;

export class WasmCryptoEngine extends BaseCryptoEngine {
  readonly name = 'WASM Isolated Crypto';
  readonly version = '1.0';
  readonly isPostQuantum = false;

  async initialize(): Promise<boolean> {
    if (!CONFIG.WASM_CRYPTO_ENABLED) {
      console.log('WASM crypto disabled in config');
      return false;
    }

    const loaded = await loadWasmModule();
    if (loaded) {
      this._ready = true;
      console.log('WASM crypto engine initialized');
      console.log('WASM stats:', getWasmStats());
    }
    return loaded;
  }

  async generateKeyPair(): Promise<KeyPair> {
    if (!isWasmLoaded()) {
      throw new Error('WASM module not loaded');
    }

    const exports = getWasmExports();

    // Allocate memory in WASM
    const publicKeyPtr = wasmAllocate(65);
    const privateKeyPtr = wasmAllocate(32);

    try {
      // Generate key pair in WASM
      const result = exports.generate_key_pair(publicKeyPtr, privateKeyPtr);
      if (result !== 0) {
        throw new Error(`Key generation failed: ${result}`);
      }

      // Copy keys from WASM
      const publicKeyBuffer = copyFromWasm(publicKeyPtr, 65);
      const privateKeyBuffer = copyFromWasm(privateKeyPtr, 32);

      // Import keys to Web Crypto for compatibility
      const publicKey = await crypto.subtle.importKey(
        'raw',
        publicKeyBuffer,
        { name: 'ECDH', namedCurve: CRYPTO_CONFIG.ECDH_CURVE },
        true,
        []
      );

      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: 'ECDH', namedCurve: CRYPTO_CONFIG.ECDH_CURVE },
        true,
        ['deriveKey', 'deriveBits']
      );

      return { publicKey, privateKey };
    } finally {
      // Securely wipe WASM memory
      wasmDeallocate(publicKeyPtr, 65);
      wasmDeallocate(privateKeyPtr, 32);
    }
  }

  async deriveSharedSecret(
    privateKey: CryptoKey,
    publicKey: CryptoKey
  ): Promise<ArrayBuffer> {
    if (!isWasmLoaded()) {
      throw new Error('WASM module not loaded');
    }

    const exports = getWasmExports();

    // Export keys
    const privateKeyBuffer = await crypto.subtle.exportKey('raw', privateKey);
    const publicKeyBuffer = await crypto.subtle.exportKey('raw', publicKey);

    // Copy to WASM
    const privateKeyPtr = MEMORY_LAYOUT.PRIVATE_KEY;
    const publicKeyPtr = MEMORY_LAYOUT.PUBLIC_KEY;
    const sharedSecretPtr = MEMORY_LAYOUT.SHARED_SECRET;

    copyToWasm(privateKeyBuffer, privateKeyPtr);
    copyToWasm(publicKeyBuffer, publicKeyPtr);

    try {
      // Derive in WASM
      const result = exports.derive_shared_secret(
        privateKeyPtr,
        publicKeyPtr,
        sharedSecretPtr
      );
      if (result !== 0) {
        throw new Error(`Shared secret derivation failed: ${result}`);
      }

      // Copy result
      return copyFromWasm(sharedSecretPtr, 32);
    } finally {
      // Wipe sensitive data
      wasmSecureWipe(privateKeyPtr, 32);
      wasmSecureWipe(sharedSecretPtr, 32);
    }
  }

  async deriveAESKey(sharedSecret: ArrayBuffer): Promise<CryptoKey> {
    // Use native HKDF (not in WASM for now)
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
    if (!isWasmLoaded()) {
      throw new Error('WASM module not loaded');
    }

    const exports = getWasmExports();

    // Export AES key
    const aesKeyBuffer = await crypto.subtle.exportKey('raw', aesKey);

    // Generate IV
    const iv = this.generateRandomBytes(CRYPTO_CONFIG.AES_IV_LENGTH);

    // Encode payload
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(payload));

    // Copy to WASM
    const keyPtr = MEMORY_LAYOUT.AES_KEY;
    const ivPtr = MEMORY_LAYOUT.IV;
    const plaintextPtr = MEMORY_LAYOUT.PLAINTEXT;
    const ciphertextPtr = MEMORY_LAYOUT.CIPHERTEXT;
    const tagPtr = MEMORY_LAYOUT.TAG;

    copyToWasm(aesKeyBuffer, keyPtr);
    copyToWasm(iv, ivPtr);
    copyToWasm(plaintext.buffer, plaintextPtr);

    try {
      // Encrypt in WASM
      const result = exports.encrypt_aes_gcm(
        keyPtr,
        ivPtr,
        plaintextPtr,
        plaintext.length,
        ciphertextPtr,
        tagPtr
      );
      if (result !== 0) {
        throw new Error(`Encryption failed: ${result}`);
      }

      // Copy results
      const ciphertext = copyFromWasm(ciphertextPtr, plaintext.length);
      const tag = copyFromWasm(tagPtr, 16);

      return {
        ciphertext,
        iv,
        tag,
        encryptedKey: new ArrayBuffer(0),
      };
    } finally {
      // Wipe sensitive data
      wasmSecureWipe(keyPtr, 32);
      wasmSecureWipe(plaintextPtr, plaintext.length);
    }
  }

  async decryptMessage(
    aesKey: CryptoKey,
    encryptedMessage: EncryptedMessage
  ): Promise<MessagePayload> {
    if (!isWasmLoaded()) {
      throw new Error('WASM module not loaded');
    }

    const exports = getWasmExports();

    // Export AES key
    const aesKeyBuffer = await crypto.subtle.exportKey('raw', aesKey);

    // Copy to WASM
    const keyPtr = MEMORY_LAYOUT.AES_KEY;
    const ivPtr = MEMORY_LAYOUT.IV;
    const ciphertextPtr = MEMORY_LAYOUT.CIPHERTEXT;
    const tagPtr = MEMORY_LAYOUT.TAG;
    const plaintextPtr = MEMORY_LAYOUT.PLAINTEXT;

    copyToWasm(aesKeyBuffer, keyPtr);
    copyToWasm(encryptedMessage.iv, ivPtr);
    copyToWasm(encryptedMessage.ciphertext, ciphertextPtr);
    copyToWasm(encryptedMessage.tag, tagPtr);

    try {
      // Decrypt in WASM
      const result = exports.decrypt_aes_gcm(
        keyPtr,
        ivPtr,
        ciphertextPtr,
        encryptedMessage.ciphertext.byteLength,
        tagPtr,
        plaintextPtr
      );
      if (result !== 0) {
        throw new Error(`Decryption failed: ${result}`);
      }

      // Copy result
      const plaintext = copyFromWasm(
        plaintextPtr,
        encryptedMessage.ciphertext.byteLength
      );

      const decoder = new TextDecoder();
      const jsonString = decoder.decode(plaintext);
      const payload: MessagePayload = JSON.parse(jsonString);

      // Wipe plaintext
      this.secureWipe(plaintext);

      return payload;
    } finally {
      // Wipe sensitive data
      wasmSecureWipe(keyPtr, 32);
      wasmSecureWipe(plaintextPtr, encryptedMessage.ciphertext.byteLength);
    }
  }

  async deriveKeyFromPassword(
    password: string,
    salt: ArrayBuffer,
    iterations: number
  ): Promise<CryptoKey> {
    if (!isWasmLoaded()) {
      // Fall back to native
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

    const exports = getWasmExports();

    // Encode password
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);

    // Copy to WASM
    const passwordPtr = MEMORY_LAYOUT.PLAINTEXT;
    const saltPtr = MEMORY_LAYOUT.IV;
    const keyPtr = MEMORY_LAYOUT.AES_KEY;

    copyToWasm(passwordData.buffer, passwordPtr);
    copyToWasm(salt, saltPtr);

    try {
      // Derive in WASM
      const result = exports.derive_key_pbkdf2(
        passwordPtr,
        passwordData.length,
        saltPtr,
        salt.byteLength,
        iterations,
        keyPtr
      );
      if (result !== 0) {
        throw new Error(`PBKDF2 derivation failed: ${result}`);
      }

      // Copy key
      const keyBuffer = copyFromWasm(keyPtr, 32);

      // Import to Web Crypto
      return await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } finally {
      // Wipe sensitive data
      wasmSecureWipe(passwordPtr, passwordData.length);
      wasmSecureWipe(keyPtr, 32);
    }
  }

  constantTimeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
    if (!isWasmLoaded()) {
      return super.constantTimeEqual(a, b);
    }

    if (a.byteLength !== b.byteLength) {
      return false;
    }

    const ptr1 = MEMORY_LAYOUT.PLAINTEXT;
    const ptr2 = MEMORY_LAYOUT.CIPHERTEXT;

    copyToWasm(a, ptr1);
    copyToWasm(b, ptr2);

    const result = wasmConstantTimeCompare(ptr1, ptr2, a.byteLength);

    // Wipe comparison buffers
    wasmSecureWipe(ptr1, a.byteLength);
    wasmSecureWipe(ptr2, b.byteLength);

    return result;
  }

  getCapabilities(): EngineCapabilities {
    return {
      supportsECDH: true,
      supportsAESGCM: true,
      supportsPBKDF2: true,
      supportsHKDF: true,
      supportsPostQuantum: false,
      wasmAccelerated: true,
      maxKeySize: 256,
    };
  }

  cleanup(): void {
    // Wipe all WASM memory
    if (isWasmLoaded()) {
      const stats = getWasmStats();
      if (stats.loaded) {
        wasmSecureWipe(0, stats.memoryBytes);
      }
    }
    this._ready = false;
  }
}
