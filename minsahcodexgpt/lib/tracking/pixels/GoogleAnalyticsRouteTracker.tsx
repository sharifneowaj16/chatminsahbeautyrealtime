'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  isPaymentGatewayReferralUrl,
  isPaymentReturnPath,
  PAYMENT_RETURN_MARKER_COOKIE,
} from '@/lib/tracking/payment-gateway-referrals';

const SENSITIVE_URL_PARAMS = [
  'bpt',
  'token',
  'access_token',
  'signature',
  'secret',
  'auth',
  'session',
  'nonce',
];

function getCookieValue(name: string) {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=;max-age=0;path=/;SameSite=Lax`;
}

function buildSanitizedLocation() {
  const url = new URL(window.location.href);
  for (const param of SENSITIVE_URL_PARAMS) {
    url.searchParams.delete(param);
  }
  return {
    pageLocation: url.toString(),
    pagePath: `${url.pathname}${url.search}${url.hash}`,
  };
}

function shouldIgnoreGatewayReferrer(pathname: string) {
  return (
    isPaymentGatewayReferralUrl(document.referrer) ||
    (isPaymentReturnPath(pathname) && getCookieValue(PAYMENT_RETURN_MARKER_COOKIE) === '1')
  );
}

function sendGa4PageView(pathname: string, attempt = 0) {
  if (typeof window === 'undefined') return;

  if (typeof window.gtag !== 'function') {
    if (attempt < 50) {
      window.setTimeout(() => sendGa4PageView(pathname, attempt + 1), 100);
    }
    return;
  }

  const { pageLocation, pagePath } = buildSanitizedLocation();
  const ignoreReferrer = shouldIgnoreGatewayReferrer(pathname);

  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: pageLocation,
    page_path: pagePath,
    ...(ignoreReferrer ? { ignore_referrer: true, mb_referrer_ignored: 'payment_gateway' } : {}),
  });

  if (ignoreReferrer && isPaymentReturnPath(pathname)) {
    clearCookie(PAYMENT_RETURN_MARKER_COOKIE);
  }
}

export default function GoogleAnalyticsRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPageKey = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const key = `${pathname}?${searchParams.toString()}`;
    if (lastPageKey.current === key) return;
    lastPageKey.current = key;

    sendGa4PageView(pathname || window.location.pathname);
  }, [pathname, searchParams]);

  return null;
}
