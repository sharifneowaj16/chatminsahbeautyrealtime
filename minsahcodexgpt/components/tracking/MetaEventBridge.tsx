'use client';

import { useEffect } from 'react';
import { buildMetaBrowserEvent } from '@/lib/meta/browser/payload';
import { dispatchMetaBrowserEvent } from '@/lib/meta/browser/client';
import type { MetaBrowserEventName } from '@/lib/meta/browser/types';

export const META_BROWSER_EVENT = 'minsah:meta-browser-event';

export type MetaBrowserBridgeDetail = {
  eventName: MetaBrowserEventName;
  eventId?: string;
  payload?: Record<string, unknown>;
  sendCapi?: boolean;
};

/**
 * Optional integration bridge for isolated widgets. Core commerce call-sites
 * use the typed builders directly; this bridge still applies the same contract.
 */
export function MetaEventBridge() {
  useEffect(() => {
    const handle = (rawEvent: Event) => {
      const detail = (rawEvent as CustomEvent<MetaBrowserBridgeDetail>).detail;
      if (!detail?.eventName) return;
      const event = buildMetaBrowserEvent(detail);
      void dispatchMetaBrowserEvent(event, { sendCapi: detail.sendCapi });
    };
    window.addEventListener(META_BROWSER_EVENT, handle);
    return () => window.removeEventListener(META_BROWSER_EVENT, handle);
  }, []);

  return null;
}
