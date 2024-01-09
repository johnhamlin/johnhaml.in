import { links } from '@/content/links';

declare global {
  type SectionName = (typeof links)[number]['name'];
}
