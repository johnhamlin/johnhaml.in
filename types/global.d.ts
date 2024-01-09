import { links } from '@/lib/data';

declare global {
  type SectionName = (typeof links)[number]['name'];
}
