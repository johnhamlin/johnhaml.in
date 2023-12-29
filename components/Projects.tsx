import { projectsData } from "@/content/projects";
import SectionHeading from "./SectionHeading";
import Image from "next/image";
import React from "react";

function Projects() {
  return (
    <section>
      <SectionHeading>My Projects</SectionHeading>
      <div>
        {projectsData.map((project) => (
          <React.Fragment key={project.title}>
            <Project {...project} />
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

function Project({
  title,
  description,
  tags,
  imageUrl,
}: (typeof projectsData)[number]) {
  return (
    <div className="bg-gray-100 max-w-[42rem] border border-black/5 overflow-hidden sm:pr-8 relative sm:h-[20rem] mb-3 sm:mb-8 last:mb-0">
      {/* Text Container on the left */}
      <div className="pt-4 pb-7 px-5 sm:pl-10 sm:pr-2 sm:top-10 sm:max-w-[50%] flex flex-col h-full">
        <h3 className="text-2xl font-semibold">{title}</h3>
        <p className="mt-2 leading-relaxed text-gray-700">{description}</p>
        <ul className="flex flex-wrap gap-2 mt-4 sm:mt-auto">
          {tags.map((tag) => (
            <li
              className="bg-black/[0.7] px-3 py-1 text-[0.7rem] uppercase tracking-wider text-white rounded-full"
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
        className="absolute top-8 -right-40 w-[28.05rem] rounded-t-lg shadow-2xl "
      />
    </div>
  );
}

export default Projects;
