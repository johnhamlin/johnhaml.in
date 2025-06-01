'use client';

import { useEffect, useState } from 'react';
import useTheme from '@/hooks/useTheme';

export default function BackgroundLoader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    // Check if device can handle blur effects well
    const checkPerformance = () => {
      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Check for low-end device indicators
      const isLowEndDevice =
        navigator.hardwareConcurrency <= 2 || // Low CPU cores
        // navigator?.deviceMemory <= 4 || // Low RAM (if available)
        /Android.*(Mobile|Tablet)|iPhone|iPad|iPod/i.test(navigator.userAgent); // Mobile device

      // Use fallback on low-end devices or if user prefers reduced motion
      setUseFallback(prefersReducedMotion || (isLowEndDevice && window.innerWidth < 768));

      // Delay loading to prevent initial paint blocking
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsLoaded(true);
        });
      });
    };

    checkPerformance();
  }, []);

  if (!isLoaded) {
    return null; // Don't render anything initially
  }

  if (useFallback) {
    // Optimized colored fallback for mobile devices
    return (
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden transition-opacity duration-300" aria-hidden="true" key={theme}>
        {/* Pink/red blob - mobile optimized */}
        <div
          className="absolute -right-20 -top-40 h-96 w-96 rounded-full bg-[#fbe2e3] opacity-40 transition-all duration-300 dark:bg-[#946263] dark:opacity-30"
          style={{
            filter: 'blur(80px)',
            transform: 'translateZ(0)',
          }}
        />

        {/* Purple blob - mobile optimized */}
        <div
          className="absolute -bottom-20 -left-40 h-96 w-96 rounded-full bg-[#dbd7fb] opacity-40 transition-all duration-300 dark:bg-[#676394] dark:opacity-30"
          style={{
            filter: 'blur(80px)',
            transform: 'translateZ(0)',
          }}
        />
      </div>
    );
  }

  // Full blur effect for capable devices
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-0 animate-fade-in transition-opacity duration-300"
      aria-hidden="true"
      key={theme} // Force re-render on theme change
    >
      <div
        className="absolute right-[5rem] top-[-6rem] h-[31.25rem] w-[31.25rem] rounded-full bg-[#fbe2e3] transition-colors duration-300 dark:bg-[#946263] sm:w-[68.75rem]"
        style={{
          filter: 'blur(160px)',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      />
      <div
        className="absolute left-[-35rem] top-[-1rem] h-[31.25rem] w-[50rem] rounded-full bg-[#dbd7fb] transition-colors duration-300 dark:bg-[#676394] sm:w-[68.75rem] md:left-[-33rem] lg:left-[-28rem] xl:left-[-15rem] 2xl:left-[-5rem]"
        style={{
          filter: 'blur(160px)',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      />
    </div>
  );
}
