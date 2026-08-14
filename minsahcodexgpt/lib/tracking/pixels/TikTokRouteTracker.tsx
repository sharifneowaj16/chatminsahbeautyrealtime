'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Fires TikTok page tracking on Next.js App Router client-side navigation.
 *
 * The base TikTok pixel snippet already calls ttq.page() on initial load.
 * This component intentionally skips the first render and only fires when
 * the route/search params change after hydration.
 */
export default function TikTokRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    if (typeof window === 'undefined') return;
    window.ttq?.page?.();
  }, [pathname, searchParams]);

  return null;
}
