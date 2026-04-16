import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'farkle-theme';

let currentTheme: Theme = (typeof window !== 'undefined' ? localStorage.getItem(THEME_KEY) : 'dark') as Theme;
if (currentTheme !== 'dark' && currentTheme !== 'light') {
  currentTheme = 'dark';
}

const listeners = new Set<(theme: Theme) => void>();

function setGlobalTheme(t: Theme) {
  currentTheme = t;
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', t);
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(THEME_KEY, t);
  }
  listeners.forEach(l => l(t));
}

if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', currentTheme);
}

export function useTheme(): {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
} {
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  useEffect(() => {
    listeners.add(setThemeState);
    return () => {
      listeners.delete(setThemeState);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setGlobalTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setGlobalTheme(t);
  }, []);

  return { theme, isDark: theme !== 'light', toggleTheme, setTheme };
}
