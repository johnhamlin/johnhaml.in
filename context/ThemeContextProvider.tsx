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

  /**
   * The function toggles between a light and dark theme by updating the theme state, storing it in
   * local storage, and adding or removing a 'dark' class from the document's root element.
   */
  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      window.localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      // For iOS status bar in dark mode
      document.documentElement.style.setProperty('--status-bar-color', '#111827');
    } else {
      setTheme('light');
      window.localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
      // For iOS status bar in light mode
      document.documentElement.style.setProperty('--status-bar-color', '#f9fafb');
    }
  };

  /* The `useEffect` hook in this code is responsible for setting the initial theme based on the user's
  preference or the stored theme in the local storage. */
  useEffect(() => {
    // Set up the CSS variable for status bar color
    if (typeof document !== 'undefined') {
      // First, add a style tag with CSS rules for iOS status bar color
      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        @supports (padding-top: env(safe-area-inset-top)) {
          html {
            --status-bar-color: ${theme === 'light' ? '#f9fafb' : '#111827'};
            background-color: var(--status-bar-color);
          }
          body {
            background-color: ${theme === 'light' ? '#f9fafb' : '#111827'};
            min-height: 100vh;
          }
          /* Override iOS status bar appearance */
          @media screen and (orientation: portrait) {
            html::before {
              content: '';
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: env(safe-area-inset-top);
              background-color: var(--status-bar-color);
              z-index: 10000;
            }
          }
        }
      `;
      document.head.appendChild(styleEl);
    }

    const localTheme = window.localStorage.getItem('theme') as Theme | null;

    if (localTheme) {
      setTheme(localTheme);
      if (localTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.setProperty('--status-bar-color', '#111827');
      } else {
        document.documentElement.style.setProperty('--status-bar-color', '#f9fafb');
      }
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      document.documentElement.style.setProperty('--status-bar-color', '#111827');
    } else {
      document.documentElement.style.setProperty('--status-bar-color', '#f9fafb');
    }
  }, []);
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export default ThemeContextProvider;
