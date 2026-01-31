import { useEffect, useState } from 'react';
import {
  getTheme,
  toggleTheme as toggle,
  subscribeTheme,
  initTheme,
  type Theme,
} from '../scripts/theme';

/**
 * React hook to access and toggle theme
 * Uses vanilla JS pub/sub module under the hood
 */
export default function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Initialize from module on first render
    if (typeof window !== 'undefined') {
      initTheme();
    }
    return getTheme();
  });

  useEffect(() => {
    // Subscribe to theme changes
    const unsubscribe = subscribeTheme(setTheme);
    return unsubscribe;
  }, []);

  return {
    theme,
    toggleTheme: toggle,
  };
}
