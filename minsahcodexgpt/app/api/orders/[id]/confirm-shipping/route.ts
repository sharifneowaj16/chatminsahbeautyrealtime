import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createPathaoDeliveryForOrder } from '@/lib/pathao-delivery';

export const dynamic = 'force-dynamic';

const INTERNAL_SECRET = process.env.TELEGRAM_BOT_INTERNAL_SECRET;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const secret = request.headers.get('x-internal-secret');
  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.action;

  if (action !== 'confirm' && action !== 'cancel') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, orderNumber: true, shippingMethod: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (action === 'cancel') {
    await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({
      success: true,
      action: 'cancelled',
      orderNumber: order.orderNumber,
    });
  }

  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
    return NextResponse.json(
      { error: `Order is already ${order.status.toLowerCase()}`, orderNumber: order.orderNumber },
      { status: 409 }
    );
  }

  let pathaoDelivery = null;
  if ((order.shippingMethod || '').toLowerCase() === 'pathao') {
    try {
      pathaoDelivery = await createPathaoDeliveryForOrder(order.id, {
        preserveOrderStatus: true,
        saveFailureStatus: true,
      });
    } catch (err) {
      console.error('Pathao delivery creation failed:', err);
      return NextResponse.json(
        { error: 'Pathao delivery creation failed', orderNumber: order.orderNumber },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    action: 'confirmed',
    orderNumber: order.orderNumber,
    pathaoDelivery,
  });
}
