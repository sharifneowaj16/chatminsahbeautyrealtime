'use client';

import Script from 'next/script';
import { useEffect } from 'react';

interface FacebookPixelProps {
  pixelId: string;
  enabled?: boolean;
}

/**
 * Send PageView to Facebook Conversions API (server-side)
 * Same eventID as browser pixel — Meta automatically deduplicates
 */
async function sendPageViewToCAPI(pixelId: string, eventId: string) {
  try {
    const fbc = document.cookie.match(/_fbc=([^;]+)/)?.[1];
    const fbp = document.cookie.match(/_fbp=([^;]+)/)?.[1];

    await fetch('/api/facebook-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'PageView',
        eventId,
        eventSourceUrl: window.location.href,
        fbc,
        fbp,
        country: 'BD',
      }),
    });
  } catch {
    // Silently fail — browser pixel already fired
  }
}

export default function FacebookPixel({ pixelId, enabled = true }: FacebookPixelProps) {
  useEffect(() => {
    if (!enabled || !pixelId) return;

    // CAPI এ PageView পাঠাও — browser pixel এর same eventId দিয়ে
    const eventId = `PageView-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // window.fbq ready হওয়ার পরে eventId দিয়ে PageView fire করো
    const fireWithEventId = () => {
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'PageView', {}, { eventID: eventId });
        sendPageViewToCAPI(pixelId, eventId);
      }
    };

    // Pixel script load হওয়ার পরে fire করো
    const timer = setTimeout(fireWithEventId, 100);
    return () => clearTimeout(timer);
  }, [pixelId, enabled]);

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
            fbq('init', '${pixelId}');
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
