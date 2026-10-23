import { useEffect, useState } from 'react';
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

interface HeaderProps {
  pathname?: string;
}

const barPosition =
  'fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.5rem)] h-[3.25rem] w-[calc(100%-1rem)] max-w-[40rem] -translate-x-1/2 sm:top-6';

export default function Header({ pathname = '/' }: HeaderProps) {
  const [activeSection, setActiveSectionState] = useState<SectionName>(() =>
    getActiveSection()
  );

  useEffect(() => {
    const unsubscribe = subscribeActiveSection(setActiveSectionState);
    return unsubscribe;
  }, []);

  const onBlog = pathname === '/blog' || pathname.startsWith('/blog/');

  return (
    <header className="relative z-[999]">
      <motion.div
        className={`${barPosition} overflow-hidden rounded-full border border-gray-200 bg-white/90 shadow-lg shadow-black/10 backdrop-blur-[0.5rem] dark:border-white/20 dark:bg-gray-950/80 dark:shadow-black/30`}
        initial={{ y: -200, x: '-50%', opacity: 0 }}
        animate={{ y: 0, x: '-50%', opacity: 1 }}
      ></motion.div>

      <nav className={`${barPosition} flex items-center justify-center`} aria-label="Site">
        <ul className="flex w-full items-center justify-center px-1 text-[0.68rem] font-medium text-gray-500 min-[380px]:gap-x-1 min-[380px]:px-2 min-[380px]:text-[0.8rem] sm:gap-x-3 sm:px-2 sm:text-[0.95rem]">
          {links.map((link) => {
            const active = onBlog
              ? link.name === 'Blog'
              : activeSection === link.name;
            const href = link.hash.startsWith('#')
              ? pathname === '/'
                ? link.hash
                : `/${link.hash}`
              : link.hash;

            return (
              <motion.li
                className="relative flex items-center justify-center"
                key={link.hash}
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                <a
                  className={clsx(
                    'flex items-center justify-center whitespace-nowrap px-0.5 py-2 transition hover:text-gray-950 dark:hover:text-gray-300 min-[380px]:px-1 sm:px-3',
                    {
                      'text-gray-950 dark:text-gray-100': active,
                      'dark:text-gray-400': !active,
                    }
                  )}
                  href={href}
                  onClick={() => {
                    setActiveSection(link.name);
                    setTimeOfLastClick(Date.now());
                  }}
                >
                  {link.name}

                  {active && (
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
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
