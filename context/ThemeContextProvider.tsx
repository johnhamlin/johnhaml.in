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

  // Update theme color for iOS devices
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Get theme colors
    const lightColor = '#f9fafb';
    const darkColor = '#111827';
    const currentColor = theme === 'dark' ? darkColor : lightColor;

    // Handle status bar overlay
    const statusBarOverlay = document.getElementById('status-bar-overlay');
    if (statusBarOverlay) {
      statusBarOverlay.style.backgroundColor = currentColor;
    }

    // Manipulate theme-color meta tags directly
    // First, remove any existing dynamic theme-color meta tags
    const existingDynamicMeta = document.querySelector('meta[name="theme-color"][data-dynamic="true"]');
    if (existingDynamicMeta) {
      existingDynamicMeta.remove();
    }

    // Create a new theme-color meta tag with the current theme
    const metaThemeColor = document.createElement('meta');
    metaThemeColor.name = 'theme-color';
    metaThemeColor.content = currentColor;
    metaThemeColor.setAttribute('data-dynamic', 'true');
    document.head.appendChild(metaThemeColor);

    // Change background color of html and body for full coverage
    document.documentElement.style.backgroundColor = currentColor;
    
    // Add a style tag with specific iOS rules
    let statusBarStyle = document.getElementById('ios-status-bar-rules');
    if (!statusBarStyle) {
      statusBarStyle = document.createElement('style');
      statusBarStyle.id = 'ios-status-bar-rules';
      document.head.appendChild(statusBarStyle);
    }
    
    statusBarStyle.textContent = `
      /* Full height background colors */
      html, body {
        background-color: ${currentColor};
        min-height: 100%;
      }
      
      /* iOS status bar specific */
      @supports (-webkit-touch-callout: none) {
        /* iOS specific */
        body::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: env(safe-area-inset-top, 0);
          background-color: ${currentColor};
          z-index: 10000;
        }
        
        #status-bar-overlay {
          background-color: ${currentColor} !important;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: env(safe-area-inset-top, 0);
          z-index: 9999;
        }
      }
    `;
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
  }, []);
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export default ThemeContextProvider;
