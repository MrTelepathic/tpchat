/**
 * TPChat Configuration
 * Feature toggles and security settings
 */

// ============================================
// SECURITY FEATURE FLAGS
// ============================================

export const CONFIG = {
  /**
   * Enable WASM isolated crypto sandbox
   * When true, all crypto operations run in WebAssembly
   */
  WASM_CRYPTO_ENABLED: true,

  /**
   * Post-Quantum Cryptography mode
   * When true, uses hybrid classical/PQC algorithms
   * WARNING: Experimental, not yet standardized
   */
  PQ_MODE: false,

  /**
   * DevTools paranoid mode
   * When true, detects and responds to DevTools opening
   */
  DEVTOOLS_PARANOID_MODE: false,

  /**
   * Strict integrity enforcement
   * When true, validates every module hash on load
   */
  STRICT_INTEGRITY: true,

  /**
   * Anti-replay timestamp threshold (milliseconds)
   * Messages older than this are rejected
   */
  REPLAY_TIMESTAMP_THRESHOLD: 5 * 60 * 1000, // 5 minutes

  /**
   * Session inactivity timeout (milliseconds)
   */
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes

  /**
   * DevTools detection sensitivity
   * Lower values = more sensitive
   */
  DEVTOOLS_DETECTION_THRESHOLD: 160,

  /**
   * Build environment
   */
  IS_PRODUCTION: import.meta.env.PROD ?? false,

  /**
   * Debug mode (disabled in production)
   */
  DEBUG: import.meta.env.DEV ?? false,

  /**
   * Application version
   */
  VERSION: '1.1.0',

  /**
   * Crypto engine to use
   * 'native' | 'wasm' | 'hybrid'
   */
  CRYPTO_ENGINE: 'wasm' as const,

  /**
   * Enable memory hardening
   * Zeroes sensitive buffers after use
   */
  MEMORY_HARDENING: true,

  /**
   * Enable anti-tampering checks
   */
  ANTI_TAMPERING: true,

  /**
   * Enable source map stripping in production
   */
  STRIP_SOURCE_MAPS: true,
} as const;

// ============================================
// CRYPTOGRAPHIC CONSTANTS
// ============================================

export const CRYPTO_CONFIG = {
  // ECDH
  ECDH_CURVE: 'P-256',

  // AES-GCM
  AES_KEY_SIZE: 256,
  AES_IV_LENGTH: 12,
  AES_TAG_LENGTH: 128,

  // PBKDF2
  PBKDF2_ITERATIONS: 310000,
  PBKDF2_HASH: 'SHA-256',

  // HKDF
  HKDF_INFO: 'TPChat-v1-Message-Encryption',

  // Salt
  SALT_LENGTH: 32,

  // Nonce
  NONCE_LENGTH: 16,

  // Post-Quantum (Experimental)
  PQ_KEM_ALGORITHM: 'ML-KEM-768', // CRYSTALS-Kyber
  PQ_SIGNATURE_ALGORITHM: 'ML-DSA-65', // CRYSTALS-Dilithium
} as const;

// ============================================
// WASM CONFIGURATION
// ============================================

export const WASM_CONFIG = {
  // WASM module path
  MODULE_PATH: '/wasm/crypto.wasm',

  // Memory page size (64KB per page)
  INITIAL_MEMORY_PAGES: 2,
  MAX_MEMORY_PAGES: 256,

  // Secure wipe delay (ms)
  WIPE_DELAY: 0,

  // Debug mode for WASM (development only)
  DEBUG: false,
} as const;

// ============================================
// INTEGRITY CONFIGURATION
// ============================================

export const INTEGRITY_CONFIG = {
  // Integrity manifest path
  MANIFEST_PATH: '/integrity.json',

  // Hash algorithm
  HASH_ALGORITHM: 'SHA-256',

  // Validate on load
  VALIDATE_ON_LOAD: true,

  // Auto-destroy session on mismatch
  AUTO_DESTROY_ON_FAILURE: true,
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================

export type Config = typeof CONFIG;
export type CryptoConfig = typeof CRYPTO_CONFIG;
export type WasmConfig = typeof WASM_CONFIG;
export type IntegrityConfig = typeof INTEGRITY_CONFIG;

// ============================================
// VALIDATION
// ============================================

export function validateConfig(): void {
  if (CONFIG.PQ_MODE && !CONFIG.WASM_CRYPTO_ENABLED) {
    console.warn('PQ_MODE requires WASM_CRYPTO_ENABLED. Enabling WASM crypto.');
    (CONFIG as Record<string, boolean>).WASM_CRYPTO_ENABLED = true;
  }

  if (CONFIG.DEVTOOLS_PARANOID_MODE && CONFIG.DEBUG) {
    console.warn('DevTools paranoid mode disabled in debug builds');
    (CONFIG as Record<string, boolean>).DEVTOOLS_PARANOID_MODE = false;
  }

  if (CONFIG.PBKDF2_ITERATIONS < 100000) {
    throw new Error('PBKDF2 iterations must be at least 100,000');
  }
}

// Run validation on load
validateConfig();
