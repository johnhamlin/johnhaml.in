import { projectsData } from '../../data/projects';
import SectionHeading from './SectionHeading';
import Project from './Project';
import { useSectionInView } from '../../hooks/useSectionInView';

export default function Projects() {
  const { ref } = useSectionInView('Projects', 0.5);

  return (
    <section ref={ref} id="projects" className="mb-28 scroll-mt-28">
      <SectionHeading>My Projects</SectionHeading>
      <div>
        {projectsData.map((project, index) => (
          <Project key={project.title} {...project} index={index} />
        ))}
      </div>
    </section>
  );
}
