import React from 'react';
import { FaReact } from 'react-icons/fa';
import { LuGraduationCap } from 'react-icons/lu';
import { SiApachekafka } from 'react-icons/si';
import { BiNews } from 'react-icons/bi';
import { BsBank } from 'react-icons/bs';

export const experienceData = [
  {
    title: 'Senior Technical Lead',
    location: 'Deutsche Bank / HCLTech',
    description:
      'Overhauling legacy code bases to use modern, maintainable tools and technologies. Implementing micro-frontend architecture to refactor monolithic apps into modular services, enabling CI/CD by multiple scrum teams working in multiple languages and frameworks.',
    icon: React.createElement(BsBank),
    date: '2024',
  },
  {
    title: 'Software Engineer',
    location: 'xkite',
    description:
      'Built an open source GUI for Apache Kafka prototyping, testing and deployment with a team of five engineers. xkite lets developers spin up containerized Kafka clusters in minutes, run custom tests, and export their setup for deployment.',
    icon: React.createElement(SiApachekafka),
    date: '2023',
  },

  {
    title: 'Senior Communications Consultant',
    location: 'Wake County & Town of Clayton',
    description:
      "Built and maintained websites for two local governments, including N.C.'s largest county. Administered 60+ social media accounts. Wrote and edited news releases, newsletters, speeches, and more.",
    icon: React.createElement(FaReact),
    date: '2015 - 2022',
  },
  {
    title: 'Newspaper Reporter',
    location: 'Raleigh N&O, Statesville R&L',
    description: `Reported for the paper of record in N.C.'s capital city. Covered everything from the local Ham & Yam Festival to billion-dollar deals and interviews with future presidents.`,
    icon: React.createElement(BiNews),
    date: '2012-2015',
  },
  {
    title: 'Bachelor of Arts',
    location: 'University of North Carolina at Chapel Hill',
    description: 'School of Journalism and Mass Communication',
    icon: React.createElement(LuGraduationCap),
    date: '2012',
  },
] as const;
