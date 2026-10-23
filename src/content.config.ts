import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Homepage copy (intro, about). Previously defined in src/content/config.ts.
const text = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/text' }),
  schema: z.object({}).passthrough(),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    heroImage: z.string().optional(),
  }),
});

export const collections = { text, blog };
