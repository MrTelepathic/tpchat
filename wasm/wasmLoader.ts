/**
 * TPChat WebAssembly Module Loader
 * Loads and initializes the WASM crypto sandbox
 */

import { WASM_CONFIG, CONFIG } from '@/config';
import { wipeBuffer } from '@/memory/secureMemory';

// WASM module instance
let wasmModule: WebAssembly.Module | null = null;
let wasmInstance: WebAssembly.Instance | null = null;
let wasmMemory: WebAssembly.Memory | null = null;

// WASM exports cache
let wasmExports: WasmExports | null = null;

interface WasmExports {
  memory: WebAssembly.Memory;
  generate_key_pair: (publicKeyOut: number, privateKeyOut: number) => number;
  derive_shared_secret: (privateKey: number, publicKey: number, sharedSecretOut: number) => number;
  encrypt_aes_gcm: (
    key: number,
    iv: number,
    plaintext: number,
    plaintextLen: number,
    ciphertextOut: number,
    tagOut: number
  ) => number;
  decrypt_aes_gcm: (
    key: number,
    iv: number,
    ciphertext: number,
    ciphertextLen: number,
    tag: number,
    plaintextOut: number
  ) => number;
  derive_key_pbkdf2: (
    password: number,
    passwordLen: number,
    salt: number,
    saltLen: number,
    iterations: number,
    keyOut: number
  ) => number;
  secure_wipe: (offset: number, length: number) => void;
  constant_time_compare: (ptr1: number, ptr2: number, length: number) => number;
  allocate: (size: number) => number;
  deallocate: (offset: number, size: number) => void;
  get_memory_size: () => number;
}

interface WasmImports {
  env: {
    get_random_values: (ptr: number, len: number) => void;
    log_error: (ptr: number, len: number) => void;
  };
}

/**
 * Load and instantiate the WASM module
 */
export async function loadWasmModule(): Promise<boolean> {
  if (!CONFIG.WASM_CRYPTO_ENABLED) {
    console.log('WASM crypto disabled, using native implementation');
    return false;
  }

  try {
    // Fetch WASM binary
    const response = await fetch(WASM_CONFIG.MODULE_PATH);
    if (!response.ok) {
      throw new Error(`Failed to fetch WASM: ${response.status}`);
    }

    const wasmBuffer = await response.arrayBuffer();

    // Compile module
    wasmModule = await WebAssembly.compile(wasmBuffer);

    // Create imports
    const imports: WasmImports = {
      env: {
        get_random_values: (ptr: number, len: number) => {
          if (!wasmMemory) return;
          const view = new Uint8Array(wasmMemory.buffer, ptr, len);
          crypto.getRandomValues(view);
        },
        log_error: (ptr: number, len: number) => {
          if (!wasmMemory) return;
          const view = new Uint8Array(wasmMemory.buffer, ptr, len);
          const decoder = new TextDecoder();
          console.error('WASM Error:', decoder.decode(view));
        },
      },
    };

    // Instantiate
    wasmInstance = await WebAssembly.instantiate(wasmModule, imports);

    // Get exports
    wasmExports = wasmInstance.exports as unknown as WasmExports;
    wasmMemory = wasmExports.memory;

    console.log('WASM crypto module loaded successfully');
    return true;
  } catch (error) {
    console.error('Failed to load WASM module:', error);
    wasmModule = null;
    wasmInstance = null;
    wasmExports = null;
    wasmMemory = null;
    return false;
  }
}

/**
 * Check if WASM module is loaded
 */
export function isWasmLoaded(): boolean {
  return wasmExports !== null && wasmMemory !== null;
}

/**
 * Get WASM exports
 */
export function getWasmExports(): WasmExports {
  if (!wasmExports) {
    throw new Error('WASM module not loaded');
  }
  return wasmExports;
}

/**
 * Get WASM memory
 */
export function getWasmMemory(): WebAssembly.Memory {
  if (!wasmMemory) {
    throw new Error('WASM memory not available');
  }
  return wasmMemory;
}

/**
 * Copy data to WASM memory
 */
export function copyToWasm(data: ArrayBuffer, offset: number): void {
  const memory = getWasmMemory();
  const view = new Uint8Array(memory.buffer);
  const dataView = new Uint8Array(data);
  view.set(dataView, offset);
}

/**
 * Copy data from WASM memory
 */
export function copyFromWasm(offset: number, length: number): ArrayBuffer {
  const memory = getWasmMemory();
  const view = new Uint8Array(memory.buffer, offset, length);
  return view.slice().buffer;
}

/**
 * Allocate memory in WASM
 */
export function wasmAllocate(size: number): number {
  const exports = getWasmExports();
  return exports.allocate(size);
}

/**
 * Deallocate memory in WASM (with secure wipe)
 */
export function wasmDeallocate(offset: number, size: number): void {
  const exports = getWasmExports();
  exports.deallocate(offset, size);
}

/**
 * Secure wipe WASM memory region
 */
export function wasmSecureWipe(offset: number, length: number): void {
  const exports = getWasmExports();
  exports.secure_wipe(offset, length);
}

/**
 * Constant-time comparison in WASM
 */
export function wasmConstantTimeCompare(
  ptr1: number,
  ptr2: number,
  length: number
): boolean {
  const exports = getWasmExports();
  const result = exports.constant_time_compare(ptr1, ptr2, length);
  return result === 0;
}

/**
 * Unload WASM module and clear all references
 */
export function unloadWasmModule(): void {
  if (wasmMemory && wasmExports) {
    // Wipe entire WASM memory
    const buffer = new Uint8Array(wasmMemory.buffer);
    buffer.fill(0);
  }

  wasmModule = null;
  wasmInstance = null;
  wasmMemory = null;
  wasmExports = null;

  console.log('WASM module unloaded and memory cleared');
}

/**
 * Get WASM memory statistics
 */
export function getWasmStats(): {
  loaded: boolean;
  memoryPages: number;
  memoryBytes: number;
} {
  if (!wasmMemory || !wasmExports) {
    return { loaded: false, memoryPages: 0, memoryBytes: 0 };
  }

  const pages = wasmExports.get_memory_size();
  return {
    loaded: true,
    memoryPages: pages,
    memoryBytes: pages * 64 * 1024, // 64KB per page
  };
}

/**
 * Auto-load WASM on import if enabled
 */
if (CONFIG.WASM_CRYPTO_ENABLED && typeof window !== 'undefined') {
  // Defer loading to avoid blocking
  setTimeout(() => {
    loadWasmModule().catch((error) => {
      console.warn('Auto-load WASM failed:', error);
    });
  }, 0);
}
