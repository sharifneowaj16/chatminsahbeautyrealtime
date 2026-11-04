import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyOrderWarrantyToken } from '@/lib/warranty/qr-token';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const tokenResult = verifyOrderWarrantyToken(token);

    if (!tokenResult.valid || !tokenResult.orderId) {
      return NextResponse.json(
        { error: tokenResult.error || 'Invalid or expired QR verification token' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: tokenResult.orderId },
          { orderNumber: tokenResult.orderNumber },
        ],
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: {
                  take: 1,
                  select: {
                    url: true,
                  },
                },
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        shippingAddress: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found in verification registry' },
        { status: 404 }
      );
    }

    const orderStatusStr = String(order.status || '').toUpperCase();
    const isDelivered = orderStatusStr === 'DELIVERED' || orderStatusStr === 'COMPLETED';

    // Mask phone number for public privacy
    const rawPhone = order.shippingAddress?.phone || '';
    const maskedPhone =
      rawPhone.length > 5
        ? `${rawPhone.slice(0, 3)}****${rawPhone.slice(-4)}`
        : rawPhone ? '***-***' : 'N/A';

    // Mask street name slightly
    const street = order.shippingAddress?.street1 || '';
    const city = order.shippingAddress?.city || 'Dhaka';
    const maskedAddress = street ? `${street.slice(0, 10)}..., ${city}` : city;

    // Delivery & Warranty calculations
    const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt) : null;
    const warrantyDaysTotal = 14; // Standard 14-day replacement/authenticity guarantee
    let daysRemaining = 0;
    let warrantyExpiryDate: string | null = null;

    if (isDelivered && deliveredAt) {
      const expiry = new Date(deliveredAt);
      expiry.setDate(expiry.getDate() + warrantyDaysTotal);
      warrantyExpiryDate = expiry.toISOString();
      const diffMs = expiry.getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    const courierCode =
      order.steadfastTrackingCode ||
      order.pathaoTrackingCode ||
      order.trackingNumber ||
      null;

    const items = (order.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name || item.product?.name || 'Beauty Product',
      sku: item.sku,
      quantity: item.quantity,
      price: Number(item.price),
      total: Number(item.total),
      image: item.product?.images?.[0]?.url || null,
      variantName: item.variant?.name || null,
      isTargetItem: tokenResult.itemId ? tokenResult.itemId === item.id : true,
    }));

    const recipientName = order.shippingAddress
      ? `${order.shippingAddress.firstName || ''} ${order.shippingAddress.lastName || ''}`.trim() || 'Valued Customer'
      : 'Valued Customer';

    return NextResponse.json({
      success: true,
      verified: true,
      portal: 'MINSAH BEAUTY GENUINE REGISTRY',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        isDelivered,
        deliveredAt: order.deliveredAt,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        subtotal: Number(order.subtotal),
        shippingCost: Number(order.shippingCost),
        discountAmount: Number(order.discountAmount),
        total: Number(order.total),
        recipientName,
        maskedPhone,
        maskedAddress,
        courierCode,
        courierMethod: order.shippingMethod || 'Standard Delivery',
      },
      warranty: {
        status: isDelivered ? (daysRemaining > 0 ? 'ACTIVE' : 'EXPIRED') : 'PENDING_DELIVERY',
        isDelivered,
        policy: '100% Authentic Korean Cosmetics • Hassle-free Doorstep Guarantee',
        warrantyDaysTotal,
        daysRemaining: isDelivered ? daysRemaining : warrantyDaysTotal,
        expiryDate: warrantyExpiryDate,
        message: isDelivered
          ? daysRemaining > 0
            ? `ওয়ারেন্টি সক্রিয় রয়েছে (${daysRemaining} দিন বাকি)`
            : 'ওয়ারেন্টির মেয়াদ উত্তীর্ণ হয়েছে'
          : 'অর্ডারটি এখনও ডেলিভারি সম্পন্ন হয়নি। ডেলিভার্ড হওয়ার পর ওয়ারেন্টি স্বয়ংক্রিয়ভাবে সক্রিয় হবে।',
      },
      items,
    });
  } catch (err: any) {
    console.error('QR verification endpoint error:', err);
    return NextResponse.json(
      { error: 'An unexpected verification error occurred' },
      { status: 500 }
    );
  }
}
