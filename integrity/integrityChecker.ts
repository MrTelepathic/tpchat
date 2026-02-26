/**
 * TPChat Integrity Checker
 * Build-time and runtime integrity verification
 */

import type { IntegrityReport } from '@/types/crypto';

const INTEGRITY_KEY = 'tpchat_integrity_hash';

/**
 * Compute SHA-256 hash of content
 */
export async function computeHash(content: ArrayBuffer | string): Promise<string> {
  let data: ArrayBuffer;

  if (typeof content === 'string') {
    const encoder = new TextEncoder();
    data = encoder.encode(content);
  } else {
    data = content;
  }

  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute hash of JavaScript bundle
 */
export async function computeBundleHash(): Promise<string> {
  // Get all script tags
  const scripts = document.querySelectorAll('script[src]');
  let combinedHash = '';

  for (const script of scripts) {
    const src = script.getAttribute('src');
    if (src && src.startsWith('/')) {
      try {
        const response = await fetch(src);
        const content = await response.arrayBuffer();
        const hash = await computeHash(content);
        combinedHash += hash;
      } catch (error) {
        console.error(`Failed to hash script: ${src}`, error);
      }
    }
  }

  // Hash the combined hashes
  return await computeHash(combinedHash);
}

/**
 * Store expected hash (called at build time)
 */
export function storeExpectedHash(hash: string): void {
  // In a real build process, this would be embedded in the HTML
  // For now, we use a meta tag approach
  const meta = document.createElement('meta');
  meta.name = 'integrity-hash';
  meta.content = hash;
  document.head.appendChild(meta);
}

/**
 * Get expected hash from meta tag
 */
export function getExpectedHash(): string | null {
  const meta = document.querySelector('meta[name="integrity-hash"]');
  return meta?.getAttribute('content') || null;
}

/**
 * Verify application integrity
 */
export async function verifyIntegrity(): Promise<IntegrityReport> {
  const expectedHash = getExpectedHash();
  const computedHash = await computeBundleHash();
  const timestamp = Date.now();

  if (!expectedHash) {
    return {
      expectedHash: 'not-set',
      computedHash,
      valid: true, // Allow if no hash is set (development)
      timestamp,
    };
  }

  const valid = expectedHash === computedHash;

  return {
    expectedHash,
    computedHash,
    valid,
    timestamp,
  };
}

/**
 * Perform integrity check and handle failure
 */
export async function performIntegrityCheck(
  onFailure?: () => void
): Promise<boolean> {
  const report = await verifyIntegrity();

  if (!report.valid) {
    console.error('Integrity check failed!', report);

    // Clear session data
    sessionStorage.clear();
    localStorage.clear();

    // Call failure handler if provided
    if (onFailure) {
      onFailure();
    }

    return false;
  }

  return true;
}

/**
 * Generate integrity report for security audit
 */
export async function generateIntegrityReport(): Promise<{
  report: IntegrityReport;
  details: string[];
}> {
  const report = await verifyIntegrity();
  const details: string[] = [];

  if (report.expectedHash === 'not-set') {
    details.push('Warning: No expected hash configured (development mode)');
  } else if (report.valid) {
    details.push('Bundle integrity verified successfully');
    details.push(`Hash: ${report.computedHash.substring(0, 16)}...`);
  } else {
    details.push('CRITICAL: Bundle integrity check failed!');
    details.push(`Expected: ${report.expectedHash.substring(0, 16)}...`);
    details.push(`Computed: ${report.computedHash.substring(0, 16)}...`);
  }

  return { report, details };
}

/**
 * Create CSP nonce for inline scripts (if absolutely necessary)
 * Note: TPChat uses no inline scripts per security requirements
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Get recommended CSP header value
 */
export function getCSPPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // Required for styled-components/emotion
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/**
 * Apply CSP meta tag to document
 */
export function applyCSP(): void {
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = getCSPPolicy();
  document.head.appendChild(meta);
}

/**
 * Verify CSP is properly configured
 */
export function verifyCSP(): { enabled: boolean; issues: string[] } {
  const issues: string[] = [];
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');

  if (!cspMeta) {
    issues.push('CSP meta tag not found');
  } else {
    const content = cspMeta.getAttribute('content') || '';

    if (!content.includes("default-src 'self'")) {
      issues.push("CSP should restrict default-src to 'self'");
    }

    if (content.includes("'unsafe-eval'")) {
      issues.push("CSP allows unsafe-eval - security risk!");
    }

    if (content.includes("'unsafe-inline'") && !content.includes('nonce')) {
      issues.push("CSP allows unsafe-inline without nonce - security risk!");
    }
  }

  return {
    enabled: cspMeta !== null,
    issues,
  };
}
