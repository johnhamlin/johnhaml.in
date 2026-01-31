import { defineCollection, z } from 'astro:content';

const text = defineCollection({
  type: 'content',
  schema: z.object({
    // No frontmatter required for these simple MDX files
  }),
});

export const collections = { text };
