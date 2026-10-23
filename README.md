## Writing a blog post

Posts are Markdown or MDX files in `src/content/blog`. The filename is the URL slug: `src/content/blog/my-post.mdx` is served at `/blog/my-post`.

```md
---
title: Post title
description: One or two sentences used on the blog index, in RSS, and for social cards.
pubDate: 2026-10-23
updatedDate: 2026-10-24
tags:
  - ai-engineering
draft: true
heroImage: /images/my-post.webp
---

Write the post here. Markdown and MDX both work, including fenced code blocks.
```

`title`, `description`, `pubDate`, and `tags` are required. `updatedDate` and `heroImage` are optional. `heroImage` is a root-relative file in `public/` or an absolute URL. `draft` defaults to `false`. Tag URLs are lowercase slugs, so `ai-engineering` is `/blog/tags/ai-engineering`.

Drafts are visible in `npm run dev` (including the index and tag pages) and left out of `npm run build`: no post page, no listing, no `/rss.xml` item, and no sitemap URL. Set `draft: false` when a post should ship.

---

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## TypeScript Check

Run `npm install` to install dependencies before running `npx tsc --noEmit`. If you see errors about missing image modules, ensure `next-env.d.ts` exists by running `npm run dev` once or create the file with references to `next` and `next/image-types`.

