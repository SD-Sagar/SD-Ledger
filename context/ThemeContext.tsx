'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'sd_ledger_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark'); // Dark by default

  useEffect(() => {
    // Read from localStorage on device
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (saved === 'light' || saved === 'dark') {
        setThemeState(saved);
        applyTheme(saved);
      } else {
        // Default dark
        applyTheme('dark');
      }
    } catch {
      applyTheme('dark');
    }
  }, []);

  const applyTheme = (t: Theme) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      const body = document.body;
      root.style.colorScheme = t;
      if (body) {
        body.style.colorScheme = t;
      }

      if (t === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
        if (body) {
          body.classList.add('dark');
          body.classList.remove('light');
          body.setAttribute('data-theme', 'dark');
        }
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
        if (body) {
          body.classList.add('light');
          body.classList.remove('dark');
          body.setAttribute('data-theme', 'light');
        }
      }
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Could not save theme to localStorage:', e);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
