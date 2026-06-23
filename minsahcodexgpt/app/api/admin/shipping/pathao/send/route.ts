import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { createPathaoDeliveryForOrder } from '@/lib/pathao-delivery';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('admin_access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = await verifyAdminAccessToken(accessToken);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const { orderId } = (await request.json()) as { orderId?: string };
  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const result = await createPathaoDeliveryForOrder(orderId, {
    preserveOrderStatus: false,
    saveFailureStatus: false,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    alreadyDispatched: result.alreadyDispatched,
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    pathaoStatus: result.pathaoStatus,
    consignmentId: result.consignmentId,
    trackingCode: result.trackingCode,
    shippingCost: result.shippingCost,
  });
}
