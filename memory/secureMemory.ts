/**
 * TPChat Secure Memory Management
 * Advanced memory hardening with manual overwrite
 */

import { CONFIG } from '@/config';

/**
 * Securely wipe an ArrayBuffer by overwriting with zeros
 * Uses multiple passes to prevent data remanence
 */
export function wipeBuffer(buffer: ArrayBuffer, passes: number = 3): void {
  if (!CONFIG.MEMORY_HARDENING) {
    return;
  }

  const view = new Uint8Array(buffer);

  // Multiple overwrite passes
  for (let pass = 0; pass < passes; pass++) {
    // Pass 1: Zeros
    // Pass 2: Ones
    // Pass 3: Random
    if (pass === 0) {
      view.fill(0);
    } else if (pass === 1) {
      view.fill(0xff);
    } else {
      crypto.getRandomValues(view);
    }
  }

  // Final zero pass
  view.fill(0);
}

/**
 * Securely wipe a TypedArray
 */
export function wipeTypedArray(
  array: Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array,
  passes: number = 3
): void {
  if (!CONFIG.MEMORY_HARDENING) {
    return;
  }

  for (let pass = 0; pass < passes; pass++) {
    if (pass === 0) {
      array.fill(0);
    } else if (pass === 1) {
      array.fill(-1); // All bits set
    } else {
      const randomBytes = new Uint8Array(array.buffer);
      crypto.getRandomValues(randomBytes);
    }
  }

  array.fill(0);
}

/**
 * Secure string wipe
 * Note: JavaScript strings are immutable, so we can only clear the reference
 */
export function wipeString(str: string): void {
  // Strings are immutable in JS, but we can help GC
  // by clearing any references in the calling code
  str = '';
}

/**
 * Create a secure buffer that auto-wipes on scope exit
 * Usage:
 *   using buffer = createSecureBuffer(32);
 *   // use buffer
 *   // auto-wiped when out of scope
 */
export function createSecureBuffer(size: number): SecureBuffer {
  return new SecureBuffer(size);
}

/**
 * Secure buffer with automatic cleanup
 */
export class SecureBuffer implements Disposable {
  private _buffer: ArrayBuffer;
  private _view: Uint8Array;
  private _disposed = false;

  constructor(size: number) {
    this._buffer = new ArrayBuffer(size);
    this._view = new Uint8Array(this._buffer);
  }

  get buffer(): ArrayBuffer {
    if (this._disposed) {
      throw new Error('SecureBuffer has been disposed');
    }
    return this._buffer;
  }

  get view(): Uint8Array {
    if (this._disposed) {
      throw new Error('SecureBuffer has been disposed');
    }
    return this._view;
  }

  get length(): number {
    return this._buffer.byteLength;
  }

  /**
   * Fill with random values
   */
  randomize(): this {
    crypto.getRandomValues(this._view);
    return this;
  }

  /**
   * Fill with zeros
   */
  zero(): this {
    this._view.fill(0);
    return this;
  }

  /**
   * Copy data into buffer
   */
  copyFrom(data: ArrayBuffer, offset: number = 0): this {
    const source = new Uint8Array(data);
    this._view.set(source, offset);
    return this;
  }

  /**
   * Copy data out of buffer
   */
  copyOut(): ArrayBuffer {
    return this._view.slice().buffer;
  }

