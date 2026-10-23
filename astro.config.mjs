import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { rehypeHeadingAnchors } from './src/plugins/rehype-heading-anchors.mjs';

// Canonical origin already used by the HTML layout (johnhamlin.com, not johnhaml.in).
export default defineConfig({
  site: 'https://johnhamlin.com',
  trailingSlash: 'never',
  integrations: [
    react(),
    tailwind(),
    mdx(),
    sitemap({
      filter: (page) => !page.endsWith('/rss.xml'),
    }),
  ],
  output: 'static',
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: 'light',
    },
    rehypePlugins: [rehypeHeadingAnchors],
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'framer-motion': ['framer-motion'],
          },
        },
      },
    },
  },
});
