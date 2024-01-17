import { ThemeContext } from '@/context/ThemeContextProvider';
import { useContext } from 'react';

function useTheme() {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error(
      'useThemeContext must be used within a ThemeContextProvider',
    );
  }

  return context;
}
export default useTheme;
