import useTheme from '../../hooks/useTheme';
import { BsMoon, BsSun } from 'react-icons/bs';

export default function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className="fixed bottom-5 right-5 flex h-[3rem] w-[3rem] items-center justify-center rounded-full border border-black/10 border-opacity-40 bg-white bg-opacity-80 shadow-md backdrop-blur-[0.5rem] transition-all hover:scale-[1.15] active:scale-105 dark:bg-gray-950"
      onClick={toggleTheme}
    >
      {theme === 'light' ? <BsSun /> : <BsMoon />}
    </button>
  );
}
