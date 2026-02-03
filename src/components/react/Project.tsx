import { useRef } from 'react';
import { useScroll, motion, useTransform } from 'framer-motion';
import { projectsData } from '../../data/projects';

type ProjectProps = (typeof projectsData)[number] & { index: number };

export default function Project(props: ProjectProps) {
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
      {props.url ? (
        <a href={props.url} target="_blank" rel="noopener noreferrer">
          <ProjectCard {...props} isEven={props.index % 2 === 1} />
        </a>
      ) : (
        <ProjectCard {...props} isEven={props.index % 2 === 1} />
      )}
    </motion.div>
  );
}

function ProjectCard({
  title,
  description,
  tags,
  imageUrl,
  imageMobileUrl,
  isEven,
}: ProjectProps & { isEven: boolean }) {
  return (
    <div
      className={
        isEven
          ? 'relative max-w-[42rem] overflow-hidden rounded-xl border border-black/5 bg-gray-100 transition hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:min-h-[18rem] sm:pl-8'
          : 'relative max-w-[42rem] overflow-hidden rounded-xl border border-black/5 bg-gray-100 transition hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:min-h-[18rem] sm:pr-8'
      }
    >
      {/* Text Container on the left for desktop */}
      <div className="flex h-full flex-col pb-7">
        {/* Image for mobile version on top */}
        <div className="mb-2 h-[12rem] w-full overflow-hidden object-cover sm:hidden">
          <picture>
            <source
              media="(max-width: 639px)"
              srcSet={imageMobileUrl ? imageMobileUrl : imageUrl}
            />
            <img
              src={imageMobileUrl ? imageMobileUrl : imageUrl}
              alt={title}
              className="shrink-0"
              loading="lazy"
            />
          </picture>
        </div>
        <div
          className={
            isEven
              ? 'px-5 pt-4 sm:ml-[18rem] sm:max-w-[50%] sm:pl-2 sm:pr-10 sm:pt-10'
              : 'px-5 pt-4 sm:max-w-[50%] sm:pl-10 sm:pr-2 sm:pt-10'
          }
        >
          <h3 className="text-2xl font-semibold">{title}</h3>
          <p className="mt-2 leading-relaxed text-gray-700 dark:text-white/70">
            {description}
          </p>
          <ul className="mb-0 mt-4 flex flex-wrap gap-2 self-end sm:mt-5">
            {tags.map((tag) => (
              <li
                className="rounded-full bg-black/[0.7] px-3 py-1 text-[0.7rem] uppercase tracking-wider text-white dark:text-white/70"
                key={tag}
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Image - desktop only, alternates between right and left
          Tailwind safelist: -left-40 -right-40 group-hover:translate-x-3 group-hover:-translate-x-3 group-hover:rotate-2 group-hover:-rotate-2 */}
      <picture
        className={
          isEven
            ? 'absolute -left-40 top-8 hidden w-[28.25rem] sm:block'
            : 'absolute -right-40 top-8 hidden w-[28.25rem] sm:block'
        }
      >
        <source media="(min-width: 640px)" srcSet={imageUrl} />
        <img
          src={imageUrl}
          alt={title}
          className={
            isEven
              ? 'rounded-t-lg shadow-2xl transition group-hover:translate-x-3 group-hover:translate-y-3 group-hover:rotate-2 group-hover:scale-[1.04]'
              : 'rounded-t-lg shadow-2xl transition group-hover:-translate-x-3 group-hover:translate-y-3 group-hover:-rotate-2 group-hover:scale-[1.04]'
          }
          loading="lazy"
        />
      </picture>
    </div>
  );
}
