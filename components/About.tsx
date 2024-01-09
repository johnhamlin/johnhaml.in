'use client';

import AboutContent from '@/content/about.mdx';
import { motion } from 'framer-motion';

import { useActiveSectionContext } from '@/context/ActiveSectionContextProvider';
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

function About() {
  const { ref, inView } = useInView();
  const { setActiveSection } = useActiveSectionContext();

  useEffect(() => {
    if (inView) {
      setActiveSection('About');
    }
  }, [inView, setActiveSection]);

  return (
    <motion.section
      ref={ref}
      id="about"
      // TODO: Update these classes now that we don't need to use?
      className="prose mb-28 max-w-[45rem] scroll-mt-28 text-center leading-8 prose-p:mb-3 sm:mb-40"
    >
      <AboutContent />
    </motion.section>
  );
}

export default About;
