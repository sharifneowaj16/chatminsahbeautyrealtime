'use client';

import Script from 'next/script';
import { createGa4PurchaseGuardScript } from './ga4PurchaseGuardScript';

interface GoogleAnalyticsProps {
  measurementId: string;
  enabled?: boolean;
}

export default function GoogleAnalytics({ measurementId, enabled = true }: GoogleAnalyticsProps) {
  if (!enabled || !measurementId) return null;

  return (
    <>
      <Script
        id="ga4-purchase-guard"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: createGa4PurchaseGuardScript({ blockDataLayerPurchase: true }),
        }}
      />
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){
              if (arguments[0] === 'event' && String(arguments[1] || '').toLowerCase() === 'purchase') {
                window.dataLayer.push({
                  event: 'mb_ga4_purchase_blocked',
                  mb_reason: 'ga4_purchase_is_server_side_measurement_protocol_only',
                  mb_original_event: 'purchase'
                });
                return;
              }
              dataLayer.push(arguments);
            }
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
              send_page_view: true
            });
          `,
        }}
      />
    </>
  );
}
