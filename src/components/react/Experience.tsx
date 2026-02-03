import SectionHeading from './SectionHeading';
import VerticalTimelineComponent from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';

const { VerticalTimeline, VerticalTimelineElement } = VerticalTimelineComponent;
import { experienceData } from '../../data/experience';
import { useSectionInView } from '../../hooks/useSectionInView';

export default function Experience() {
  const { ref, inView } = useSectionInView('Experience', 0.2);

  return (
    <section id="experience" ref={ref} className="mb-28 scroll-mt-28 sm:mb-40">
      <SectionHeading>My experience</SectionHeading>
      <VerticalTimeline
        className="vertical-timeline-element--work"
        lineColor=""
      >
        {/* Style of line set in globals.css */}
        {experienceData.map((item, index) => (
          <VerticalTimelineElement
            key={index}
            visible={inView} // doesn't show up without this
            date={item.date}
            icon={item.icon}
            iconStyle={{
              background: 'var(--timeline-icon-bg)',
              fontSize: '1.5rem',
            }}
            contentStyle={{
              background: 'var(--timeline-card-bg)',
              boxShadow: 'none',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              textAlign: 'left',
              padding: '1.3rem 2rem',
            }}
            contentArrowStyle={{
              borderRight: '0.4rem solid var(--timeline-arrow-color)',
            }}
          >
            <h3 className="font-semibold capitalize dark:text-white">{item.title}</h3>
            <p className="!mt-0 font-normal dark:text-white/70">{item.location}</p>
            <p className="!mt-1 !font-normal text-gray-700 dark:text-white/75">
              {item.description}
            </p>
          </VerticalTimelineElement>
        ))}
      </VerticalTimeline>
    </section>
  );
}
