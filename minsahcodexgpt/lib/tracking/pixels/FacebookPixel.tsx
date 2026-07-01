'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { buildVisitorMetaExternalId } from '@/lib/tracking/meta-external-id';

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

function getMetaExternalIdRaw() {
  return buildVisitorMetaExternalId(getCookieValue('mb_vid'));
}

function getFacebookIdentity() {
  return {
    fbc: getCookieValue('_fbc'),
    fbp: getCookieValue('_fbp'),
    // Raw stable key sent only to our server; /api/facebook-capi hashes it before Meta.
    externalId: getMetaExternalIdRaw(),
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

      if (window.fbq && !(window as Window & { __mbFbInitReady?: boolean }).__mbFbInitReady && attempts < 50) {
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
            function mbNormalizeMetaExternalId(input) {
              if (input === undefined || input === null) return undefined;
              var normalized = String(input).trim().toLowerCase();
              if (!normalized) return undefined;
              var separatorIndex = normalized.indexOf(':');
              if (separatorIndex > 0) {
                var prefix = normalized.slice(0, separatorIndex);
                var id = normalized.slice(separatorIndex + 1).trim().toLowerCase();
                if (id && (prefix === 'visitor' || prefix === 'user' || prefix === 'order')) {
                  return prefix + ':' + id;
                }
              }
              return 'visitor:' + normalized;
            }
            function mbSha256Hex(input) {
              var normalizedInput = mbNormalizeMetaExternalId(input);
              if (!normalizedInput || !window.crypto || !window.crypto.subtle || !window.TextEncoder) {
                return Promise.resolve(undefined);
              }
              return window.crypto.subtle
                .digest('SHA-256', new TextEncoder().encode(normalizedInput))
                .then(function(buffer) {
                  return Array.from(new Uint8Array(buffer))
                    .map(function(byte) { return byte.toString(16).padStart(2, '0'); })
                    .join('');
                })
                .catch(function() { return undefined; });
            }
            function mbReadCookie(name) {
              var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
              if (!match) return undefined;
              try { return decodeURIComponent(match[1]); } catch (e) { return match[1]; }
            }
            function mbSetCookie(name, value, maxAge) {
              document.cookie = name + '=' + encodeURIComponent(value) + ';max-age=' + maxAge + ';path=/;SameSite=Lax';
            }
            var mbVid = mbReadCookie('mb_vid');
            if (!mbVid) {
              mbVid = window.crypto && window.crypto.randomUUID
                ? window.crypto.randomUUID()
                : 'vid_' + Date.now() + '_' + Math.random().toString(36).slice(2);
            }
            var normalizedMbVidExternal = mbNormalizeMetaExternalId(mbVid);
            mbVid = normalizedMbVidExternal && normalizedMbVidExternal.indexOf('visitor:') === 0
              ? normalizedMbVidExternal.slice('visitor:'.length)
              : undefined;
            if (mbVid) {
              mbSetCookie('mb_vid', mbVid, 15552000);
            }
            try {
              var fbclid = new URLSearchParams(window.location.search).get('fbclid');
              if (fbclid && !mbReadCookie('_fbc')) {
                mbSetCookie('_fbc', 'fb.1.' + Date.now() + '.' + fbclid, 7776000);
              }
            } catch (e) {}
            var rawExternalId = mbNormalizeMetaExternalId(mbVid);
            if (rawExternalId) {
              mbSha256Hex(rawExternalId).then(function(hashedExternalId) {
                if (hashedExternalId) {
                  fbq('init', ${JSON.stringify(pixelId)}, { external_id: hashedExternalId });
                  window.__mbFbInitReady = true;
                } else {
                  fbq('init', ${JSON.stringify(pixelId)});
                  window.__mbFbInitReady = true;
                }
              });
            } else {
              fbq('init', ${JSON.stringify(pixelId)});
              window.__mbFbInitReady = true;
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
