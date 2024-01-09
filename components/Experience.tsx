import SectionHeading from './SectionHeading';
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { experienceData } from '@/content/experience';

function Experience() {
  return (
    <section id="experience">
      <SectionHeading>Experience</SectionHeading>
      <VerticalTimeline>
        {experienceData.map((experience, index) => (
          <VerticalTimelineElement key={index}></VerticalTimelineElement>
        ))}
      </VerticalTimeline>
    </section>
  );
}
export default Experience;
