'use client';

import AboutContent from '@/content/about.mdx';
import { motion } from 'framer-motion';
import { useSectionInView } from '@/hooks/useSectionInView';

function About() {
  const { ref } = useSectionInView('About');

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
