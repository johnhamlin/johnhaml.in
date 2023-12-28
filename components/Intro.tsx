'use client'; // needed for framer-motion

import Image from 'next/image';
import headshot from '@/public/John Hamlin Headshot.jpg';
import { motion } from 'framer-motion';

function Intro() {
  return (
    <section>
      <div className="flex items-center justify-center">
        <div className="relative">
          <motion.div>
            <Image
              src={headshot}
              alt="Headshot of John Hamlin"
              priority={true}
              className="h-48 w-48 rounded-full object-cover border-[0.35rem] border-white shadow-xl"
            />
            <span className="absolute text-7xl bottom-0 left-0">👋🏻</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
export default Intro;
