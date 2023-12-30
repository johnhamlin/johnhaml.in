import { projectsData } from '@/content/projects';
import SectionHeading from './SectionHeading';
import React from 'react';
import Project from './Project';

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

export default Projects;