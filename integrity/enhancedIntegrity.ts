/**
 * TPChat Enhanced Integrity System
 * Per-module hash validation with integrity.json
 */

import { CONFIG, INTEGRITY_CONFIG } from '@/config';
import { wipeBuffer } from '@/memory/secureMemory';

interface IntegrityManifest {
  version: string;
  generatedAt: string;
  algorithm: string;
  modules: Record<string, string>;
}

interface IntegrityResult {
  valid: boolean;
  module: string;
  expectedHash: string;
  computedHash: string;
}

// Cache for loaded manifest
let cachedManifest: IntegrityManifest | null = null;

/**
 * Load integrity manifest
 */
export async function loadIntegrityManifest(): Promise<IntegrityManifest | null> {
  if (cachedManifest) {
    return cachedManifest;
  }

  try {
    const response = await fetch(INTEGRITY_CONFIG.MANIFEST_PATH);
    if (!response.ok) {
      console.warn('Integrity manifest not found');
      return null;
    }

    const manifest: IntegrityManifest = await response.json();
    cachedManifest = manifest;
    return manifest;
  } catch (error) {
    console.warn('Failed to load integrity manifest:', error);
    return null;
  }
}

/**
 * Compute SHA-256 hash of a module
 */
export async function computeModuleHash(modulePath: string): Promise<string | null> {
  try {
    const response = await fetch(modulePath);
    if (!response.ok) {
      return null;
    }

    const content = await response.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', content);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Wipe content from memory
    wipeBuffer(content);

    return hash;
  } catch (error) {
    console.error(`Failed to compute hash for ${modulePath}:`, error);
    return null;
  }
}

/**
 * Validate a single module
 */
export async function validateModule(
  modulePath: string,
  expectedHash: string
): Promise<IntegrityResult> {
  const computedHash = await computeModuleHash(modulePath);

  if (!computedHash) {
    return {
      valid: false,
      module: modulePath,
      expectedHash,
      computedHash: 'failed-to-compute',
    };
  }

  return {
    valid: computedHash === expectedHash,
    module: modulePath,
    expectedHash,
    computedHash,
  };
}

/**
 * Validate all modules in integrity.json
 */
export async function validateAllModules(): Promise<{
  allValid: boolean;
  results: IntegrityResult[];
  failedModules: string[];
}> {
  const manifest = await loadIntegrityManifest();

  if (!manifest) {
    console.warn('No integrity manifest available, skipping validation');
    return {
      allValid: true,
      results: [],
      failedModules: [],
    };
  }

  const results: IntegrityResult[] = [];
  const failedModules: string[] = [];

  for (const [modulePath, expectedHash] of Object.entries(manifest.modules)) {
    const result = await validateModule(modulePath, expectedHash);
    results.push(result);

    if (!result.valid) {
      failedModules.push(modulePath);
    }
  }

  const allValid = failedModules.length === 0;

  return {
    allValid,
    results,
    failedModules,
  };
}

/**
 * Perform enhanced integrity check
 * Called on application startup
 */
export async function performEnhancedIntegrityCheck(): Promise<{
  valid: boolean;
  violations: string[];
}> {
  if (!CONFIG.STRICT_INTEGRITY) {
    console.log('Strict integrity checking disabled');
    return { valid: true, violations: [] };
  }

  console.log('Performing enhanced integrity check...');

  const { allValid, results, failedModules } = await validateAllModules();

  const violations: string[] = [];

  for (const result of results) {
    if (!result.valid) {
      violations.push(
        `${result.module}: expected ${result.expectedHash.substring(
          0,
          16
        )}..., got ${result.computedHash.substring(0, 16)}...`
      );
    }
  }

  if (!allValid) {
    console.error('Integrity check FAILED!');
    console.error('Violations:', violations);

    if (INTEGRITY_CONFIG.AUTO_DESTROY_ON_FAILURE) {
      // Trigger security response
      handleIntegrityViolation(violations);
    }
  } else {
    console.log('Integrity check passed');
  }

  return {
    valid: allValid,
    violations,
  };
}

/**
 * Handle integrity violation
 */
