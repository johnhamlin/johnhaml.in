'use client'; // needed for framer-motion
import { motion } from 'framer-motion';

function SectionDivider() {
  return (
    <motion.div
      className="my-24 hidden h-16 w-1 rounded-full bg-gray-200 dark:bg-opacity-20 sm:block"
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.125,
      }}
    ></motion.div>
  );
}
export default SectionDivider;
