import { legacyPaymentRouteGone } from '@/lib/payments/legacy-route-guard';

const ROUTE = '/api/payments/bkash/execute';

export async function GET() {
  return legacyPaymentRouteGone(ROUTE);
}

export async function POST() {
  return legacyPaymentRouteGone(ROUTE);
}
