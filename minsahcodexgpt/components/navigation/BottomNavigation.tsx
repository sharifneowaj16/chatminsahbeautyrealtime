'use client';

import React, { useEffect, useState } from 'react';
import {
  DEFAULT_MOBILE_NAV_CONFIG,
  MobileNavigationConfig,
} from '@/types/navigation-config';
import { useSmartNavButtons } from './useSmartNavButtons';
import SlidingCapsuleNav from './variants/SlidingCapsuleNav';
import SegmentedDockNav from './variants/SegmentedDockNav';
import CompactMicroNav from './variants/CompactMicroNav';

export default function BottomNavigation() {
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<MobileNavigationConfig>(DEFAULT_MOBILE_NAV_CONFIG);
  const [wishlistCount, setWishlistCount] = useState<number>(0);

  // Synchronize live wishlist count & config
  useEffect(() => {
    setMounted(true);

    const syncWishlist = () => {
      try {
        const raw = localStorage.getItem('minsah_wishlist_count');
        if (raw !== null) {
          setWishlistCount(Number(raw) || 0);
        }
      } catch {}
    };

    syncWishlist();
    window.addEventListener('minsah:wishlist-update', syncWishlist);
    window.addEventListener('storage', syncWishlist);

    // Fetch live mobile navigation config from public API
    fetch('/api/navigation-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.config) {
          setConfig(data.config);
        }
      })
      .catch((err) => {
        console.warn('Failed to load navigation config, using default:', err);
      });

    const handleConfigUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<MobileNavigationConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      }
    };

    window.addEventListener('minsah:navigation-config-updated', handleConfigUpdate);

    return () => {
      window.removeEventListener('minsah:wishlist-update', syncWishlist);
      window.removeEventListener('storage', syncWishlist);
      window.removeEventListener('minsah:navigation-config-updated', handleConfigUpdate);
    };
  }, []);

  const smartButtons = useSmartNavButtons(config.buttons, wishlistCount);

  if (!mounted) {
    // Deterministic static SSR layout placeholder with zero shift
    return <SlidingCapsuleNav buttons={smartButtons} />;
  }

  switch (config.navBarStyle) {
    case 'style-09':
      return <SegmentedDockNav buttons={smartButtons} />;
    case 'style-10':
      return <CompactMicroNav buttons={smartButtons} />;
    case 'style-05':
    default:
      return <SlidingCapsuleNav buttons={smartButtons} />;
  }
}
