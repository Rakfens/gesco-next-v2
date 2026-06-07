import { useState, useEffect } from 'react';

/**
 * SSR-safe mobile detection.
 * Returns false during SSR (no window), then updates after mount.
 * Use this instead of direct window.innerWidth checks to avoid hydration mismatch.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fn = () => setIsMobile(window.innerWidth < breakpoint);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [breakpoint]);

  // Return false during SSR, real value after mount
  return mounted ? isMobile : false;
}
