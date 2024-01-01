'use client';

import { projectsData } from '@/content/projects';
import Image from 'next/image';
import React, { useRef } from 'react';
import { useScroll, motion, useTransform } from 'framer-motion';

function Project({
  title,
  description,
  tags,
  imageUrl,
}: (typeof projectsData)[number]) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['0 1', '1.33 1'],
  });

  const scaleProgress = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const opacityProgress = useTransform(scrollYProgress, [0, 1], [0.6, 1]);

  return (
    // Wrapped in a motion.div to make animation smoother
    <motion.div
      ref={ref}
      className="mb-3 group last:mb-0 sm:mb-8"
      style={{
        scale: scaleProgress,
        opacity: scrollYProgress,
      }}
    >
      {/* Card container */}
      <div className=" relative max-w-[42rem] overflow-hidden rounded-xl border border-black/5 bg-gray-100  transition  hover:bg-gray-200 sm:h-[20rem] sm:pr-8">
        {/* Text Container on the left */}
        <div className="flex h-full flex-col px-5 pb-7 pt-4 group-odd:mr-[20rem] group-even:ml-[20rem] sm:top-10 sm:max-w-[50%] sm:pl-10 sm:pr-2">
          <h3 className="text-2xl font-semibold">{title}</h3>
          <p className="mt-2 leading-relaxed text-gray-700">{description}</p>
          <ul className="flex flex-wrap gap-2 mt-4 sm:mt-auto">
            {tags.map((tag) => (
              <li
                className="rounded-full bg-black/[0.7] px-3 py-1 text-[0.7rem] uppercase tracking-wider text-white"
                key={tag}
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>

        {/* Image on the right */}
        <Image
          src={imageUrl}
          alt={title}
          quality={95}
          className="group-even:-right-[initial] absolute -right-40 top-8 w-[28.05rem] rounded-t-lg
        shadow-2xl transition group-even:-left-40
        group-even:right-[initial] group-hover:-translate-x-3 group-hover:translate-y-3 group-hover:-rotate-2 
        
        
        group-hover:scale-[1.04] group-even:group-hover:translate-x-3 group-even:group-hover:translate-y-3
        
        group-even:group-hover:rotate-2 "
        />
      </div>
    </motion.div>
  );
}

export default Project;
