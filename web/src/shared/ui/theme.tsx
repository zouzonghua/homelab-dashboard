import { createContext, useState, useEffect, useContext, type ReactNode } from 'react';

export type Theme = 'dark' | 'light' | 'system'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Theme state: 'dark', 'light', 'system'.
  const [theme, setTheme] = useState<Theme>(() => {
    // Try to read the saved theme from local storage.
    const storedTheme = localStorage.getItem('theme');
    return storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'system'
      ? storedTheme
      : 'system';
  });

  // Apply the theme to the HTML element.
  useEffect(() => {
    const html = document.documentElement;
    
    // Remove existing theme classes.
    html.classList.remove('dark', 'light');

    if (theme === 'system') {
      // Use the system preference.
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDarkMode) {
        html.classList.add('dark');
      } else {
        html.classList.add('light');
      }
    } else {
      // Apply the selected theme directly.
      html.classList.add(theme);
    }

    // Save the theme to local storage.
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Listen for system theme changes when system mode is selected.
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const html = document.documentElement;
      html.classList.remove('dark', 'light');
      html.classList.add(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
} 
