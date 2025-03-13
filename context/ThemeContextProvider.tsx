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

// Theme colors matching those in viewport metadata
const THEME_COLORS = {
  light: '#f9fafb',
  dark: '#111827'
};

// null if accesses outside of ThemeContextProvider
export const ThemeContext = createContext<ThemeContextType | null>(null);

function ThemeContextProvider({ children }: ThemeContextProviderProps) {
  const [theme, setTheme] = useState<Theme>('light');

  // Helper function to update theme-color meta tag
  const updateThemeColorMeta = (newTheme: Theme) => {
    // Update or create the theme-color meta tag
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    
    metaThemeColor.setAttribute('content', THEME_COLORS[newTheme]);
  };

  /**
   * The function toggles between a light and dark theme by updating the theme state, storing it in
   * local storage, and adding or removing a 'dark' class from the document's root element.
   */
  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      window.localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      updateThemeColorMeta('dark');
    } else {
      setTheme('light');
      window.localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
      updateThemeColorMeta('light');
    }
  };

  /* The `useEffect` hook in this code is responsible for setting the initial theme based on the user's
  preference or the stored theme in the local storage. */
  useEffect(() => {
    const localTheme = window.localStorage.getItem('theme') as Theme | null;

    if (localTheme) {
      setTheme(localTheme);
      if (localTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      // Update theme-color meta when theme is loaded from storage
      updateThemeColorMeta(localTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      updateThemeColorMeta('dark');
    } else {
      // Explicitly set light theme if not dark
      updateThemeColorMeta('light');
    }
  }, []);
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export default ThemeContextProvider;