  /**
   * Dispose and wipe buffer
   */
  dispose(): void {
    if (!this._disposed) {
      wipeBuffer(this._buffer);
      this._disposed = true;
      // @ts-ignore - allow nulling for GC
      this._buffer = null;
      // @ts-ignore
      this._view = null;
    }
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

/**
 * Constant-time comparison to prevent timing attacks
 */
export function constantTimeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  const viewA = new Uint8Array(a);
  const viewB = new Uint8Array(b);
  let result = 0;

  // XOR all bytes and OR the results
  // This ensures the comparison takes the same time regardless of
  // where the first difference occurs
  for (let i = 0; i < viewA.length; i++) {
    result |= viewA[i] ^ viewB[i];
  }

  return result === 0;
}

/**
 * Constant-time comparison for Uint8Arrays
 */
export function constantTimeEqualArrays(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

/**
 * Secure memory pool for reusable buffers
 * Reduces allocation overhead while maintaining security
 */
export class SecureMemoryPool {
  private pool: Map<number, ArrayBuffer[]> = new Map();
  private maxPoolSize: number;

  constructor(maxPoolSize: number = 10) {
    this.maxPoolSize = maxPoolSize;
  }

  /**
   * Acquire a buffer from the pool
   */
  acquire(size: number): ArrayBuffer {
    const buffers = this.pool.get(size);
    if (buffers && buffers.length > 0) {
      return buffers.pop()!;
    }
    return new ArrayBuffer(size);
  }

  /**
   * Return a buffer to the pool (after wiping)
   */
  release(buffer: ArrayBuffer): void {
    wipeBuffer(buffer);

    let buffers = this.pool.get(buffer.byteLength);
    if (!buffers) {
      buffers = [];
      this.pool.set(buffer.byteLength, buffers);
    }

    if (buffers.length < this.maxPoolSize) {
      buffers.push(buffer);
    }
  }

  /**
   * Clear all pooled buffers
   */
  clear(): void {
    for (const [size, buffers] of this.pool) {
      for (const buffer of buffers) {
        wipeBuffer(buffer);
      }
    }
    this.pool.clear();
  }
}

// Global memory pool
const globalPool = new SecureMemoryPool();

export function getMemoryPool(): SecureMemoryPool {
  return globalPool;
}

/**
 * Prevent console logging of sensitive data
 * Wraps console methods to filter sensitive patterns
 */
export function installConsoleProtection(): void {
  if (CONFIG.IS_PRODUCTION && !CONFIG.DEBUG) {
    const sensitivePatterns = [
      /[0-9a-f]{64}/i, // Hex keys
      /[0-9a-f]{128}/i, // Longer hex
      /privateKey/i,
      /secret/i,
      /password/i,
      /key.*=.*[0-9a-f]+/i,
    ];

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    function filterSensitive(args: unknown[]): unknown[] {
      return args.map((arg) => {
        if (typeof arg === 'string') {
          let filtered = arg;
          for (const pattern of sensitivePatterns) {
            filtered = filtered.replace(pattern, '[REDACTED]');
          }
          return filtered;
        }
        return arg;
      });
    }

    console.log = (...args: unknown[]) => {
      originalLog.apply(console, filterSensitive(args));
    };

    console.error = (...args: unknown[]) => {
      originalError.apply(console, filterSensitive(args));
    };

    console.warn = (...args: unknown[]) => {
      originalWarn.apply(console, filterSensitive(args));
    };
  }
}

/**
 * Debug utilities (disabled in production)
 */
export const debug = {
  log: (...args: unknown[]): void => {
    if (CONFIG.DEBUG) {
      console.log('[TPChat Debug]', ...args);
    }
  },

  warn: (...args: unknown[]): void => {
    if (CONFIG.DEBUG) {
      console.warn('[TPChat Debug]', ...args);
    }
  },

  error: (...args: unknown[]): void => {
    if (CONFIG.DEBUG) {
      console.error('[TPChat Debug]', ...args);
    }
  },

  assert: (condition: boolean, message: string): void => {
    if (CONFIG.DEBUG && !condition) {
      console.error('[TPChat Debug] Assertion failed:', message);
    }
  },
};

/**
 * Memory usage statistics
 */
export function getMemoryStats(): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
} {
  if ('memory' in performance) {
    const memory = (performance as unknown as { memory: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    }}).memory;
    return memory;
  }

  return {
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
  };
}

/**
 * Trigger garbage collection (if available)
 */
export function triggerGC(): void {
  if (globalThis.gc) {
    globalThis.gc();
  }
}
