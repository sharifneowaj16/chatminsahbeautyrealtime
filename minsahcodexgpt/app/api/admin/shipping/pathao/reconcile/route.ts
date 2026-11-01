import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminAccessToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

interface ReconcileRequestBody {
  orderId: string;
  decision: 'LINK_CONSIGNMENT' | 'RESET_READY';
  evidence: string;
  consignmentId?: string;
  trackingCode?: string;
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('admin_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyAdminAccessToken(accessToken);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = (await request.json()) as ReconcileRequestBody;
    const { orderId, decision, evidence, consignmentId, trackingCode } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    if (!decision || (decision !== 'LINK_CONSIGNMENT' && decision !== 'RESET_READY')) {
      return NextResponse.json(
        { error: 'decision must be either LINK_CONSIGNMENT or RESET_READY' },
        { status: 400 },
      );
    }

    // Master Spec Section 13.4: Mandatory Reconciliation Evidence & Audit Logging
    // A reset to READY without recorded operator evidence is programmatically rejected
    if (!evidence || typeof evidence !== 'string' || evidence.trim().length < 10) {
      return NextResponse.json(
        {
          error:
            'Mandatory reconciliation evidence is required (minimum 10 characters explaining verification steps)',
          code: 'EVIDENCE_REQUIRED',
        },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        pathaoBookingStatus: true,
        pathaoConsignmentId: true,
        adminNote: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const operator = payload.email || payload.name || payload.adminId || 'admin';
    const timestamp = new Date().toISOString();

    if (decision === 'LINK_CONSIGNMENT') {
      if (!consignmentId || !consignmentId.trim()) {
        return NextResponse.json(
          { error: 'consignmentId is required when decision is LINK_CONSIGNMENT' },
          { status: 400 },
        );
      }

      const auditEntry = `[Pathao Reconciled: LINK_CONSIGNMENT at ${timestamp} by ${operator}]\nConsignment: ${consignmentId.trim()}\nEvidence: ${evidence.trim()}`;
      const updatedAdminNote = [order.adminNote, auditEntry].filter(Boolean).join('\n\n');

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          pathaoConsignmentId: consignmentId.trim(),
          pathaoTrackingCode: trackingCode ? trackingCode.trim() : consignmentId.trim(),
          pathaoBookingStatus: 'BOOKED',
          adminNote: updatedAdminNote,
        },
      });

      return NextResponse.json({
        success: true,
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        pathaoBookingStatus: updated.pathaoBookingStatus,
        pathaoConsignmentId: updated.pathaoConsignmentId,
        message: 'Order successfully linked to confirmed Pathao consignment',
      });
    }

    if (decision === 'RESET_READY') {
      // Must not reset if already confirmed with a consignmentId
      if (order.pathaoConsignmentId) {
        return NextResponse.json(
          {
            error:
              'Cannot reset order to READY because an active consignment ID already exists. Cancel or unlink the parcel first.',
          },
          { status: 409 },
        );
      }

      const auditEntry = `[Pathao Reconciled: RESET_READY at ${timestamp} by ${operator}]\nEvidence: ${evidence.trim()}`;
      const updatedAdminNote = [order.adminNote, auditEntry].filter(Boolean).join('\n\n');

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
          pathaoBookingStatus: 'READY',
          pathaoBookingAttemptId: null,
          pathaoBookingLockedAt: null,
          pathaoBookingLockedBy: null,
          adminNote: updatedAdminNote,
        },
      });

      return NextResponse.json({
        success: true,
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        pathaoBookingStatus: updated.pathaoBookingStatus,
        message: 'Pathao booking status safely reset to READY for new dispatch attempt',
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reconciliation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
