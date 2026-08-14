'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import {
  clearNonEssentialTrackingStorage,
  CURRENT_TRACKING_CONSENT_VERSION,
  getClientTrackingConsent,
  getClientTrackingConsentVersion,
  setClientTrackingConsent,
  syncClientTrackingConsentSignals,
  TRACKING_CONSENT_COOKIE,
  TRACKING_CONSENT_EVENT,
  type TrackingConsentState,
} from '@/lib/tracking/tracking-consent';

declare global {
  interface Window {
    __mbTrackingConsent?: 'granted' | 'denied';
  }
}

export function TrackingConsentModeScript() {
  return (
    <Script
      id="minsah-tracking-consent-mode"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          function mbReadStoredTrackingConsent() {
            var match = document.cookie.match(new RegExp('(?:^|; )${TRACKING_CONSENT_COOKIE}=([^;]*)'));
            if (!match) return 'denied';
            var value = match[1];
            try { value = decodeURIComponent(value); } catch (e) {}
            var versionMatch = document.cookie.match(new RegExp('(?:^|; )mb_tracking_consent_version=([^;]*)'));
            return String(value).trim().toLowerCase() === 'granted' && versionMatch ? 'granted' : 'denied';
          }
          var mbInitialConsent = mbReadStoredTrackingConsent();
          gtag('consent', 'default', {
            ad_storage: mbInitialConsent,
            analytics_storage: mbInitialConsent,
            ad_user_data: mbInitialConsent,
            ad_personalization: mbInitialConsent,
            functionality_storage: 'granted',
            security_storage: 'granted'
          });
          window.__mbTrackingConsent = mbInitialConsent;
        `,
      }}
    />
  );
}

export function TrackingConsentBanner() {
  const [consent, setConsent] = useState<TrackingConsentState>('unknown');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const rawConsent = getClientTrackingConsent();
    const storedConsent = rawConsent === 'granted' && !getClientTrackingConsentVersion() ? 'unknown' : rawConsent;
    const stateSyncTimer = window.setTimeout(() => setConsent(storedConsent), 0);

    syncClientTrackingConsentSignals(
      storedConsent === 'granted' ? 'granted' : 'denied'
    );

    // Remove legacy tracking identifiers left by older deployments when there
    // is no explicit grant or the visitor has already declined.
    if (storedConsent !== 'granted') {
      clearNonEssentialTrackingStorage();
    }

    const handler = () => setConsent(getClientTrackingConsent());
    window.addEventListener(TRACKING_CONSENT_EVENT, handler);
    return () => {
      window.clearTimeout(stateSyncTimer);
      window.removeEventListener(TRACKING_CONSENT_EVENT, handler);
    };
  }, []);

  const updateConsent = (nextConsent: Exclude<TrackingConsentState, 'unknown' | 'withdrawn'>) => {
    const previousState = consent;
    setClientTrackingConsent(nextConsent);
    void fetch('/api/privacy/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ state: nextConsent, previousState, version: CURRENT_TRACKING_CONSENT_VERSION }),
      keepalive: true,
    }).catch(() => undefined);
    setConsent(nextConsent);
    setSettingsOpen(false);
  };

  if (consent !== 'unknown' && !settingsOpen) {
    return (
      <button
        type="button"
        className="fixed bottom-3 left-3 z-[9998] rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-md hover:bg-gray-50"
        onClick={() => setSettingsOpen(true)}
      >
        Cookie settings
      </button>
    );
  }

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
