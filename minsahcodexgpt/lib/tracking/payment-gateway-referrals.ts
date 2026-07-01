export type PaymentGatewayReferralDomain = {
  gateway: string;
  domains: string[];
  note?: string;
};

export const PAYMENT_RETURN_MARKER_COOKIE = 'mb_recent_payment_return';
export const PAYMENT_RETURN_MARKER_MAX_AGE_SECONDS = 10 * 60;

export const PAYMENT_GATEWAY_REFERRAL_DOMAINS: PaymentGatewayReferralDomain[] = [
  {
    gateway: 'bKash',
    domains: ['bkash.com', 'bka.sh', 'pay.bka.sh'],
    note: 'Use the exact live redirect host observed in GA4 Realtime/DebugView.',
  },
  {
    gateway: 'SSLCommerz',
    domains: ['sslcommerz.com', 'securepay.sslcommerz.com', 'sandbox.sslcommerz.com'],
    note: 'Add production and sandbox domains only if they appear as referrals.',
  },
  {
    gateway: 'Nagad',
    domains: ['nagad.com.bd', 'pgw.nagad.com.bd'],
    note: 'Nagad can use gateway-specific subdomains; verify in production redirect.',
  },
  {
    gateway: 'aamarPay',
    domains: ['aamarpay.com', 'sandbox.aamarpay.com'],
  },
  {
    gateway: 'ShurjoPay',
    domains: ['shurjopay.com.bd', 'engine.shurjopayment.com'],
  },
];

function splitEnvDomains(raw?: string | null) {
  return (raw ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, ''))
    .filter(Boolean);
}

export function normalizeReferralHost(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    const parsed = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return raw.toLowerCase().replace(/^www\./, '').replace(/\/.*$/, '') || null;
  }
}

export function getFlattenedPaymentGatewayDomains(options?: { includeEnvOverrides?: boolean }) {
  const staticDomains = PAYMENT_GATEWAY_REFERRAL_DOMAINS.flatMap((item) => item.domains);
  const envDomains = options?.includeEnvOverrides === false
    ? []
    : splitEnvDomains(process.env.GA4_EXTRA_PAYMENT_REFERRAL_DOMAINS);

  return Array.from(
    new Set(
      [...staticDomains, ...envDomains]
        .map((domain) => normalizeReferralHost(domain))
        .filter((domain): domain is string => Boolean(domain))
    )
  );
}

export function isPaymentGatewayReferralHost(host?: string | null) {
  const normalizedHost = normalizeReferralHost(host);
  if (!normalizedHost) return false;

  return getFlattenedPaymentGatewayDomains().some((domain) => {
    const normalizedDomain = normalizeReferralHost(domain);
    return Boolean(
      normalizedDomain &&
      (normalizedHost === normalizedDomain || normalizedHost.endsWith(`.${normalizedDomain}`))
    );
  });
}

export function isPaymentGatewayReferralUrl(url?: string | null) {
  if (!url) return false;
  try {
    return isPaymentGatewayReferralHost(new URL(url).hostname);
  } catch {
    return isPaymentGatewayReferralHost(url);
  }
}

export function isPaymentReturnPath(pathname?: string | null) {
  const path = pathname?.trim().toLowerCase() ?? '';
  return [
    '/checkout/payment-bridge',
    '/checkout/payment-complete',
    '/checkout/order-confirmed',
    '/api/payments/bkash/callback',
    '/api/payments/nagad/callback',
    '/api/payments/verified',
  ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function getPaymentGatewayReferralQaConfig() {
  return {
    verified: process.env.GA4_PAYMENT_REFERRAL_EXCLUSIONS_VERIFIED === 'true',
    routeTrackingVerified: process.env.GA4_APP_ROUTER_PAGEVIEW_VERIFIED === 'true',
    paymentReturnSourceVerified: process.env.GA4_PAYMENT_RETURN_SOURCE_VERIFIED === 'true',
    crossDomainVerified: process.env.GA4_CROSS_DOMAIN_CHECK_VERIFIED === 'true',
    domains: PAYMENT_GATEWAY_REFERRAL_DOMAINS,
    flattenedDomains: getFlattenedPaymentGatewayDomains(),
    extraDomainsEnv: 'GA4_EXTRA_PAYMENT_REFERRAL_DOMAINS',
    instructions: [
      'GA4 Admin → Data streams → Web → Configure tag settings → List unwanted referrals.',
      'Add only the exact production payment redirect hosts seen in GA4 Realtime/DebugView.',
      'After adding domains, test a paid order and confirm original source/medium is preserved.',
      'Verify Next.js App Router navigation sends exactly one page_view per URL change and does not duplicate initial load.',
      'Verify payment-complete/order-confirmed page_view does not become bKash/Nagad/SSLCommerz referral traffic.',
      'Set GA4_PAYMENT_REFERRAL_EXCLUSIONS_VERIFIED=true, GA4_APP_ROUTER_PAGEVIEW_VERIFIED=true, and GA4_PAYMENT_RETURN_SOURCE_VERIFIED=true only after live/staging QA passes.',
    ],
  };
}
