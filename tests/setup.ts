/**
 * TPChat Test Setup
 * Vitest configuration and mocks
 */

import { vi } from 'vitest';

// Mock crypto for tests
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      generateKey: vi.fn(),
      exportKey: vi.fn(),
      importKey: vi.fn(),
      deriveBits: vi.fn(),
      deriveKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      digest: vi.fn(),
      sign: vi.fn(),
      verify: vi.fn(),
    },
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  },
});

// Mock sessionStorage
const mockStorage: Record<string, string> = {};
Object.defineProperty(global, 'sessionStorage', {
  value: {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    },
  },
});

// Mock localStorage
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => {
      mockStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    },
  },
});

// Mock matchMedia
Object.defineProperty(global, 'matchMedia', {
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [],
    }),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  },
});

// Mock URL.createObjectURL
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  },
});

// Mock fetch
global.fetch = vi.fn();

// Cleanup after each test
export const cleanup = () => {
  sessionStorage.clear();
  localStorage.clear();
  vi.clearAllMocks();
};
