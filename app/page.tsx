'use client';
import { motion } from 'framer-motion';
import Intro from '@/components/Intro';
import About from '@/content/about.mdx';
import SectionDivider from '@/components/SectionDivider';
import Projects from '@/components/Projects';

export default function Home() {
  return (
    <main className="flex flex-col items-center px-4 ">
      <Intro />
      <SectionDivider />
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.175 }}
      >
        <About />
      </motion.div>
      <Projects />
    </main>
  );
}
