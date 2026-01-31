import type { links } from '../data/links';

export type SectionName = (typeof links)[number]['name'];

type SectionSubscriber = (section: SectionName) => void;

let activeSection: SectionName = 'Home';
let timeOfLastClick: number = 0;
const subscribers: Set<SectionSubscriber> = new Set();

/**
 * Get the current active section
 */
export function getActiveSection(): SectionName {
  return activeSection;
}

/**
 * Set the active section and notify subscribers
 */
export function setActiveSection(section: SectionName): void {
  activeSection = section;

  // Notify all subscribers
  subscribers.forEach(callback => callback(section));
}

/**
 * Get the time of the last manual click on a nav link
 */
export function getTimeOfLastClick(): number {
  return timeOfLastClick;
}

/**
 * Set the time of the last manual click on a nav link
 * Used to debounce auto-selection when user clicks nav
 */
export function setTimeOfLastClick(time: number): void {
  timeOfLastClick = time;
}

/**
 * Subscribe to active section changes
 * Returns an unsubscribe function
 */
export function subscribeActiveSection(callback: SectionSubscriber): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}
