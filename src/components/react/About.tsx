import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useSectionInView } from '../../hooks/useSectionInView';
import SectionHeading from './SectionHeading';

interface AboutProps {
  children?: ReactNode;
}

export default function About({ children }: AboutProps) {
  const { ref } = useSectionInView('About');

  return (
    <motion.section
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.175 }}
      ref={ref}
      id="about"
      className="prose mb-28 max-w-[45rem] scroll-mt-28 text-center leading-8 dark:prose-invert prose-p:mb-3 sm:mb-40"
    >
      <SectionHeading>About me</SectionHeading>
      {children}
    </motion.section>
  );
}
