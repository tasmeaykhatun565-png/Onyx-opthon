import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'Dark' | 'Light' | 'Classic' | 'Purple Haze' | 'Inspire';

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
    const themeMap: Record<Theme, string> = {
      'Dark': 'dark',
      'Light': 'light',
      'Classic': 'classic',
      'Purple Haze': 'purple',
      'Inspire': 'inspire',
    };
    
    // Remove all possible theme classes/attributes first
    Object.values(themeMap).forEach(t => {
      root.removeAttribute('data-theme');
    });
    
    // Set the new theme
    root.setAttribute('data-theme', themeMap[theme]);
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
