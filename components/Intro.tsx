'use client'; // needed for framer-motion

import Image from 'next/image';
import headshot from '@/public/John_Hamlin_Headshot.jpg';
import { motion } from 'framer-motion';
import IntroContent from '@/content/intro.mdx';
import Link from 'next/link';
import { BsArrowRight, BsLinkedin } from 'react-icons/bs';
import { FaGithubSquare } from 'react-icons/fa';
import { HiDownload } from 'react-icons/hi';

function Intro() {
  return (
    <section className="mb-28 max-w-[50rem] text-center sm:mb-0">
      <div className="flex flex-col items-center justify-center">
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
              className="absolute bottom-0 left-0 text-7xl"
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
        {/* Leading changes the line spacing. Need the ! to overide the line spacing in prose-2xl */}
        <motion.div
          className="px-4 mt-4 mb-10 font-medium prose prose-2xl prose-p:!leading-[1.5] sm:prose-p:text-4xl"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <IntroContent />
        </motion.div>

        {/* Contact Buttons */}

        <motion.div
          className="flex flex-col gap-4 px-4 text-lg font-medium sm:flex-row"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.1,
          }}
        >
          {/* Contact Me Button */}
          <Link
            href={'#contact'}
            className="flex items-center gap-2 py-3 text-white transition-all bg-gray-900 rounded-full outline-none group px-7 focus:scale-110 hover:scale-110 hover:bg-gray-950 active:scale-105"
          >
            Contact me{' '}
            <BsArrowRight className="transition opacity-70 group-hover:translate-x-1" />
          </Link>

          {/* Resume Button */}
          <a
            className="flex items-center gap-2 py-3 transition bg-white border rounded-full outline-none border-black/10 group px-7 focus:scale-110 hover:scale-110 active:scale-105"
            href="/John_Hamlin_Resume.pdf"
            download
          >
            Résumé
            <HiDownload className="transition opacity-60 group-hover:scale-y-125" />
          </a>

          {/* LinkedIn Button */}
          <a
            href="https://www.linkedin.com/in/hamlinjohn/"
            className="flex items-center gap-2 p-4 bg-white rounded-full text-[1.35rem] border border-black/10 focus:scale-[1.15] hover:scale-[1.15] active:scale-105 transition text-gray-900 hover:text-gray-900"
            target="_blank"
          >
            <BsLinkedin />
          </a>

          {/* GitHub Button */}
          <a
            href="https://github.com/johnhamlin"
            className="flex items-center gap-2 p-4 bg-white rounded-full text-[1.5rem] border border-black/10 focus:scale-[1.15] hover:scale-[1.15] active:scale-105 transition text-gray700 hover:text-gray-900"
            target="_blank"
          >
            <FaGithubSquare />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
export default Intro;
