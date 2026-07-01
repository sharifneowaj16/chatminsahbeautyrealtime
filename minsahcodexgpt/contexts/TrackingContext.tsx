'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { trackingManager, track } from '@/lib/tracking/manager';
import { initCampaignTracking } from '@/lib/tracking/campaigns';
import { canRunClientTracking } from '@/lib/tracking/client-traffic-filter';
import { TRACKING_CONSENT_EVENT } from '@/lib/tracking/tracking-consent';
import type { TrackingEvent, TrackingEventData } from '@/types/tracking';

interface TrackingContextType {
  track: (event: TrackingEvent, data?: TrackingEventData) => void;
  initialized: boolean;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeWhenAllowed = () => {
      if (!canRunClientTracking()) {
        setInitialized(false);
        return;
      }

      trackingManager.initSession();
      initCampaignTracking();
      setInitialized(true);
    };

    initializeWhenAllowed();
    window.addEventListener(TRACKING_CONSENT_EVENT, initializeWhenAllowed);
    window.addEventListener('focus', initializeWhenAllowed);

    return () => {
      window.removeEventListener(TRACKING_CONSENT_EVENT, initializeWhenAllowed);
      window.removeEventListener('focus', initializeWhenAllowed);
    };

    // PageView is owned by lib/tracking/pixels/FacebookPixel.tsx.
    // Keeping PageView out of this generic context prevents duplicate initial-load
    // PageView events with different event IDs.
  }, []);

  return (
    <TrackingContext.Provider value={{ track, initialized }}>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  const context = useContext(TrackingContext);
  if (context === undefined) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
}

// Export convenience hook for tracking events
export function useTrackEvent() {
  const { track } = useTracking();
  return track;
}
