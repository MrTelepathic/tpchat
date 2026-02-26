/**
 * TPChat DevTools Paranoid Mode
 * Detects and responds to DevTools opening
 */

import { CONFIG } from '@/config';
import { destroySession } from '@/session/sessionManager';

// Detection state
let isDevToolsOpen = false;
let detectionInterval: number | null = null;
let debuggerCheckInterval: number | null = null;

// Event listeners for cleanup
const listeners: Array<() => void> = [];

/**
 * Check if DevTools paranoid mode is enabled
 */
export function isParanoidModeEnabled(): boolean {
  return CONFIG.DEVTOOLS_PARANOID_MODE && CONFIG.IS_PRODUCTION;
}

/**
 * Initialize DevTools detection
 */
export function initDevToolsDetection(): void {
  if (!isParanoidModeEnabled()) {
    return;
  }

  console.log('DevTools paranoid mode enabled');

  // Method 1: Window size difference detection
  startWindowSizeDetection();

  // Method 2: Debugger timing trap
  startDebuggerTrap();

  // Method 3: Console function redefinition detection
  startConsoleDetection();

  // Method 4: Performance timing analysis
  startPerformanceDetection();
}

/**
 * Stop all DevTools detection
 */
export function stopDevToolsDetection(): void {
  if (detectionInterval !== null) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }

  if (debuggerCheckInterval !== null) {
    clearInterval(debuggerCheckInterval);
    debuggerCheckInterval = null;
  }

  // Remove all listeners
  listeners.forEach((remove) => remove());
  listeners.length = 0;

  isDevToolsOpen = false;
}

/**
 * Window size difference detection
 * DevTools opening changes window dimensions
 */
function startWindowSizeDetection(): void {
  const threshold = CONFIG.DEVTOOLS_DETECTION_THRESHOLD;

  const checkWindowSize = () => {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;

    const devToolsOpen = widthDiff > threshold || heightDiff > threshold;

    if (devToolsOpen && !isDevToolsOpen) {
      handleDevToolsOpened('window-size');
    }

    isDevToolsOpen = devToolsOpen;
  };

  detectionInterval = window.setInterval(checkWindowSize, 500);

  // Also check on resize
  const resizeHandler = () => {
    checkWindowSize();
  };
  window.addEventListener('resize', resizeHandler);
  listeners.push(() => window.removeEventListener('resize', resizeHandler));
}

/**
 * Debugger timing trap
 * DevTools debugger statement causes measurable delay
 */
function startDebuggerTrap(): void {
  const checkDebugger = () => {
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const end = performance.now();

    // If debugger is active, this will take significantly longer
    if (end - start > 100) {
      if (!isDevToolsOpen) {
        handleDevToolsOpened('debugger-trap');
        isDevToolsOpen = true;
      }
    }
  };

  debuggerCheckInterval = window.setInterval(checkDebugger, 1000);
}

/**
 * Console function redefinition detection
 * DevTools often redefines console functions
 */
function startConsoleDetection(): void {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  // Store reference to detect changes
  const checkConsole = () => {
    if (
      console.log !== originalLog ||
      console.warn !== originalWarn ||
      console.error !== originalError
    ) {
      if (!isDevToolsOpen) {
        handleDevToolsOpened('console-modification');
        isDevToolsOpen = true;
      }
    }
  };

  const interval = window.setInterval(checkConsole, 1000);
  listeners.push(() => clearInterval(interval));
}

/**
 * Performance timing analysis
 * DevTools affects performance API
 */
function startPerformanceDetection(): void {
  const checkPerformance = () => {
    // Check for performance profiler
    if ('getEntriesByType' in performance) {
      const entries = performance.getEntriesByType('resource');
      // Unusual number of entries may indicate DevTools activity
      if (entries.length > 1000) {
        if (!isDevToolsOpen) {
          handleDevToolsOpened('performance-anomaly');
          isDevToolsOpen = true;
        }
      }
    }
  };

  const interval = window.setInterval(checkPerformance, 5000);
  listeners.push(() => clearInterval(interval));
}

/**
 * Handle DevTools detection
 */
function handleDevToolsOpened(detectionMethod: string): void {
  console.warn(`DevTools detected via ${detectionMethod}!`);

  // Destroy session keys
  destroySession();

  // Dispatch event for UI handling
  window.dispatchEvent(
    new CustomEvent('tpchat:devtools-detected', {
      detail: { method: detectionMethod },
    })
  );

  // Show security alert
  showSecurityAlert(detectionMethod);

  // Freeze UI
  freezeUI();
}

/**
 * Show security alert to user
 */
function showSecurityAlert(detectionMethod: string): void {
  // Create alert overlay
  const overlay = document.createElement('div');
  overlay.id = 'tpchat-security-alert';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: system-ui, sans-serif;
  `;

  const alertBox = document.createElement('div');
  alertBox.style.cssText = `
    background: #1a1a1a;
    border: 2px solid #ff4444;
    border-radius: 12px;
    padding: 32px;
    max-width: 480px;
    text-align: center;
    color: #fff;
  `;

  alertBox.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
    <h2 style="color: #ff4444; margin-bottom: 16px;">Security Alert</h2>
    <p style="margin-bottom: 16px; line-height: 1.5;">
      Developer tools have been detected. For your security, the session has been terminated.
    </p>
    <p style="font-size: 14px; color: #888; margin-bottom: 24px;">
      Detection method: ${detectionMethod}
    </p>
    <button id="tpchat-reload-btn" style="
      background: #ff4444;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
    ">Reload Application</button>
  `;

  overlay.appendChild(alertBox);
  document.body.appendChild(overlay);

  // Add reload handler
  const reloadBtn = document.getElementById('tpchat-reload-btn');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }
}

/**
 * Freeze UI to prevent interaction
 */
function freezeUI(): void {
  // Disable all interactive elements
  const style = document.createElement('style');
  style.id = 'tpchat-freeze-style';
  style.textContent = `
    * {
      pointer-events: none !important;
      user-select: none !important;
    }
    #tpchat-security-alert,
    #tpchat-security-alert * {
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(style);

  // Stop all media
  document.querySelectorAll('video, audio').forEach((media) => {
    (media as HTMLMediaElement).pause();
  });

  // Clear intervals and timeouts (except ours)
  const highestTimeout = setTimeout(() => {}, 0);
  for (let i = 0; i < highestTimeout; i++) {
    clearTimeout(i);
    clearInterval(i);
  }
}

/**
 * Check if DevTools is currently detected as open
 */
export function isDevToolsDetected(): boolean {
  return isDevToolsOpen;
}

/**
 * Manually trigger DevTools detection (for testing)
 */
export function simulateDevToolsDetection(): void {
  handleDevToolsOpened('manual-simulation');
}

/**
 * Get detection status for audit
 */
export function getDevToolsDetectionStatus(): {
  enabled: boolean;
  detected: boolean;
  methods: string[];
} {
  return {
    enabled: isParanoidModeEnabled(),
    detected: isDevToolsOpen,
    methods: ['window-size', 'debugger-trap', 'console-modification', 'performance-anomaly'],
  };
}

/**
 * Toggle paranoid mode at runtime
 */
export function setParanoidMode(enabled: boolean): void {
  (CONFIG as Record<string, boolean>).DEVTOOLS_PARANOID_MODE = enabled;

  if (enabled) {
    initDevToolsDetection();
  } else {
    stopDevToolsDetection();
  }
}
