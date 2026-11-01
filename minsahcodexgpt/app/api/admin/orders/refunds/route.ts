import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { Prisma, PaymentRefundStatus } from '@/generated/prisma/client';

export const dynamic = 'force-dynamic';

async function verifyAdmin(request: NextRequest) {
  const accessToken = request.cookies.get('admin_access_token')?.value;
  if (!accessToken) return null;
  return verifyAdminAccessToken(accessToken);
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  if (typeof val === 'object' && 'toNumber' in (val as Record<string, unknown>)) {
    return (val as { toNumber: () => number }).toNumber();
  }
  return Number(val) || 0;
}

// GET /api/admin/orders/refunds - List all internal manual refunds with filters
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const paymentId = searchParams.get('paymentId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentRefundWhereInput = {};

    if (orderId) where.orderId = orderId;
    if (paymentId) where.paymentId = paymentId;
    if (status && Object.values(PaymentRefundStatus).includes(status as PaymentRefundStatus)) {
      where.status = status as PaymentRefundStatus;
    }

    if (search) {
      where.OR = [
        { refundNumber: { contains: search, mode: 'insensitive' } },
        { recipientAccount: { contains: search, mode: 'insensitive' } },
        { transactionRef: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [refunds, totalCount, completedSumAgg, pendingCount] = await Promise.all([
      prisma.paymentRefund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              status: true,
              paymentStatus: true,
            },
          },
          payment: {
            select: {
              id: true,
              method: true,
              status: true,
              amount: true,
              gatewayTransactionId: true,
            },
          },
        },
      }),
      prisma.paymentRefund.count({ where }),
      prisma.paymentRefund.aggregate({
        where: { ...where, status: PaymentRefundStatus.COMPLETED },
        _sum: { amount: true },
      }),
      prisma.paymentRefund.count({
        where: { ...where, status: { in: [PaymentRefundStatus.PENDING, PaymentRefundStatus.PROCESSING] } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      refunds: refunds.map((r) => ({
        id: r.id,
        refundNumber: r.refundNumber,
        orderId: r.orderId,
        orderNumber: r.order.orderNumber,
        paymentId: r.paymentId,
        paymentMethod: r.payment.method,
        paymentAmount: toNumber(r.payment.amount),
        amount: toNumber(r.amount),
        currency: r.currency,
        refundMethod: r.refundMethod,
        recipientAccount: r.recipientAccount,
        transactionRef: r.transactionRef,
        paymentProofUrl: r.paymentProofUrl,
        processedByAdminId: r.processedByAdminId,
        adminEmail: r.adminEmail,
        notes: r.notes,
        status: r.status,
        returnId: r.returnId,
        createdAt: r.createdAt.toISOString(),
        processedAt: r.processedAt?.toISOString() ?? null,
        completedAt: r.completedAt?.toISOString() ?? null,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalRefundedAmount: toNumber(completedSumAgg._sum.amount),
        pendingRefundsCount: pendingCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch refunds';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/orders/refunds - Create manual off-site refund reservation with anti-over-refund invariant
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      orderId,
      paymentId,
      amount,
      refundMethod,
      recipientAccount,
      transactionRef,
      paymentProofUrl,
      notes,
      returnId,
      status: requestedStatus = PaymentRefundStatus.PENDING,
    } = body as {
      orderId?: string;
      paymentId?: string;
      amount?: number;
      refundMethod?: string;
      recipientAccount?: string;
      transactionRef?: string;
      paymentProofUrl?: string;
      notes?: string;
      returnId?: string;
      status?: PaymentRefundStatus;
    };

    if (!orderId || !paymentId) {
      return NextResponse.json({ error: 'orderId and paymentId are required' }, { status: 400 });
    }

    const refundAmountNum = parseFloat(Number(amount).toFixed(2));
    if (!refundAmountNum || refundAmountNum <= 0) {
      return NextResponse.json({ error: 'Refund amount must be greater than zero' }, { status: 400 });
    }

    if (!refundMethod || !['BKASH', 'NAGAD', 'BANK_TRANSFER', 'CASH'].includes(refundMethod.toUpperCase())) {
      return NextResponse.json(
        { error: 'Valid refundMethod required (BKASH, NAGAD, BANK_TRANSFER, or CASH)' },
        { status: 400 },
      );
    }

    if (!recipientAccount || !recipientAccount.trim()) {
      return NextResponse.json({ error: 'recipientAccount (phone or bank account) is required' }, { status: 400 });
    }

    const finalStatus =
      requestedStatus === PaymentRefundStatus.COMPLETED ? PaymentRefundStatus.COMPLETED : PaymentRefundStatus.PENDING;

    // Strict Completion Rule (Section 12.1): COMPLETED status requires transactionRef or proof evidence
    if (finalStatus === PaymentRefundStatus.COMPLETED && !transactionRef?.trim() && !paymentProofUrl?.trim()) {
      return NextResponse.json(
        {
          error:
            'External transaction reference (TrxID) or payment proof URL is mandatory to complete a manual refund',
          code: 'TRANSACTION_REF_REQUIRED',
        },
        { status: 400 },
      );
    }

    const adminId = admin.adminId || 'admin';
    const adminEmail = admin.email || null;
    const refundNumber = `REF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Master Spec Section 12.1: Transactional Anti-Over-Refund Row Lock Invariant
    const createdRefund = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          refunds: {
            where: {
              status: {
                in: [PaymentRefundStatus.PENDING, PaymentRefundStatus.PROCESSING, PaymentRefundStatus.COMPLETED],
              },
            },
            select: { amount: true, status: true },
          },
        },
      });

      if (!payment || payment.orderId !== orderId) {
        throw new Error('PAYMENT_NOT_FOUND_FOR_ORDER');
      }

      const paymentAmount = toNumber(payment.amount);
      const activeReserved = payment.refunds.reduce((sum, r) => sum + toNumber(r.amount), 0);
      const availableBalance = parseFloat(Math.max(0, paymentAmount - activeReserved).toFixed(2));

      if (refundAmountNum > availableBalance) {
        throw new Error(
          `INSUFFICIENT_REFUNDABLE_BALANCE: Requested ৳${refundAmountNum} exceeds available balance ৳${availableBalance} (Captured: ৳${paymentAmount}, Active Reservations: ৳${activeReserved})`,
        );
      }

      const now = new Date();
      return tx.paymentRefund.create({
        data: {
          refundNumber,
          orderId,
          paymentId,
          amount: refundAmountNum,
          currency: 'BDT',
          refundMethod: refundMethod.toUpperCase(),
          recipientAccount: recipientAccount.trim(),
          transactionRef: transactionRef ? transactionRef.trim() : null,
          paymentProofUrl: paymentProofUrl ? paymentProofUrl.trim() : null,
          processedByAdminId: adminId,
          adminEmail,
          notes: notes ? notes.trim() : null,
          returnId: returnId || null,
          status: finalStatus,
          processedAt: finalStatus === PaymentRefundStatus.COMPLETED ? now : null,
          completedAt: finalStatus === PaymentRefundStatus.COMPLETED ? now : null,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message:
        finalStatus === PaymentRefundStatus.COMPLETED
          ? 'Manual refund recorded and completed successfully'
          : 'Manual refund reservation created in PENDING status',
      refund: {
        id: createdRefund.id,
        refundNumber: createdRefund.refundNumber,
        orderId: createdRefund.orderId,
        paymentId: createdRefund.paymentId,
        amount: toNumber(createdRefund.amount),
        refundMethod: createdRefund.refundMethod,
        recipientAccount: createdRefund.recipientAccount,
        transactionRef: createdRefund.transactionRef,
        status: createdRefund.status,
        createdAt: createdRefund.createdAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Refund creation failed';
    if (message.includes('INSUFFICIENT_REFUNDABLE_BALANCE')) {
      return NextResponse.json({ error: message, code: 'INSUFFICIENT_REFUNDABLE_BALANCE' }, { status: 409 });
    }
    if (message.includes('PAYMENT_NOT_FOUND_FOR_ORDER')) {
      return NextResponse.json({ error: 'Specified payment not found for order', code: 'PAYMENT_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/admin/orders/refunds - Update refund status (PENDING -> PROCESSING -> COMPLETED | FAILED)
export async function PATCH(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      refundId,
      status: nextStatus,
      transactionRef,
      paymentProofUrl,
      notes,
    } = body as {
      refundId?: string;
      status?: PaymentRefundStatus;
      transactionRef?: string;
      paymentProofUrl?: string;
      notes?: string;
    };

    if (!refundId || !nextStatus || !Object.values(PaymentRefundStatus).includes(nextStatus)) {
      return NextResponse.json({ error: 'Valid refundId and status required' }, { status: 400 });
    }

    const existing = await prisma.paymentRefund.findUnique({
      where: { id: refundId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'PaymentRefund record not found' }, { status: 404 });
    }

    if (existing.status === PaymentRefundStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'Cannot modify a refund that is already marked COMPLETED' },
        { status: 409 },
      );
    }

    // Strict Completion Rule: Transition to COMPLETED requires transaction evidence
    const effectiveTransactionRef = transactionRef?.trim() || existing.transactionRef;
    const effectivePaymentProofUrl = paymentProofUrl?.trim() || existing.paymentProofUrl;

    if (nextStatus === PaymentRefundStatus.COMPLETED && !effectiveTransactionRef && !effectivePaymentProofUrl) {
      return NextResponse.json(
        {
          error:
            'External transaction reference (TrxID) or payment proof URL is required to mark refund as COMPLETED',
          code: 'TRANSACTION_REF_REQUIRED',
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const adminId = admin.adminId || 'admin';
    const adminEmail = admin.email || null;

    const updated = await prisma.paymentRefund.update({
      where: { id: refundId },
      data: {
        status: nextStatus,
        transactionRef: effectiveTransactionRef,
        paymentProofUrl: effectivePaymentProofUrl,
        notes: notes ? notes.trim() : existing.notes,
        processedByAdminId: adminId,
        adminEmail,
        processedAt: existing.processedAt ?? now,
        completedAt: nextStatus === PaymentRefundStatus.COMPLETED ? now : existing.completedAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Refund status updated to ${nextStatus}`,
      refund: {
        id: updated.id,
        refundNumber: updated.refundNumber,
        status: updated.status,
        transactionRef: updated.transactionRef,
        completedAt: updated.completedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Refund update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
