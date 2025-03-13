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
   * Toggle between light and dark themes
   */
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (isIOS) {
      // For iOS, we need to reload the page for the status bar to update properly
      
      // First, save the new theme to localStorage
      window.localStorage.setItem('theme', newTheme);
      
      // Save current scroll position
      window.localStorage.setItem('scrollPosition', window.scrollY.toString());
      
      // Add a fade-out effect for smoother visual transition
      document.body.style.opacity = '0.5';
      document.body.style.transition = 'opacity 0.2s ease';
      
      // Use a short timeout before reload to allow transition
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } else {
      // For non-iOS, we can just update the theme dynamically
      setTheme(newTheme);
      window.localStorage.setItem('theme', newTheme);
      
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  /* Initialize theme on load and restore scroll position if needed */
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
    
    // Restore scroll position if coming from a reload
    const savedScrollPos = window.localStorage.getItem('scrollPosition');
    if (savedScrollPos) {
      window.scrollTo(0, parseInt(savedScrollPos));
      window.localStorage.removeItem('scrollPosition'); // Clean up
      
      // Restore opacity in case we're coming from a fade-out
      document.body.style.opacity = '1';
    }
  }, []);
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export default ThemeContextProvider;
