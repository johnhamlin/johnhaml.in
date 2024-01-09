'use client';

import { skillsData } from '@/content/skills';
import SectionHeading from './SectionHeading';
import { useSectionInView } from '@/hooks/useSectionInView';
import { motion } from 'framer-motion';

const fadeInAnimationVariants = {
  initial: {
    opacity: 0,
    y: 100,
  },
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.06 * index,
    },
  }),
};

function Skills() {
  const { ref } = useSectionInView('Skills');

  return (
    <section
      id="skills"
      ref={ref}
      className="mb-28 max-w-[53rem] scroll-mt-28 text-center sm:mb-40"
    >
      <SectionHeading>My skills</SectionHeading>
      <ul className="flex flex-wrap justify-center gap-2 to-gray-800 text-lg">
        {skillsData.map((skill, index) => (
          <motion.li
            className="rounded-xl border border-black/[0.1] bg-white px-5 py-3"
            key={`${skill}-${index}`}
            variants={fadeInAnimationVariants}
            initial="initial"
            whileInView={'animate'}
            viewport={{ once: true }}
            custom={index}
          >
            {skill}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
export default Skills;
