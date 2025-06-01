'use client';

import { createContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

type ThemeContextProviderProps = {
  children: React.ReactNode;
};

// null if accesses outside of ThemeContextProvider
export const ThemeContext = createContext<ThemeContextType | null>(null);

function ThemeContextProvider({ children }: ThemeContextProviderProps) {
  const [theme, setTheme] = useState<Theme>('light');
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    window.localStorage.setItem('theme', newTheme);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  /* Initialize theme on load */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Add no-transitions class to prevent initial flicker
    document.documentElement.classList.add('no-transitions');

    const localTheme = window.localStorage.getItem('theme') as Theme | null;
    let activeTheme: Theme;

    if (localTheme) {
      activeTheme = localTheme;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      activeTheme = 'dark';
    } else {
      activeTheme = 'light';
    }

    setTheme(activeTheme);

    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Remove no-transitions class after a frame to enable smooth transitions
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transitions');
      setIsInitialized(true);
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export default ThemeContextProvider;
