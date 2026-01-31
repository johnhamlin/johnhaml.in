export const projectsData = [
  {
    title: 'ScrewTapp',
    description:
      'There were lots of apps to stream the jam band shows on archive.org, but none for the trove of DJ Screw mixtapes. So I made one. Currently in alpha, but you can check out the code on my GitHub.',
    tags: ['React Native', 'Expo', 'Redux', 'TypeScript', 'RTK Query'],
    imageUrl: '/screwtapp.png',
    imageMobileUrl: null,
    url: 'https://github.com/johnhamlin/screwtapp',
  },
  {
    title: 'This Site',
    description:
      'Your classic, over-engineered personal portfolio site, built from scratch with my favorite tools and a few I wanted to try out.',
    tags: ['Astro', 'TypeScript', 'MDX', 'Tailwind CSS', 'Framer Motion'],
    imageUrl: '/this-site.jpg',
    imageMobileUrl: null,
    url: 'https://github.com/johnhamlin/johnhaml.in',
  },
  {
    title: 'xkite',
    description:
      'Open source GUI for Apache Kafka prototyping, testing and deployment. Spins up containerized Kafka clusters, runs custom tests, and exports configs for deployment.',
    tags: [
      'Next.js',
      'Apache Kafka',
      'Prometheus',
      'Grafana',
      'Docker',
      'Java',
      'Spring Boot',
    ],
    imageUrl: '/xkite.png',
    imageMobileUrl: null,
    url: 'https://xkite.io/',
  },
  {
    title: 'Me v2.0',
    description: `In 2023, my wife and I took some time off to welcome twin boys and get to know the little guys.`,
    tags: ['Swaddling', 'Coffee', 'Ms. Rachel', 'Love', 'Earplugs'],
    imageUrl: '/version-2.jpg',
    imageMobileUrl: '/version-2-mobile.jpg',
    url: null,
  },
] as const;
