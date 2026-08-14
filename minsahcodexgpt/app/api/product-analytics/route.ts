import { NextRequest, NextResponse } from 'next/server';
import {
  recordProductMetricAction,
  recordProductView,
  sanitizeProductMetricItems,
} from '@/lib/analytics/product-metrics';
import { shouldSkipProductAnalyticsRequest } from '@/lib/tracking/traffic-filter';

export const dynamic = 'force-dynamic';

const PRODUCT_ANALYTICS_ACTIONS = [
  'view',
  'add_to_cart',
  'view_cart',
  'checkout_start',
  'checkout_shipping_info',
  'checkout_payment_info',
] as const;

type ProductAnalyticsAction = (typeof PRODUCT_ANALYTICS_ACTIONS)[number];

function isAction(value: unknown): value is ProductAnalyticsAction {
  return typeof value === 'string' && PRODUCT_ANALYTICS_ACTIONS.includes(value as ProductAnalyticsAction);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
    }

    const action = (body as { action?: unknown }).action;
    if (!isAction(action)) {
      return NextResponse.json({ ok: false, error: 'INVALID_PRODUCT_ANALYTICS_ACTION' }, { status: 400 });
    }

    if (action === 'view') {
      const productId = (body as { productId?: unknown }).productId;
      const result = await recordProductView(request, productId);
      const status = result.ok ? 200 : 400;
      return NextResponse.json(result, { status });
    }

    const skippedTraffic = shouldSkipProductAnalyticsRequest(request);
    if (skippedTraffic) {
      return NextResponse.json({ ok: true, skipped: true, reason: skippedTraffic.reason });
    }

    const items = sanitizeProductMetricItems((body as { items?: unknown }).items);
    if (items.length === 0) {
      return NextResponse.json({ ok: false, error: 'NO_VALID_PRODUCT_ITEMS' }, { status: 400 });
    }

    const result = await recordProductMetricAction(action, items);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[product-analytics] Failed to record product metric:', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: 'PRODUCT_ANALYTICS_WRITE_FAILED' }, { status: 500 });
  }
}
