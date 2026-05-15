import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'Dark' | 'Light' | 'Classic' | 'Purple Haze' | 'Inspire' | 'onyx';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved as Theme) || 'Dark';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    // Map theme names to data-theme attribute values
    const themeMap: Record<Theme, string> = {
      'Dark': 'dark',
      'Light': 'light',
      'Classic': 'classic',
      'Purple Haze': 'purple',
      'Inspire': 'inspire',
      'onyx': 'onyx',
    };
    
    // Set the new theme
    const themeClass = themeMap[theme] || 'dark';
    root.setAttribute('data-theme', themeClass);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
