'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { canRunClientTracking } from '@/lib/tracking/client-traffic-filter';
import { buildMetaBrowserEvent } from '@/lib/meta/browser/payload';
import { dispatchMetaBrowserEvent } from '@/lib/meta/browser/client';

interface FacebookPixelProps {
  pixelId: string;
  enabled?: boolean;
}

export default function FacebookPixel({ pixelId, enabled = true }: FacebookPixelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPageViewKey = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !pixelId || !canRunClientTracking()) return;

    const pageViewKey =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : pathname || '';
    if (lastPageViewKey.current === pageViewKey) return;
    lastPageViewKey.current = pageViewKey;

    const pageViewEvent = buildMetaBrowserEvent({
      eventName: 'PageView',
      payload: {},
    });
    void dispatchMetaBrowserEvent(pageViewEvent);
  }, [pathname, searchParams, pixelId, enabled]);

  if (!enabled || !pixelId || typeof window === 'undefined' || !canRunClientTracking()) {
    return null;
  }

  return (
    <Script
      id="facebook-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function mbReadCookie(name) {
              var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
              if (!match) return undefined;
              try { return decodeURIComponent(match[1]); } catch (e) { return match[1]; }
            }
            if (String(mbReadCookie('mb_tracking_consent') || '').trim().toLowerCase() !== 'granted') {
              return;
            }
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
            function mbSetCookie(name, value, maxAge) {
              if (String(mbReadCookie('mb_tracking_consent') || '').trim().toLowerCase() !== 'granted') {
                return;
              }
              var secure = window.location.protocol === 'https:' ? ';Secure' : '';
              document.cookie = name + '=' + encodeURIComponent(value) + ';max-age=' + maxAge + ';path=/;SameSite=Lax' + secure;
            }
            fbq('consent', 'grant');
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
          })();
        `,
      }}
    />
  );
}
