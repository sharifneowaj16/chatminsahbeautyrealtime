'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  clearNonEssentialTrackingStorage,
  CURRENT_TRACKING_CONSENT_VERSION,
  getClientTrackingConsent,
  setClientTrackingConsent,
  TRACKING_CONSENT_COOKIE,
  TRACKING_CONSENT_MAX_AGE_SECONDS,
  TRACKING_CONSENT_VERSION_COOKIE,
  type TrackingConsentState,
} from '@/lib/tracking/tracking-consent';

declare global {
  interface Window {
    __mbTrackingConsent?: 'granted' | 'denied';
  }
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
            var normalized = String(value || '').trim().toLowerCase();
            if (normalized === 'denied' || normalized === 'withdrawn') return 'denied';
            return 'granted';
          }
          var mbInitialConsent = mbReadStoredTrackingConsent();
          var secure = window.location.protocol === 'https:' ? ';Secure' : '';
          document.cookie = '${TRACKING_CONSENT_COOKIE}=' + encodeURIComponent(mbInitialConsent) + ';max-age=${TRACKING_CONSENT_MAX_AGE_SECONDS};path=/;SameSite=Lax' + secure;
          document.cookie = '${TRACKING_CONSENT_VERSION_COOKIE}=${CURRENT_TRACKING_CONSENT_VERSION};max-age=${TRACKING_CONSENT_MAX_AGE_SECONDS};path=/;SameSite=Lax' + secure;
          try {
            window.localStorage.setItem('${TRACKING_CONSENT_COOKIE}', mbInitialConsent);
            window.localStorage.setItem('${TRACKING_CONSENT_VERSION_COOKIE}', '${CURRENT_TRACKING_CONSENT_VERSION}');
          } catch (e) {}
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
    setClientTrackingConsent(effective === 'granted' ? 'granted' : 'denied');
    if (effective !== 'granted') {
      clearNonEssentialTrackingStorage();
    }
  }, [pathname]);

  // Zero Banner: non-GDPR auto-granted mode
  return null;
}