function handleIntegrityViolation(violations: string[]): void {
  // Clear session storage
  sessionStorage.clear();
  localStorage.clear();

  // Dispatch event for UI handling
  window.dispatchEvent(
    new CustomEvent('tpchat:integrity-violation', {
      detail: { violations },
    })
  );
}

/**
 * Generate integrity.json content (build-time)
 */
export async function generateIntegrityManifest(
  moduleHashes: Record<string, string>
): Promise<IntegrityManifest> {
  return {
    version: CONFIG.VERSION,
    generatedAt: new Date().toISOString(),
    algorithm: INTEGRITY_CONFIG.HASH_ALGORITHM,
    modules: moduleHashes,
  };
}

/**
 * Get all loaded script sources
 */
export function getLoadedScripts(): string[] {
  const scripts = document.querySelectorAll('script[src]');
  return Array.from(scripts)
    .map((script) => script.getAttribute('src'))
    .filter((src): src is string => src !== null && src.startsWith('/'));
}

/**
 * Compute hash of current bundle
 */
export async function computeBundleHash(): Promise<string> {
  const scripts = getLoadedScripts();
  let combinedHash = '';

  for (const src of scripts) {
    const hash = await computeModuleHash(src);
    if (hash) {
      combinedHash += hash;
    }
  }

  // Hash the combined hashes
  const encoder = new TextEncoder();
  const data = encoder.encode(combinedHash);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Real-time integrity monitoring
 * Periodically re-validates critical modules
 */
export class IntegrityMonitor {
  private intervalId: number | null = null;
  private checkInterval: number;
  private criticalModules: string[];

  constructor(
    checkInterval: number = 60000, // 1 minute
    criticalModules: string[] = []
  ) {
    this.checkInterval = checkInterval;
    this.criticalModules = criticalModules;
  }

  start(): void {
    if (this.intervalId !== null) {
      return;
    }

    this.intervalId = window.setInterval(async () => {
      await this.performCheck();
    }, this.checkInterval);

    console.log('Integrity monitor started');
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Integrity monitor stopped');
    }
  }

  private async performCheck(): Promise<void> {
    const manifest = await loadIntegrityManifest();
    if (!manifest) return;

    for (const modulePath of this.criticalModules) {
      const expectedHash = manifest.modules[modulePath];
      if (!expectedHash) continue;

      const result = await validateModule(modulePath, expectedHash);
      if (!result.valid) {
        console.error(`Critical module integrity failure: ${modulePath}`);
        handleIntegrityViolation([`${modulePath} (critical)`]);
        this.stop();
        break;
      }
    }
  }

  addCriticalModule(modulePath: string): void {
    if (!this.criticalModules.includes(modulePath)) {
      this.criticalModules.push(modulePath);
    }
  }

  removeCriticalModule(modulePath: string): void {
    const index = this.criticalModules.indexOf(modulePath);
    if (index !== -1) {
      this.criticalModules.splice(index, 1);
    }
  }
}

// Global integrity monitor instance
let globalMonitor: IntegrityMonitor | null = null;

export function getIntegrityMonitor(): IntegrityMonitor {
  if (!globalMonitor) {
    globalMonitor = new IntegrityMonitor();
  }
  return globalMonitor;
}

/**
 * Simulate tampered bundle (for testing)
 */
export async function simulateTamperedBundle(): Promise<{
  detected: boolean;
  details: string;
}> {
  // Create a fake manifest with wrong hashes
  const fakeManifest: IntegrityManifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    algorithm: 'SHA-256',
    modules: {
      '/assets/index.js': '0000000000000000000000000000000000000000000000000000000000000000',
    },
  };

  // Temporarily replace cached manifest
  const originalManifest = cachedManifest;
  cachedManifest = fakeManifest;

  // Run validation
  const { allValid, failedModules } = await validateAllModules();

  // Restore original manifest
  cachedManifest = originalManifest;

  return {
    detected: !allValid,
    details: failedModules.length > 0
      ? `Detected ${failedModules.length} tampered modules`
      : 'No tampering detected',
  };
}
