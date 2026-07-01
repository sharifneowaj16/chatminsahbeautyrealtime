import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { enqueueGa4Purchase, enqueueGa4Refund, enqueueMetaCapiPurchase } from '@/lib/queue/metaCapiQueue';
import {
  getCanonicalPaymentContractErrorResponse,
  isCodPaymentMethod,
  isCanonicalOnlinePaymentMethod,
  isPaidLikePaymentStatus,
} from '@/lib/payments/canonical-payment-contract';

function isConfirmedStatus(status?: string | null) {
  const normalized = status?.toLowerCase() ?? '';
  return normalized === 'confirmed' || normalized === 'phone_confirmed' || normalized === 'phone-confirmed';
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  ) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// GET /api/admin/orders/[id] — Full order detail (lookup by orderNumber or DB id)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      select: {
        id: true,
        orderNumber: true,
        userId: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        subtotal: true,
        shippingCost: true,
        taxAmount: true,
        discountAmount: true,
        total: true,
        shippingMethod: true,
        trackingNumber: true,
        steadfastConsignmentId: true,
        steadfastTrackingCode: true,
        steadfastStatus: true,
        steadfastSentAt: true,
        pathaoStatus: true,
        pathaoTrackingCode: true,
        pathaoConsignmentId: true,
        pathaoSentAt: true,
        couponCode: true,
        couponDiscount: true,
        customerNote: true,
        adminNote: true,
        createdAt: true,
        updatedAt: true,
        paidAt: true,
        shippedAt: true,
        deliveredAt: true,
        cancelledAt: true,
        items: {
          select: {
            id: true,
            productId: true,
            variantId: true,
            name: true,
            sku: true,
            price: true,
            quantity: true,
            total: true,
          },
        },
        shippingAddress: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        returns: {
          include: {
            items: true,
          },
          orderBy: { requestDate: 'desc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const productIds = [...new Set(order.items.map((item) => item.productId).filter(Boolean))];
    const variantIds = [...new Set(order.items.map((item) => item.variantId).filter(Boolean))] as string[];

    const [user, products, variants] = await Promise.all([
      prisma.user.findUnique({
        where: { id: order.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          loyaltyPoints: true,
          createdAt: true,
        },
      }),
      productIds.length
        ? prisma.product.findMany({
            where: { id: { in: productIds.filter((id): id is string => id !== null) } },
            select: {
              id: true,
              name: true,
              slug: true,
              images: {
                take: 1,
                orderBy: { sortOrder: 'asc' },
                select: { url: true },
              },
            },
          })
        : Promise.resolve([]),
      variantIds.length
        ? prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: {
              id: true,
              name: true,
              sku: true,
              attributes: true,
              image: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((product) => [product.id, product]));
    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

    return NextResponse.json({
      order: {
        ...order,
        user,
        subtotal: toNumber(order.subtotal),
        shippingCost: toNumber(order.shippingCost),
        taxAmount: toNumber(order.taxAmount),
        discountAmount: toNumber(order.discountAmount),
        total: toNumber(order.total),
        couponDiscount: order.couponDiscount === null ? null : toNumber(order.couponDiscount),
        items: order.items.map((item) => ({
          ...item,
          price: toNumber(item.price),
          total: toNumber(item.total),
          product: item.productId ? productMap.get(item.productId) ?? null : null,
          variant: item.variantId ? variantMap.get(item.variantId) ?? null : null,
        })),
        payments: order.payments.map((payment) => ({
          ...payment,
          amount: toNumber(payment.amount),
        })),
        returns: order.returns.map((returnItem) => ({
          ...returnItem,
          refundAmount: toNumber(returnItem.refundAmount),
          items: returnItem.items.map((item) => ({
            ...item,
            price: toNumber(item.price),
          })),
        })),
      },
    });
  } catch (error) {
    console.error('Admin order GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/orders/[id] — Update status, tracking, adminNote, paymentStatus
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, paymentStatus, trackingNumber, adminNote } = body;

    const existing = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : undefined;
    const codPhoneConfirmedFromAdmin =
      isConfirmedStatus(status) && isCodPaymentMethod(existing.paymentMethod);
    let shouldQueueCodPurchase = false;
    let shouldQueueGa4Refund = false;

    if (status) {
      const statusMap: Record<string, string> = {
        pending: 'PENDING',
        confirmed: 'CONFIRMED',
        phone_confirmed: 'CONFIRMED',
        'phone-confirmed': 'CONFIRMED',
        processing: 'PROCESSING',
        shipped: 'SHIPPED',
        completed: 'DELIVERED',
        delivered: 'DELIVERED',
        cancelled: 'CANCELLED',
        refunded: 'REFUNDED',
      };
      updateData.status = statusMap[normalizedStatus ?? ''] || status.toUpperCase();

      if (normalizedStatus === 'shipped' && !existing.shippedAt) updateData.shippedAt = new Date();
      if ((normalizedStatus === 'completed' || normalizedStatus === 'delivered') && !existing.deliveredAt) updateData.deliveredAt = new Date();
      if (normalizedStatus === 'cancelled' && !existing.cancelledAt) updateData.cancelledAt = new Date();
      if (normalizedStatus === 'refunded') {
        updateData.refundedAt = existing.refundedAt ?? new Date();
        shouldQueueGa4Refund = !existing.gaRefundSent && !existing.isTest;
      }

      if (codPhoneConfirmedFromAdmin) {
        const confirmedAt = existing.phoneConfirmedAt ?? new Date();
        updateData.phoneConfirmedAt = confirmedAt;
        updateData.confirmationStatus = existing.confirmationStatus ?? 'CONFIRMED_BY_ADMIN';
        updateData.confirmedByAdminId = existing.confirmedByAdminId ?? payload.adminId;
        updateData.metaEventId = existing.metaEventId ?? `Purchase-${existing.id}`;
        shouldQueueCodPurchase = !existing.metaPurchaseSent && !existing.isTest;
      }
    }

    if (paymentStatus) {
      const normalizedPaymentStatus = paymentStatus.toLowerCase();

      if (isPaidLikePaymentStatus(normalizedPaymentStatus) && !isCodPaymentMethod(existing.paymentMethod)) {
        return NextResponse.json(
          getCanonicalPaymentContractErrorResponse({
            code: 'ADMIN_ONLINE_PAYMENT_COMPLETION_BLOCKED',
            message: isCanonicalOnlinePaymentMethod(existing.paymentMethod)
              ? 'Online payment cannot be manually marked paid from Admin. Use the signed /api/payments/verified gateway flow so amount, currency, transaction, and Purchase queue guards run together.'
              : 'Unsupported online/manual payment method cannot be marked paid in production until a verified provider adapter is added.',
          }),
          { status: 409 }
        );
      }

      const paymentMap: Record<string, string> = {
        pending: 'PENDING',
        paid: 'COMPLETED',
        completed: 'COMPLETED',
        failed: 'FAILED',
        refunded: 'REFUNDED',
        cancelled: 'CANCELLED',
      };
      updateData.paymentStatus = paymentMap[normalizedPaymentStatus] || paymentStatus.toUpperCase();

      // COD cash collection can be recorded administratively, but it does not create
      // Purchase. COD Purchase is queued only by the phone-confirmed status branch above.
      if (isCodPaymentMethod(existing.paymentMethod) && isPaidLikePaymentStatus(normalizedPaymentStatus) && !existing.paidAt) {
        updateData.paidAt = new Date();
      }
      if (isCodPaymentMethod(existing.paymentMethod) && isPaidLikePaymentStatus(normalizedPaymentStatus) && !existing.paymentPaidAt) {
        updateData.paymentPaidAt = updateData.paidAt || new Date();
      }
      if (normalizedPaymentStatus === 'refunded') {
        updateData.refundedAt = existing.refundedAt ?? new Date();
        shouldQueueGa4Refund = !existing.gaRefundSent && !existing.isTest;
      }
    }

    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (adminNote !== undefined) updateData.adminNote = adminNote;

    // Auto-generate tracking if shipped and none provided
    if (status === 'shipped' && !trackingNumber && !existing.trackingNumber) {
      updateData.trackingNumber = `TRK${Date.now()}`;
    }

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: updateData,
    });

    if (shouldQueueCodPurchase) {
      try {
        await enqueueMetaCapiPurchase({ type: 'cod_purchase', orderId: existing.id });
      } catch (error) {
        console.error('Admin COD Meta Purchase queue enqueue failed:', error);
      }

      try {
        await enqueueGa4Purchase({ source: 'cod_phone_confirmed', orderId: existing.id });
      } catch (error) {
        console.error('Admin COD GA4 Purchase queue enqueue failed:', error);
      }
    }



    if (shouldQueueGa4Refund) {
      try {
        await enqueueGa4Refund(
          { orderId: existing.id, source: 'admin_refund' },
          { jobId: `admin_refund:ga4_refund:${existing.id}:${Date.now()}` }
        );
      } catch (error) {
        console.error('Admin GA4 Refund queue enqueue failed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: updated.orderNumber,
        dbId: updated.id,
        status: updated.status.toLowerCase(),
        paymentStatus: updated.paymentStatus.toLowerCase(),
        tracking: updated.trackingNumber,
        adminNote: updated.adminNote,
        updatedAt: updated.updatedAt.toISOString(),
        shippedAt: updated.shippedAt?.toISOString(),
        deliveredAt: updated.deliveredAt?.toISOString(),
        cancelledAt: updated.cancelledAt?.toISOString(),
        paidAt: updated.paidAt?.toISOString(),
        paymentPaidAt: updated.paymentPaidAt?.toISOString(),
        refundedAt: updated.refundedAt?.toISOString(),
        phoneConfirmedAt: updated.phoneConfirmedAt?.toISOString(),
        confirmationStatus: updated.confirmationStatus,
      },
    });
  } catch (error) {
    console.error('Admin order PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/orders/[id] — Permanently delete an order and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
      select: { id: true, orderNumber: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Return model has no onDelete cascade from Order, so delete manually.
    // ReturnItem has onDelete: Cascade from Return, so deleting Returns is enough.
    await prisma.return.deleteMany({ where: { orderId: existing.id } });

    // Delete the order — cascades to: OrderItem, Payment, PurchaseShortlist.
    // AdminNotification and webhook events use SetNull so they stay intact.
    await prisma.order.delete({ where: { id: existing.id } });

    return NextResponse.json({
      success: true,
      orderNumber: existing.orderNumber,
    });
  } catch (error) {
    console.error('Admin order DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
