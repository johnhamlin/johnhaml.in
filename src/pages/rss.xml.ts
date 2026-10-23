import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { BLOG_DESCRIPTION, getFeedPosts } from '../lib/blog';

export async function GET(context: APIContext) {
  if (!context.site) {
    throw new Error('Set `site` in astro.config.mjs to generate the RSS feed.');
  }

  const posts = await getFeedPosts();

  return rss({
    title: 'John Hamlin',
    description: BLOG_DESCRIPTION,
    site: context.site,
    trailingSlash: false,
    customData: '<language>en-us</language>',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: `/blog/${post.id}`,
    })),
  });
}
