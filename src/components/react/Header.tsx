import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { links } from '../../data/links';
import clsx from 'clsx';
import {
  getActiveSection,
  setActiveSection,
  setTimeOfLastClick,
  subscribeActiveSection,
  type SectionName,
} from '../../scripts/active-section';
import useTheme from '../../hooks/useTheme';

export default function Header() {
  const [activeSection, setActiveSectionState] = useState<SectionName>(() =>
    getActiveSection()
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { theme } = useTheme();
  const prevThemeRef = useRef(theme);

  useEffect(() => {
    // Subscribe to active section changes
    const unsubscribe = subscribeActiveSection(setActiveSectionState);
    return unsubscribe;
  }, []);

  // Force iOS Safari to repaint GPU-composited blur layers on theme change
  useEffect(() => {
    if (prevThemeRef.current !== theme) {
      prevThemeRef.current = theme;
      setIsTransitioning(true);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(false);
        });
      });
    }
  }, [theme]);

  return (
    // z-index to make always on top
    <header className="relative z-[999]">
      {/* white bg - conditionally rendered to force iOS Safari GPU layer repaint */}
      {!isTransitioning && (
        <motion.div
          key={theme}
          className="fixed left-1/2 top-0 h-safe w-full rounded-none border border-white border-opacity-40 bg-white bg-opacity-80 pt-safe shadow-lg shadow-black/[0.03] backdrop-blur-[0.5rem] dark:border-black/40 dark:bg-gray-950 dark:bg-opacity-75 sm:top-6 sm:h-[3.25rem] sm:w-[31rem] sm:rounded-full sm:pt-0"
          initial={{ y: -200, x: '-50%', opacity: 0 }}
          animate={{ y: 0, x: '-50%', opacity: 1 }}
        ></motion.div>
      )}

      {/* Links */}
      <nav className="fixed left-1/2 top-safe flex h-12 -translate-x-1/2 py-2 sm:top-[1.7rem] sm:h-[initial] sm:py-0">
        <ul className="flex w-[22rem] flex-wrap items-center justify-center gap-y-1 text-[0.9rem] font-medium text-gray-500 sm:w-[initial] sm:flex-nowrap sm:gap-5">
          {links.map((link) => (
            <motion.li
              className="relative flex h-3/4 items-center justify-center"
              key={link.hash}
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <a
                className={clsx(
                  'flex w-full items-center justify-center px-3 py-3 transition hover:text-gray-950 dark:hover:text-gray-300',
                  {
                    'text-gray-950 dark:text-gray-100':
                      activeSection === link.name,
                  },
                  {
                    'dark:text-gray-400': activeSection !== link.name,
                  }
                )}
                href={link.hash}
                onClick={() => {
                  setActiveSection(link.name);
                  setTimeOfLastClick(Date.now());
                }}
              >
                {link.name}

                {/* Active Section Indicator */}
                {activeSection === link.name && (
                  <motion.span
                    className="absolute inset-0 -z-10 rounded-full bg-gray-200 dark:bg-gray-800"
                    layoutId="activeSection"
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 30,
                    }}
                  ></motion.span>
                )}
              </a>
            </motion.li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
