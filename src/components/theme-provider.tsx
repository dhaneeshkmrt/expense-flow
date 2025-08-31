'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type ColorTheme = 'default' | 'rainbow' | 'ocean' | 'sunset' | 'forest' | 'electric';

interface ThemeContextType {
  theme: Theme;
  colorTheme: ColorTheme;
  setTheme: (theme: Theme) => void;
  setColorTheme: (colorTheme: ColorTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  defaultColorTheme = 'default',
  storageKey = 'ui-theme',
  colorStorageKey = 'ui-color-theme',
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultColorTheme?: ColorTheme;
  storageKey?: string;
  colorStorageKey?: string;
}) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [colorTheme, setColorTheme] = useState<ColorTheme>(defaultColorTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Load saved theme preferences
    const savedTheme = localStorage.getItem(storageKey) as Theme;
    const savedColorTheme = localStorage.getItem(colorStorageKey) as ColorTheme;
    
    if (savedTheme) {
      setTheme(savedTheme);
    }
    
    if (savedColorTheme) {
      setColorTheme(savedColorTheme);
    }
  }, [storageKey, colorStorageKey]);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;

    // Remove all existing theme classes
    root.classList.remove('light', 'dark');
    root.classList.remove('theme-rainbow', 'theme-ocean', 'theme-sunset', 'theme-forest', 'theme-electric');

    // Apply new theme classes
    if (theme === 'dark') {
      root.classList.add('dark');
    }

    if (colorTheme !== 'default') {
      root.classList.add(`theme-${colorTheme}`);
    }

    // Save to localStorage
    localStorage.setItem(storageKey, theme);
    localStorage.setItem(colorStorageKey, colorTheme);
  }, [theme, colorTheme, mounted, storageKey, colorStorageKey]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    colorTheme,
    setTheme,
    setColorTheme,
    toggleTheme,
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};