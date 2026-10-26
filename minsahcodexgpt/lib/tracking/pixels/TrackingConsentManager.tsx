'use client';

import Script from 'next/script';
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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
  interface Window { __mbTrackingConsent?: 'granted' | 'denied'; }
}

function getEffectiveStoredConsent(): Exclude<TrackingConsentState, 'withdrawn'> {
  const state = getClientTrackingConsent();
  const version = getClientTrackingConsentVersion();
  if (state !== 'granted' || version !== CURRENT_TRACKING_CONSENT_VERSION) {
    return state === 'denied' ? 'denied' : 'unknown';
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
            var versionMatch = document.cookie.match(/(?:^|; )mb_tracking_consent_version=([^;]*)/);
            var version = versionMatch ? versionMatch[1] : null;
            if (!value) { try { value = window.localStorage.getItem('${TRACKING_CONSENT_COOKIE}'); } catch (e) {} }
            if (!version) { try { version = window.localStorage.getItem('mb_tracking_consent_version'); } catch (e) {} }
            try { value = decodeURIComponent(value || ''); } catch (e) {}
            try { version = decodeURIComponent(version || ''); } catch (e) {}
            return String(value).trim().toLowerCase() === 'granted' && String(version).trim() === '${CURRENT_TRACKING_CONSENT_VERSION}' ? 'granted' : 'denied';
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
  const [consent, setConsent] = useState<TrackingConsentState>('unknown');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;
    const sync = () => {
      const effective = getEffectiveStoredConsent();
      setConsent(effective);
      syncClientTrackingConsentSignals(effective === 'granted' ? 'granted' : 'denied');
      if (effective !== 'granted') clearNonEssentialTrackingStorage();
    };
    const timer = window.setTimeout(sync, 0);
    const openHandler = () => { setSettingsOpen(true); setError(null); };
    window.addEventListener(TRACKING_CONSENT_EVENT, sync);
    window.addEventListener('mb:open-cookie-settings', openHandler);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(TRACKING_CONSENT_EVENT, sync);
      window.removeEventListener('mb:open-cookie-settings', openHandler);
    };
  }, [pathname]);

  const updateConsent = useCallback(async (nextConsent: 'granted' | 'denied') => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/privacy/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ state: nextConsent, previousState: consent, version: CURRENT_TRACKING_CONSENT_VERSION }),
        keepalive: true,
      });
      if (!response.ok) throw new Error('Consent could not be saved. Please try again.');
      // Update browser consent only after the server accepts the choice.
      setClientTrackingConsent(nextConsent);
      setConsent(nextConsent);
      setSettingsOpen(false);
    } catch {
      // Fail closed: no tracking is enabled when the consent write fails.
      setError('আপনার পছন্দ সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setSaving(false);
    }
  }, [consent, saving]);

  if (pathname?.startsWith('/admin')) return null;
  if (consent !== 'unknown' && !settingsOpen) return null;

  return (
    <div role="dialog" aria-label="Cookie and tracking consent" aria-live="polite" className="fixed inset-x-3 bottom-3 z-[9999] mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-800 shadow-2xl md:flex md:items-center md:justify-between md:gap-4">
      <div className="md:pr-3">
        <p className="font-semibold">Cookie & ads measurement</p>
        <p className="mt-1 text-gray-600">We only run configured analytics, advertising pixels, attribution capture, and experience analytics after you choose “Allow All”. Essential shopping, cart, account, checkout, payment, and security functions remain available if you decline.</p>
        {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
      </div>
      <div className="mt-3 flex shrink-0 flex-wrap gap-2 md:mt-0">
        <button type="button" disabled={saving} className="rounded-full border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50" onClick={() => void updateConsent('denied')}>
          {saving ? 'Saving…' : 'Reject Non-Essential'}
        </button>
        <button type="button" disabled={saving} className="rounded-full bg-black px-4 py-2 font-medium text-white hover:bg-gray-800 disabled:opacity-50" onClick={() => void updateConsent('granted')}>
          {saving ? 'Saving…' : 'Allow All'}
        </button>
      </div>
    </div>
  );
}
