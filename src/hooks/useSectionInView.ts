import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import {
  setActiveSection,
  getTimeOfLastClick,
  type SectionName,
} from '../scripts/active-section';

// Helper function to detect mobile devices
function isMobileDevice() {
  if (typeof window === 'undefined') return false;

  // Using regex to detect common mobile devices
  const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(navigator.userAgent);
}

// Helper function to detect orientation
function isPortraitMode() {
  if (typeof window === 'undefined') return true;
  return window.innerHeight > window.innerWidth;
}

export function useSectionInView(sectionName: SectionName, threshold = 0.75) {
  const [isMobile] = useState(() => isMobileDevice());
  const [isPortrait, setIsPortrait] = useState(() => isPortraitMode());

  // Update orientation on resize
  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(isPortraitMode());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Adjust threshold based on device type and orientation
  // Portrait mode on mobile needs a lower threshold since sections may be taller
  let effectiveThreshold = threshold;
  if (isMobile) {
    effectiveThreshold = isPortrait
      ? Math.min(threshold, 0.2)
      : Math.min(threshold, 0.3);
  }

  const { ref, inView } = useInView({
    threshold: effectiveThreshold,
  });

  useEffect(() => {
    if (inView && Date.now() - getTimeOfLastClick() > 1000) {
      setActiveSection(sectionName);
    }
  }, [inView, sectionName]);

  return { ref, inView };
}
