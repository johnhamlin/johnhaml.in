'use client';

import { projectsData } from '@/content/projects';
import SectionHeading from './SectionHeading';
import React, { useEffect } from 'react';
import Project from './Project';
import { useSectionInView } from '@/hooks/useSectionInView';

function Projects() {
  const { ref } = useSectionInView('Projects', 0.5);

  return (
    <section ref={ref} id="projects" className="scroll-mt-28">
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

export default Projects;
