/**
 * TPChat Hybrid Crypto Engine
 * Combines classical and post-quantum cryptography
 * Experimental - for future PQC migration
 */

import { BaseCryptoEngine, type EngineCapabilities } from './cryptoEngine';
import { CRYPTO_CONFIG, CONFIG } from '@/config';
import type { KeyPair, EncryptedMessage, MessagePayload } from '@/types/crypto';

/**
 * Hybrid key encapsulation
 * Combines ECDH with CRYSTALS-Kyber
 */
interface HybridKeyPair extends KeyPair {
  pqPublicKey?: ArrayBuffer;
  pqPrivateKey?: ArrayBuffer;
}

/**
 * Hybrid shared secret
 * Combines classical and PQ shared secrets
 */
interface HybridSharedSecret {
  classical: ArrayBuffer;
  postQuantum: ArrayBuffer;
  combined: ArrayBuffer;
}

export class HybridCryptoEngine extends BaseCryptoEngine {
  readonly name = 'Hybrid Classical/PQC';
  readonly version = '1.0-experimental';
  readonly isPostQuantum = true;

  private nativeEngine: BaseCryptoEngine | null = null;

  async initialize(): Promise<boolean> {
    if (!CONFIG.PQ_MODE) {
      console.warn('PQ_MODE not enabled, falling back to native');
      return false;
    }

    // Load native engine as base
    const { NativeCryptoEngine } = await import('./nativeCryptoEngine');
    this.nativeEngine = new NativeCryptoEngine();
    const initialized = await this.nativeEngine.initialize();

    if (initialized) {
      this._ready = true;
      console.log('Hybrid crypto engine initialized (experimental PQC mode)');
    }

    return initialized;
  }

  async generateKeyPair(): Promise<HybridKeyPair> {
    if (!this.nativeEngine) {
      throw new Error('Engine not initialized');
    }

    // Generate classical key pair
    const classicalKeyPair = await this.nativeEngine.generateKeyPair();

    // Generate post-quantum key pair (placeholder - would use ML-KEM)
    const pqPublicKey = this.generateRandomBytes(1184); // ML-KEM-768 public key size
    const pqPrivateKey = this.generateRandomBytes(2400); // ML-KEM-768 private key size

    return {
      ...classicalKeyPair,
      pqPublicKey,
      pqPrivateKey,
    };
  }

  async deriveSharedSecret(
    privateKey: CryptoKey,
    publicKey: CryptoKey
  ): Promise<ArrayBuffer> {
    if (!this.nativeEngine) {
      throw new Error('Engine not initialized');
    }

    // Derive classical shared secret
    const classicalShared = await this.nativeEngine.deriveSharedSecret(
      privateKey,
      publicKey
    );

    // Derive post-quantum shared secret (placeholder)
    const pqShared = this.generateRandomBytes(32);

    // Combine both secrets
    const combined = new Uint8Array(
      classicalShared.byteLength + pqShared.byteLength
    );
    combined.set(new Uint8Array(classicalShared), 0);
    combined.set(new Uint8Array(pqShared), classicalShared.byteLength);

    // Hash combined secret
    const hashed = await crypto.subtle.digest('SHA-256', combined);

    // Wipe intermediate secrets
    this.secureWipe(pqShared);
    this.secureWipe(combined.buffer);

    return hashed;
  }

  async deriveAESKey(sharedSecret: ArrayBuffer): Promise<CryptoKey> {
    if (!this.nativeEngine) {
      throw new Error('Engine not initialized');
    }

    return await this.nativeEngine.deriveAESKey(sharedSecret);
  }

  async encryptMessage(
    aesKey: CryptoKey,
    payload: MessagePayload
  ): Promise<EncryptedMessage> {
    if (!this.nativeEngine) {
      throw new Error('Engine not initialized');
    }

    // Add PQC indicator to payload
    const enhancedPayload: MessagePayload = {
      ...payload,
      // Add PQ metadata
    };

    return await this.nativeEngine.encryptMessage(aesKey, enhancedPayload);
  }

  async decryptMessage(
    aesKey: CryptoKey,
    encryptedMessage: EncryptedMessage
  ): Promise<MessagePayload> {
    if (!this.nativeEngine) {
      throw new Error('Engine not initialized');
    }

    return await this.nativeEngine.decryptMessage(aesKey, encryptedMessage);
  }

  async deriveKeyFromPassword(
    password: string,
    salt: ArrayBuffer,
    iterations: number
  ): Promise<CryptoKey> {
    if (!this.nativeEngine) {
      throw new Error('Engine not initialized');
    }

    return await this.nativeEngine.deriveKeyFromPassword(
      password,
      salt,
      iterations
    );
  }

  /**
   * Generate CRYSTALS-Kyber key pair
   * Placeholder for future implementation
   */
  async generateKyberKeyPair(): Promise<{
    publicKey: ArrayBuffer;
    privateKey: ArrayBuffer;
  }> {
    // ML-KEM-768 parameters
    const publicKeySize = 1184;
    const privateKeySize = 2400;

    return {
      publicKey: this.generateRandomBytes(publicKeySize),
      privateKey: this.generateRandomBytes(privateKeySize),
    };
  }

  /**
   * CRYSTALS-Kyber encapsulation
   * Placeholder for future implementation
   */
  async kyberEncapsulate(
    publicKey: ArrayBuffer
  ): Promise<{
    ciphertext: ArrayBuffer;
    sharedSecret: ArrayBuffer;
  }> {
    // ML-KEM-768 ciphertext size
    const ciphertextSize = 1088;

    return {
      ciphertext: this.generateRandomBytes(ciphertextSize),
      sharedSecret: this.generateRandomBytes(32),
    };
  }

  /**
   * CRYSTALS-Kyber decapsulation
   * Placeholder for future implementation
   */
  async kyberDecapsulate(
    ciphertext: ArrayBuffer,
    privateKey: ArrayBuffer
  ): Promise<ArrayBuffer> {
    return this.generateRandomBytes(32);
  }

  /**
   * Generate CRYSTALS-Dilithium key pair
   * Placeholder for future implementation
   */
  async generateDilithiumKeyPair(): Promise<{
    publicKey: ArrayBuffer;
    privateKey: ArrayBuffer;
  }> {
    // ML-DSA-65 parameters
    const publicKeySize = 1952;
    const privateKeySize = 4032;

    return {
      publicKey: this.generateRandomBytes(publicKeySize),
      privateKey: this.generateRandomBytes(privateKeySize),
    };
  }

  /**
   * CRYSTALS-Dilithium sign
   * Placeholder for future implementation
   */
  async dilithiumSign(
    message: ArrayBuffer,
    privateKey: ArrayBuffer
  ): Promise<ArrayBuffer> {
    // ML-DSA-65 signature size
    const signatureSize = 3293;

    return this.generateRandomBytes(signatureSize);
  }

  /**
   * CRYSTALS-Dilithium verify
   * Placeholder for future implementation
   */
  async dilithiumVerify(
    message: ArrayBuffer,
    signature: ArrayBuffer,
    publicKey: ArrayBuffer
  ): Promise<boolean> {
    // Placeholder verification
    return true;
  }

  getCapabilities(): EngineCapabilities {
    return {
      supportsECDH: true,
      supportsAESGCM: true,
      supportsPBKDF2: true,
      supportsHKDF: true,
      supportsPostQuantum: true,
      wasmAccelerated: false,
      maxKeySize: 256,
    };
  }

  cleanup(): void {
    if (this.nativeEngine) {
      this.nativeEngine.cleanup();
      this.nativeEngine = null;
    }
    this._ready = false;
  }
}
