'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  clearNonEssentialTrackingStorage,
  getClientTrackingConsent,
  syncClientTrackingConsentSignals,
  TRACKING_CONSENT_COOKIE,
  type TrackingConsentState,
} from '@/lib/tracking/tracking-consent';

declare global {
  interface Window { __mbTrackingConsent?: 'granted' | 'denied'; }
}

function getEffectiveStoredConsent(): Exclude<TrackingConsentState, 'withdrawn'> {
  const state = getClientTrackingConsent();
  if (state === 'denied') {
    return 'denied';
  }
  return 'granted';
}

export function TrackingConsentModeScript() {
  return (
    <Script
      id="minsah-tracking-consent-mode"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          function mbReadStoredTrackingConsent() {
            var match = document.cookie.match(new RegExp('(?:^|; )${TRACKING_CONSENT_COOKIE}=([^;]*)'));
            var value = match ? match[1] : null;
            if (!value) { try { value = window.localStorage.getItem('${TRACKING_CONSENT_COOKIE}'); } catch (e) {} }
            try { value = decodeURIComponent(value || ''); } catch (e) {}
            if (String(value).trim().toLowerCase() === 'denied') return 'denied';
            return 'granted';
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
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;
    const effective = getEffectiveStoredConsent();
    syncClientTrackingConsentSignals(effective === 'granted' ? 'granted' : 'denied');
    if (effective !== 'granted') {
      clearNonEssentialTrackingStorage();
    }
  }, [pathname]);

  // Zero Banner: non-GDPR auto-granted mode
  return null;
}
