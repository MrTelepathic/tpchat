/**
 * TPChat Cryptographic Engine Abstraction
 * Modular crypto layer supporting multiple algorithms
 */

import { CONFIG, CRYPTO_CONFIG } from '@/config';
import type { KeyPair, EncryptedMessage, MessagePayload } from '@/types/crypto';

/**
 * Abstract crypto engine interface
 * Implementations: NativeCryptoEngine, WasmCryptoEngine, HybridCryptoEngine
 */
export interface CryptoEngine {
  readonly name: string;
  readonly version: string;
  readonly isPostQuantum: boolean;

  /**
   * Initialize the engine
   */
  initialize(): Promise<boolean>;

  /**
   * Check if engine is ready
   */
  isReady(): boolean;

  /**
   * Generate ECDH key pair
   */
  generateKeyPair(): Promise<KeyPair>;

  /**
   * Derive shared secret from ECDH
   */
  deriveSharedSecret(privateKey: CryptoKey, publicKey: CryptoKey): Promise<ArrayBuffer>;

  /**
   * Derive AES key from shared secret using HKDF
   */
  deriveAESKey(sharedSecret: ArrayBuffer): Promise<CryptoKey>;

  /**
   * Encrypt message with AES-GCM
   */
  encryptMessage(aesKey: CryptoKey, payload: MessagePayload): Promise<EncryptedMessage>;

  /**
   * Decrypt message with AES-GCM
   */
  decryptMessage(aesKey: CryptoKey, encryptedMessage: EncryptedMessage): Promise<MessagePayload>;

  /**
   * Derive key from password using PBKDF2
   */
  deriveKeyFromPassword(
    password: string,
    salt: ArrayBuffer,
    iterations: number
  ): Promise<CryptoKey>;

  /**
   * Generate cryptographically secure random bytes
   */
  generateRandomBytes(length: number): ArrayBuffer;

  /**
   * Generate UUID v4
   */
  generateUUID(): string;

  /**
   * Constant-time comparison of two buffers
   */
  constantTimeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean;

  /**
   * Securely wipe a buffer
   */
  secureWipe(buffer: ArrayBuffer): void;

  /**
   * Get engine capabilities
   */
  getCapabilities(): EngineCapabilities;

  /**
   * Cleanup and release resources
   */
  cleanup(): void;
}

/**
 * Engine capabilities
 */
export interface EngineCapabilities {
  supportsECDH: boolean;
  supportsAESGCM: boolean;
  supportsPBKDF2: boolean;
  supportsHKDF: boolean;
  supportsPostQuantum: boolean;
  wasmAccelerated: boolean;
  maxKeySize: number;
}

/**
 * Base engine with common functionality
 */
export abstract class BaseCryptoEngine implements CryptoEngine {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly isPostQuantum: boolean;

  protected _ready = false;

  isReady(): boolean {
    return this._ready;
  }

  abstract initialize(): Promise<boolean>;
  abstract generateKeyPair(): Promise<KeyPair>;
  abstract deriveSharedSecret(
    privateKey: CryptoKey,
    publicKey: CryptoKey
  ): Promise<ArrayBuffer>;
  abstract deriveAESKey(sharedSecret: ArrayBuffer): Promise<CryptoKey>;
  abstract encryptMessage(
    aesKey: CryptoKey,
    payload: MessagePayload
  ): Promise<EncryptedMessage>;
  abstract decryptMessage(
    aesKey: CryptoKey,
    encryptedMessage: EncryptedMessage
  ): Promise<MessagePayload>;
  abstract deriveKeyFromPassword(
    password: string,
    salt: ArrayBuffer,
    iterations: number
  ): Promise<CryptoKey>;

  generateRandomBytes(length: number): ArrayBuffer {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  generateUUID(): string {
    return crypto.randomUUID();
  }

  constantTimeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
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

  secureWipe(buffer: ArrayBuffer): void {
    const view = new Uint8Array(buffer);
    view.fill(0);
  }

  abstract getCapabilities(): EngineCapabilities;

  abstract cleanup(): void;
}

/**
 * Crypto engine factory
 */
export class CryptoEngineFactory {
  private static instance: CryptoEngine | null = null;

  /**
   * Get the singleton crypto engine instance
   */
  static async getEngine(): Promise<CryptoEngine> {
    if (this.instance) {
      return this.instance;
    }

    // Select engine based on configuration
    switch (CONFIG.CRYPTO_ENGINE) {
      case 'wasm':
        const { WasmCryptoEngine } = await import('./wasmCryptoEngine');
        this.instance = new WasmCryptoEngine();
        break;

      case 'hybrid':
        const { HybridCryptoEngine } = await import('./hybridCryptoEngine');
        this.instance = new HybridCryptoEngine();
        break;

      case 'native':
      default:
        const { NativeCryptoEngine } = await import('./nativeCryptoEngine');
        this.instance = new NativeCryptoEngine();
        break;
    }

    const initialized = await this.instance.initialize();
    if (!initialized) {
      console.warn(`${this.instance.name} failed to initialize, falling back to native`);
      const { NativeCryptoEngine } = await import('./nativeCryptoEngine');
      this.instance = new NativeCryptoEngine();
      await this.instance.initialize();
    }

    return this.instance;
  }

  /**
   * Reset the engine (for testing)
   */
  static reset(): void {
    if (this.instance) {
      this.instance.cleanup();
      this.instance = null;
    }
  }

  /**
   * Get available engine types
   */
  static getAvailableEngines(): string[] {
    const engines = ['native'];
    if (CONFIG.WASM_CRYPTO_ENABLED) {
      engines.push('wasm');
    }
    if (CONFIG.PQ_MODE) {
      engines.push('hybrid');
    }
    return engines;
  }
}

/**
 * Global crypto engine accessor
 */
let globalEngine: CryptoEngine | null = null;

export async function getCryptoEngine(): Promise<CryptoEngine> {
  if (!globalEngine) {
    globalEngine = await CryptoEngineFactory.getEngine();
  }
  return globalEngine;
}

export function resetCryptoEngine(): void {
  if (globalEngine) {
    globalEngine.cleanup();
    globalEngine = null;
  }
  CryptoEngineFactory.reset();
}
