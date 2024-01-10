'use client';

import { projectsData } from '@/content/projects';
import Image from 'next/image';
import React, { useRef } from 'react';
import { useScroll, motion, useTransform } from 'framer-motion';
import Link from 'next/link';

function Project({
  title,
  description,
  tags,
  imageUrl,
  url,
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
      className="group mb-3 last:mb-0 sm:mb-8"
      style={{
        scale: scaleProgress,
        opacity: opacityProgress,
      }}
    >
      {/* Card container */}
      <Link href={url} target="_blank">
        <div className=" relative max-w-[42rem] overflow-hidden rounded-xl border border-black/5 bg-gray-100  transition  hover:bg-gray-200 sm:min-h-[18rem] sm:pr-8 sm:group-even:pl-8">
          {/* Text Container on the left */}
          <div className="flex h-full flex-col px-5 pb-7 pt-4 sm:max-w-[50%] sm:pl-10 sm:pr-2 sm:pt-10 sm:group-even:ml-[18rem]">
            <h3 className="text-2xl font-semibold">{title}</h3>
            <p className="mt-2 leading-relaxed text-gray-700">{description}</p>
            <ul className="mb-0 mt-4 flex flex-wrap gap-2 self-end sm:mt-5">
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
            className="absolute -right-40 top-8 hidden w-[28.25rem] rounded-t-lg shadow-2xl transition
          group-even:-left-40 
          group-even:right-[initial]
          group-hover:-translate-x-3
          group-hover:translate-y-3
          group-hover:-rotate-2
          
          group-hover:scale-[1.04]
          group-even:group-hover:translate-x-3
          group-even:group-hover:translate-y-3
          
          group-even:group-hover:rotate-2 sm:block"
          />
        </div>
      </Link>
    </motion.div>
  );
}

export default Project;
