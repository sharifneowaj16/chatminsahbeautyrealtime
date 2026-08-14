import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/app/api/auth/_utils';
import {
  getOwnerBoundPaymentSummary,
  normalizePaymentSummaryGateway,
} from '@/lib/payments/payment-summary';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Please log in to continue payment.',
      },
      { status: 401 },
    );
  }

  const { id } = await params;
  const orderId = id.trim();
  const gateway = normalizePaymentSummaryGateway(request.nextUrl.searchParams.get('gateway'));

  if (!orderId) {
    return NextResponse.json(
      {
        success: false,
        code: 'ORDER_ID_REQUIRED',
        message: 'Order ID is required.',
      },
      { status: 400 },
    );
  }

  if (!gateway) {
    return NextResponse.json(
      {
        success: false,
        code: 'PAYMENT_GATEWAY_REQUIRED',
        message: 'A valid payment gateway is required.',
      },
      { status: 400 },
    );
  }

  const result = await getOwnerBoundPaymentSummary({ orderId, userId, gateway });
  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status });
  }

  return NextResponse.json(result.summary, {
    headers: {
      'Cache-Control': 'no-store, private',
    },
  });
}
