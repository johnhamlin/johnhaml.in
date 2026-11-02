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
    body: 'Every pull request gets three reviews: the EM, an automated reviewer, and a security pass. Small, safe changes merge once checks pass and a bot reviews them. Anything touching auth, payments, migrations, secrets or new dependencies waits for me.',
    media: {
      src: '/factory-reviews.mp4',
      poster: '/factory-reviews.webp',
      alt: 'Three changes pass every review and merge; one touching security waits for John.',
    },
    className: 'md:col-span-2',
  },
  {
    title: 'Home-server CI',
    body: 'Builds and tests run on a box in my house, so every change is checked before I read it.',
  },
  {
    title: 'Wiki',
    body: 'A shared wiki holds what the agents learn. They read it before they start and update it when they finish.',
  },
];
