import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

export const BLOG_DESCRIPTION =
  'Build-in-public notes on AI engineering and software.';

const WORDS_PER_MINUTE = 200;

export function toDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`Invalid date: ${String(value)}`);
  }
  return date;
}

export function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(toDate(value));
}

export function isoDate(value: Date | string): string {
  return toDate(value).toISOString().slice(0, 10);
}

export function sameUtcDay(a: Date | string, b: Date | string): boolean {
  return isoDate(a) === isoDate(b);
}

export function readingTime(body: string | undefined): string {
  const text = (body ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~]/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  return `${minutes} min read`;
}

export function tagSlug(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function canonicalUrl(pathname: string, site: URL): string {
  const url = new URL(pathname, site);
  if (url.pathname !== '/') {
    url.pathname = url.pathname.replace(/\/$/, '');
  }
  url.search = '';
  url.hash = '';
  return url.href;
}

function byNewest(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => {
    const delta = toDate(b.data.pubDate).valueOf() - toDate(a.data.pubDate).valueOf();
    if (delta !== 0) return delta;
    return a.data.title.localeCompare(b.data.title);
  });
}

/** Posts for the index, tag pages, and post routes. Drafts stay visible in dev. */
export async function getVisiblePosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog');
  return byNewest(
    posts.filter((post) => (import.meta.env.PROD ? post.data.draft !== true : true))
  );
}

/** Published posts only. Drafts never go into the feed. */
export async function getFeedPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog');
  return byNewest(posts.filter((post) => post.data.draft !== true));
}

export function getAdjacentPosts(posts: BlogPost[], id: string) {
  const index = posts.findIndex((post) => post.id === id);
  if (index === -1) {
    return { newer: undefined, older: undefined };
  }
  return {
    newer: index > 0 ? posts[index - 1] : undefined,
    older: index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}

export function uniqueTags(posts: BlogPost[]): { slug: string; label: string }[] {
  const tags = new Map<string, string>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const slug = tagSlug(tag);
      if (!slug || tags.has(slug)) continue;
      tags.set(slug, tag);
    }
  }
  return [...tags.entries()]
    .map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
