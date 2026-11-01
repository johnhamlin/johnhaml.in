export type FactoryTile = {
  title: string;
  body: string;
  media?: { src: string; poster: string; alt: string };
  className?: string;
};

export const factoryTiles: readonly FactoryTile[] = [
  {
    title: 'EM',
    body: 'An engineering manager agent reads the backlog, breaks it into tasks, and assigns each one.',
  },
  {
    title: 'Engineers',
    body: 'Engineer agents pick up a task, write the code, and open a pull request.',
  },
  {
    title: 'Reviews',
    body: 'Every pull request gets three reviews: the EM, an automated reviewer, and a security pass. Small green changes merge on their own. Risky ones wait for me.',
    media: {
      src: '/factory-reviews.mp4',
      poster: '/factory-reviews.webp',
      alt: 'Pull requests passing EM, automated, and security reviews. Three merge on their own and one waits for a human.',
    },
    className: 'md:col-span-2',
  },
  {
    title: 'Home-server CI',
    body: 'Builds and checks run on a server at home, so every change is tested before anyone reads it.',
  },
  {
    title: 'Wiki',
    body: 'A shared wiki holds what the agents learn. They read it before they start and update it when they finish.',
  },
];
