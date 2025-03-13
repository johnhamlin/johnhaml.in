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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Create and manage the status bar overlay
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS) {
      // Create the status bar overlay if it doesn't exist
      let statusBarOverlay = document.getElementById('status-bar-overlay');
      if (!statusBarOverlay) {
        statusBarOverlay = document.createElement('div');
        statusBarOverlay.id = 'status-bar-overlay';
        statusBarOverlay.style.position = 'fixed';
        statusBarOverlay.style.top = '0';
        statusBarOverlay.style.left = '0';
        statusBarOverlay.style.right = '0';
        statusBarOverlay.style.zIndex = '9999';
        statusBarOverlay.style.height = 'env(safe-area-inset-top, 0px)';
        document.body.appendChild(statusBarOverlay);
      }

      // Update the overlay color based on the theme
      statusBarOverlay.style.backgroundColor = theme === 'dark' ? '#111827' : '#f9fafb';
      
      // Also add a style element with CSS rules for iOS status bar
      const styleId = 'ios-status-bar-style';
      let statusBarStyle = document.getElementById(styleId);
      if (!statusBarStyle) {
        statusBarStyle = document.createElement('style');
        statusBarStyle.id = styleId;
        document.head.appendChild(statusBarStyle);
      }
      
      statusBarStyle.textContent = `
        @supports (padding-top: env(safe-area-inset-top)) {
          /* Override iOS status bar appearance with CSS */
          html {
            background-color: ${theme === 'dark' ? '#111827' : '#f9fafb'};
          }
          body {
            background-color: ${theme === 'dark' ? '#111827' : '#f9fafb'};
          }
          /* Add padding for notches & dynamic island */
          .safe-area-top-padding {
            padding-top: env(safe-area-inset-top);
          }
        }
      `;
    }
  }, [theme]);

  /**
   * The function toggles between a light and dark theme by updating the theme state, storing it in
   * local storage, and adding or removing a 'dark' class from the document's root element.
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

  /* The `useEffect` hook in this code is responsible for setting the initial theme based on the user's
  preference or the stored theme in the local storage. */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Handle initial theme
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

    setIsInitialLoad(false);
  }, []);
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export default ThemeContextProvider;
