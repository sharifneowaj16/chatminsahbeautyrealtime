import { NextResponse } from 'next/server';

export const LEGACY_PAYMENT_ROUTE_DISABLED = 'LEGACY_PAYMENT_ROUTE_DISABLED' as const;

const CANONICAL_PAYMENT_FLOW = '/api/orders + /api/payments/verified';

export function legacyPaymentRouteGone(route: string) {
  return NextResponse.json(
    {
      ok: false,
      code: LEGACY_PAYMENT_ROUTE_DISABLED,
      error: 'This legacy payment route is disabled in production.',
      route,
      requiredFlow: CANONICAL_PAYMENT_FLOW,
    },
    {
      status: 410,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
