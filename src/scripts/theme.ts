export type Theme = 'light' | 'dark';

type ThemeSubscriber = (theme: Theme) => void;

let currentTheme: Theme = 'light';
const subscribers: Set<ThemeSubscriber> = new Set();

/**
 * Get the current theme
 */
export function getTheme(): Theme {
  return currentTheme;
}

/**
 * Set the theme and notify subscribers
 */
export function setTheme(theme: Theme): void {
  currentTheme = theme;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem('theme', theme);

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // Notify all subscribers
  subscribers.forEach(callback => callback(theme));
}

/**
 * Toggle between light and dark themes
 */
export function toggleTheme(): void {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

/**
 * Subscribe to theme changes
 * Returns an unsubscribe function
 */
export function subscribeTheme(callback: ThemeSubscriber): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/**
 * Initialize theme from localStorage or system preference
 * Should be called once on app load
 */
export function initTheme(): void {
  if (typeof window === 'undefined') return;

  const localTheme = window.localStorage.getItem('theme') as Theme | null;
  let activeTheme: Theme;

  if (localTheme) {
    activeTheme = localTheme;
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    activeTheme = 'dark';
  } else {
    activeTheme = 'light';
  }

  currentTheme = activeTheme;

  if (activeTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
