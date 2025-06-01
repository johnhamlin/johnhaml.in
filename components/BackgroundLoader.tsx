'use client';

import { useEffect, useState } from 'react';

export default function BackgroundLoader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    // Check if device can handle blur effects well
    const checkPerformance = () => {
      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Check for low-end device indicators
      const isLowEndDevice =
        navigator.hardwareConcurrency <= 2 || // Low CPU cores
        // navigator.deviceMemory <= 4 || // Low RAM (if available)
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
    // Simple gradient fallback for low-end devices
    return (
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(
              ellipse at top right,
              rgba(251, 226, 227, 0.3) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse at bottom left,
              rgba(219, 215, 251, 0.3) 0%,
              transparent 50%
            )
          `
        }}
      />
    );
  }

  // Full blur effect for capable devices
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-0 animate-fade-in"
      aria-hidden="true"
    >
      <div
        className="absolute right-[5rem] top-[-6rem] h-[31.25rem] w-[31.25rem] rounded-full bg-[#fbe2e3] dark:bg-[#946263] sm:w-[68.75rem]"
        style={{
          filter: 'blur(160px)',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      />
      <div
        className="absolute left-[-35rem] top-[-1rem] h-[31.25rem] w-[50rem] rounded-full bg-[#dbd7fb] dark:bg-[#676394] sm:w-[68.75rem] md:left-[-33rem] lg:left-[-28rem] xl:left-[-15rem] 2xl:left-[-5rem]"
        style={{
          filter: 'blur(160px)',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      />
    </div>
  );
}
