'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import {
  canLoadNonEssentialTracking,
  getClientTrackingConsent,
  isTrackingConsentRequired,
  setClientTrackingConsent,
  TRACKING_CONSENT_EVENT,
  type TrackingConsentState,
} from '@/lib/tracking/tracking-consent';

declare global {
  interface Window {
    __mbTrackingConsent?: 'granted' | 'denied';
  }
}

function getConsentModeValue(consent: TrackingConsentState) {
  return canLoadNonEssentialTracking(consent) ? 'granted' : 'denied';
}

export function TrackingConsentModeScript() {
  const defaultValue = isTrackingConsentRequired() ? 'denied' : 'granted';

  return (
    <Script
      id="minsah-tracking-consent-mode"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            ad_storage: '${defaultValue}',
            analytics_storage: '${defaultValue}',
            ad_user_data: '${defaultValue}',
            ad_personalization: '${defaultValue}',
            functionality_storage: 'granted',
            security_storage: 'granted'
          });
          window.__mbTrackingConsent = '${defaultValue}';
        `,
      }}
    />
  );
}

export function TrackingConsentBanner() {
  const [consent, setConsent] = useState<TrackingConsentState>('unknown');

  useEffect(() => {
    setConsent(getClientTrackingConsent());

    const handler = () => setConsent(getClientTrackingConsent());
    window.addEventListener(TRACKING_CONSENT_EVENT, handler);
    return () => window.removeEventListener(TRACKING_CONSENT_EVENT, handler);
  }, []);

  const required = isTrackingConsentRequired();
  if (!required || consent !== 'unknown') return null;

  const updateConsent = (nextConsent: Exclude<TrackingConsentState, 'unknown'>) => {
    setClientTrackingConsent(nextConsent);
    setConsent(nextConsent);
    const modeValue = getConsentModeValue(nextConsent);

    if (typeof window !== 'undefined') {
      window.__mbTrackingConsent = modeValue;
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          ad_storage: modeValue,
          analytics_storage: modeValue,
          ad_user_data: modeValue,
          ad_personalization: modeValue,
        });
      }
    }
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[9999] mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-800 shadow-2xl md:flex md:items-center md:justify-between md:gap-4">
      <div>
        <p className="font-semibold">Cookie & ads measurement</p>
        <p className="mt-1 text-gray-600">
          We use analytics and ads measurement cookies to improve shopping, measure campaigns, and keep product recommendations relevant. Essential checkout and security cookies always stay active.
        </p>
      </div>
      <div className="mt-3 flex shrink-0 gap-2 md:mt-0">
        <button
          type="button"
          className="rounded-full border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => updateConsent('denied')}
        >
          Decline
        </button>
        <button
          type="button"
          className="rounded-full bg-black px-4 py-2 font-medium text-white hover:bg-gray-800"
          onClick={() => updateConsent('granted')}
        >
          Allow
        </button>
      </div>
    </div>
  );
}
