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
    <div
      role="dialog"
      aria-label="Cookie and tracking consent"
      aria-live="polite"
      className="fixed left-3 right-3 sm:left-6 sm:right-6 md:left-1/2 md:right-auto md:-translate-x-1/2 bottom-[calc(var(--minsah-mobile-navigation-offset,4.5rem)+0.75rem)] md:bottom-6 z-[9999] w-auto md:w-full md:max-w-2xl lg:max-w-3xl rounded-2xl border border-stone-200/90 bg-white/98 p-3.5 sm:p-4 text-sm text-stone-800 shadow-[0_12px_36px_rgba(0,0,0,0.18)] backdrop-blur-md md:flex md:items-center md:justify-between md:gap-4 pointer-events-auto overflow-hidden no-scrollbar box-border"
    >
      <div className="min-w-0 flex-1 pr-0 md:pr-4 overflow-hidden break-words">
        <p className="font-semibold text-stone-900 text-xs sm:text-sm">Cookie &amp; ads measurement</p>
        <p className="mt-1 text-xs text-stone-600 leading-relaxed">
          We only run configured analytics, advertising pixels, attribution capture, and experience analytics after you choose “Allow All”. Essential shopping, cart, account, checkout, payment, and security functions remain available if you decline.
        </p>
        {error && <p role="alert" className="mt-2 text-xs font-semibold text-red-600 break-words">{error}</p>}
      </div>
      <div className="mt-3 flex shrink-0 flex-col sm:flex-row gap-2 sm:gap-2.5 md:mt-0 w-full md:w-auto">
        <button
          type="button"
          disabled={saving}
          className="min-h-[44px] w-full sm:w-auto rounded-full border border-stone-300 px-5 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 active:scale-[0.98] transition-transform cursor-pointer touch-manipulation disabled:opacity-50 flex items-center justify-center shrink-0"
          onClick={() => void updateConsent('denied')}
        >
          {saving ? 'Saving…' : 'Reject Non-Essential'}
        </button>
        <button
          type="button"
          disabled={saving}
          className="min-h-[44px] w-full sm:w-auto rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 active:scale-[0.98] transition-transform cursor-pointer touch-manipulation disabled:opacity-50 flex items-center justify-center shadow-sm shrink-0"
          onClick={() => void updateConsent('granted')}
        >
          {saving ? 'Saving…' : 'Allow All'}
        </button>
      </div>
    </div>
  );
}
