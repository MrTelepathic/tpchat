/**
 * TPChat Theme Provider
 * Dark/Light mode with system preference detection
 * Theme encrypted in session storage
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'tpchat-theme';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: ThemeProviderProps): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from storage or system preference
  useEffect(() => {
    const stored = sessionStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setThemeState(stored);
    } else {
      setThemeState(defaultTheme);
    }
    setMounted(true);
  }, [defaultTheme]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    const resolved = theme === 'system'
      ? (systemPrefersDark ? 'dark' : 'light')
      : theme;

    setResolvedTheme(resolved);

    // Remove both classes first
    root.classList.remove('light', 'dark');
    // Add resolved theme class
    root.classList.add(resolved);

    // Store theme preference
    sessionStorage.setItem(THEME_STORAGE_KEY, theme);

    // Apply CSS variables for Telegram-like colors
    applyThemeColors(resolved);
  }, [theme, mounted]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
      applyThemeColors(newTheme);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Apply Telegram-like theme colors as CSS variables
 */
function applyThemeColors(theme: 'light' | 'dark'): void {
  const root = document.documentElement;

  if (theme === 'dark') {
    // Telegram Dark Theme Colors
    root.style.setProperty('--tg-bg-primary', '#0e0e0e');
    root.style.setProperty('--tg-bg-secondary', '#181818');
    root.style.setProperty('--tg-bg-tertiary', '#212121');
    root.style.setProperty('--tg-surface', '#212121');
    root.style.setProperty('--tg-text-primary', '#ffffff');
    root.style.setProperty('--tg-text-secondary', '#aaaaaa');
    root.style.setProperty('--tg-text-muted', '#707579');
    root.style.setProperty('--tg-accent', '#8774e1');
    root.style.setProperty('--tg-accent-hover', '#9a8ae3');
    root.style.setProperty('--tg-message-out', '#8774e1');
    root.style.setProperty('--tg-message-in', '#212121');
    root.style.setProperty('--tg-border', '#2b2b2b');
    root.style.setProperty('--tg-hover', 'rgba(255, 255, 255, 0.05)');
    root.style.setProperty('--tg-shadow', 'rgba(0, 0, 0, 0.3)');
    root.style.setProperty('--tg-online', '#0ac630');
    root.style.setProperty('--tg-typing', '#8774e1');
  } else {
    // Telegram Light Theme Colors
    root.style.setProperty('--tg-bg-primary', '#ffffff');
    root.style.setProperty('--tg-bg-secondary', '#f4f4f5');
    root.style.setProperty('--tg-bg-tertiary', '#ffffff');
    root.style.setProperty('--tg-surface', '#ffffff');
    root.style.setProperty('--tg-text-primary', '#000000');
    root.style.setProperty('--tg-text-secondary', '#707579');
    root.style.setProperty('--tg-text-muted', '#a0a0a0');
    root.style.setProperty('--tg-accent', '#3390ec');
    root.style.setProperty('--tg-accent-hover', '#2a7bc9');
    root.style.setProperty('--tg-message-out', '#e3fee0');
    root.style.setProperty('--tg-message-in', '#ffffff');
    root.style.setProperty('--tg-border', '#dfe1e5');
    root.style.setProperty('--tg-hover', 'rgba(0, 0, 0, 0.05)');
    root.style.setProperty('--tg-shadow', 'rgba(0, 0, 0, 0.1)');
    root.style.setProperty('--tg-online', '#0ac630');
    root.style.setProperty('--tg-typing', '#3390ec');
  }
}
