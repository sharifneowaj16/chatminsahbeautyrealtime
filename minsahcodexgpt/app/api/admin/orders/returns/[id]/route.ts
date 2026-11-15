import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';
import { clawbackLoyaltyPointsForReturn } from '@/lib/loyalty';
import { dispatchMetaCapiRefundWithFallback } from '@/lib/tracking/meta-capi-refund';

// PATCH /api/admin/orders/returns/[id] - Approve, reject, or update return status
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
    const { status, adminNote } = body;

    const existing = await prisma.return.findFirst({
      where: { OR: [{ id }, { returnNumber: id }] },
      include: {
        order: {
          select: {
            id: true,
            isTest: true,
            metaPurchaseSent: true,
            gaRefundSent: true,
            returnedAt: true,
            refundedAt: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
    }

    const statusMap: Record<string, string> = {
      pending: 'PENDING',
      approved: 'APPROVED',
      rejected: 'REJECTED',
      processing: 'PROCESSING',
      completed: 'COMPLETED',
    };

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = statusMap[status.toLowerCase()] || status.toUpperCase();
    if (adminNote !== undefined) updateData.adminNote = adminNote;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedReturn = await tx.return.update({
        where: { id: existing.id },
        data: updateData,
      });

      const nextStatus = updatedReturn.status;
      const prevStatus = existing.status;

      // Claw back loyalty points if return is approved or completed
      if (
        (nextStatus === 'APPROVED' || nextStatus === 'COMPLETED') &&
        prevStatus !== 'APPROVED' &&
        prevStatus !== 'COMPLETED'
      ) {
        await clawbackLoyaltyPointsForReturn(tx, existing, prevStatus);
      }

      return updatedReturn;
    });

    if (updated.status === 'COMPLETED') {
      const parentOrderUpdate: Record<string, unknown> = {};
      if (!existing.order?.returnedAt) parentOrderUpdate.returnedAt = new Date();
      if (!existing.order?.refundedAt) parentOrderUpdate.refundedAt = new Date();
      if (Object.keys(parentOrderUpdate).length > 0) {
        await prisma.order.update({
          where: { id: existing.orderId },
          data: parentOrderUpdate,
        }).catch((err) => console.error('Parent order return timestamp update failed:', err));
      }

      if (existing.order?.metaPurchaseSent && !existing.order?.isTest) {
        await dispatchMetaCapiRefundWithFallback({
          orderId: existing.orderId,
          source: 'return_received',
          customRefundAmount: Number(updated.refundAmount) || undefined,
        }).catch((err) => console.error('Return Meta CAPI refund dispatch failed:', err));
      }
    }

    return NextResponse.json({
      success: true,
      return: {
        id: updated.returnNumber,
        status: updated.status.toLowerCase(),
        adminNote: updated.adminNote,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Admin return PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
