import xkiteImg from '@/public/xkite.png';
import screwtappImg from '@/public/screwtapp.png';
import version2Img from '@/public/version-2.jpg';
import thisSiteImg from '@/public/this-site.jpg';

export const projectsData = [
  {
    title: 'xkite',
    description:
      'Open source GUI for Apache Kafka prototyping, testing and deployment. Spins up containerized Kafka clusters, runs custom tests, and exports configs for deployment',
    tags: [
      'Next.js',
      'Apache Kafka',
      'Prometheus',
      'Grafana',
      'Docker',
      'Java',
      'Spring Boot',
    ],
    imageUrl: xkiteImg,
    url: 'https://xkite.io/',
  },
  {
    title: 'ScrewTapp',
    description:
      'There were lots of apps to stream the jam band shows on archive.org, but none for the trove of DJ Screw mixtapes. So I made one.',
    tags: ['React Native', 'Expo', 'Redux', 'TypeScript', 'RTK Query'],
    imageUrl: screwtappImg,
    url: 'https://github.com/johnhamlin/screwtapp',
  },
  {
    title: 'This Site',
    description:
      'Your classic, over-engineered personal portfolio site, built from scratch with my favorite tools and a few I wanted to try out.',
    tags: ['Next.js', 'TypeScript', 'MDX', 'Tailwind CSS', 'Framer Motion'],
    imageUrl: thisSiteImg,
    url: 'https://github.com/johnhamlin/johnhaml.in',
  },
  {
    title: 'Me v2.0',
    description:
      'In 2023, my wife and I took some time off to welcome twin boys and get to know the little guys.',
    tags: ['Swaddling', 'Coffee', 'Diapers', 'Love', 'Earplugs'],
    imageUrl: version2Img,
    url: '',
  },
] as const;
