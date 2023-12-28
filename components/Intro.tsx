'use client'; // needed for framer-motion

import Image from 'next/image';
import headshot from '@/public/John Hamlin Headshot.jpg';
import { motion } from 'framer-motion';
import Markdown from 'markdown-to-jsx';
import IntroContent from '@/lib/intro.mdx';

function Intro() {
  return (
    <section>
      <div className="flex items-center justify-center">
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: 'tween',
              duration: 0.2,
            }}
          >
            <Image
              src={headshot}
              alt="Headshot of John Hamlin"
              priority={true}
              className="h-48 w-48 rounded-full object-cover border-[0.35rem] border-white shadow-xl"
            />
            <motion.span
              className="absolute text-7xl bottom-0 left-0"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 125,
                delay: 0.1,
                duration: 0.7,
              }}
            >
              👋🏻
            </motion.span>
          </motion.div>
        </div>
      </div>
      <div className="prose prose-xl">
        <IntroContent />
      </div>
    </section>
  );
}
export default Intro;
