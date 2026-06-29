'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

interface FacebookPixelProps {
  pixelId: string;
  enabled?: boolean;
}

function getCookieValue(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return undefined;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function getFacebookIdentity() {
  return {
    fbc: getCookieValue('_fbc'),
    fbp: getCookieValue('_fbp'),
    externalId: getCookieValue('mb_vid'),
  };
}


const SENSITIVE_EVENT_SOURCE_PARAMS = [
  'bpt',
  'token',
  'access_token',
  'signature',
  'secret',
  'auth',
  'session',
  'nonce',
];

function getSafeEventSourceUrl() {
  if (typeof window === 'undefined') return undefined;

  try {
    const url = new URL(window.location.href);
    for (const param of SENSITIVE_EVENT_SOURCE_PARAMS) {
      url.searchParams.delete(param);
    }
    return url.toString();
  } catch {
    return window.location.origin + window.location.pathname;
  }
}

/**
 * Send PageView to Facebook Conversions API with the same eventID as the browser pixel.
 */
async function sendPageViewToCAPI(eventId: string) {
  if (typeof window === 'undefined') return;

  try {
    const identity = getFacebookIdentity();

    await fetch('/api/facebook-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'PageView',
        eventId,
        eventSourceUrl: getSafeEventSourceUrl(),
        fbc: identity.fbc,
        fbp: identity.fbp,
        externalId: identity.externalId,
        country: 'BD',
      }),
    });
  } catch {
    // Browser pixel already fired.
  }
}

export default function FacebookPixel({ pixelId, enabled = true }: FacebookPixelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPageViewKey = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !pixelId) return;

    const pageViewKey =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : pathname || '';
    if (lastPageViewKey.current === pageViewKey) return;
    lastPageViewKey.current = pageViewKey;

    const eventId = `PageView-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const fireWithEventId = () => {
      if (typeof window === 'undefined') return;

      if (!window.fbq && attempts < 50) {
        attempts += 1;
        timer = setTimeout(fireWithEventId, 100);
        return;
      }

      if (window.fbq) {
        window.fbq('track', 'PageView', {}, { eventID: eventId });
        sendPageViewToCAPI(eventId);
      }
    };

    timer = setTimeout(fireWithEventId, 0);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pathname, searchParams, pixelId, enabled]);

  if (!enabled || !pixelId) return null;

  return (
    <>
      <Script
        id="facebook-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            var mbVidMatch = document.cookie.match(/(?:^|; )mb_vid=([^;]*)/);
            var externalId;
            try {
              externalId = mbVidMatch ? decodeURIComponent(mbVidMatch[1]) : undefined;
            } catch (e) {
              externalId = mbVidMatch ? mbVidMatch[1] : undefined;
            }
            if (externalId) {
              fbq('init', ${JSON.stringify(pixelId)}, { external_id: externalId });
            } else {
              fbq('init', ${JSON.stringify(pixelId)});
            }
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
