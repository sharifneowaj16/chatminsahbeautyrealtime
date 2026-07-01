import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { adminUnauthorizedResponse, getVerifiedAdmin } from '@/app/api/admin/_utils';
import { enqueueGa4Purchase, enqueueGa4Refund, enqueueMetaCapiPurchase } from '@/lib/queue/metaCapiQueue';
import {
  buildTrackingHealthSnapshot,
  listRecentTrackingFailures,
  listTrackingHealthHistory,
  persistTrackingHealthCheck,
  sendTrackingHealthAlert,
} from '@/lib/tracking/health';

function parseWindowHours(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('hours');
  const parsed = raw ? Number.parseInt(raw, 10) : 24;
  if (Number.isNaN(parsed)) return 24;
  return Math.min(Math.max(parsed, 1), 24 * 30);
}

async function requireTrackingHealthAdmin(request: NextRequest) {
  const admin = await getVerifiedAdmin(request);
  if (!admin) {
    return { admin: null, response: adminUnauthorizedResponse() };
  }

  if (admin.role !== 'SUPER_ADMIN') {
    return {
      admin: null,
      response: NextResponse.json(
        { ok: false, error: 'Tracking health is restricted to SUPER_ADMIN users.' },
        { status: 403 }
      ),
    };
  }

  return { admin, response: null };
}

function isCodPaymentMethod(paymentMethod: string | null) {
  if (!paymentMethod) return false;
  const normalized = paymentMethod.toLowerCase();
  return normalized.includes('cod') || normalized.includes('cash');
}

export async function GET(request: NextRequest) {
  const { response } = await requireTrackingHealthAdmin(request);
  if (response) return response;

  const windowHours = parseWindowHours(request);
  const [snapshot, failures, history] = await Promise.all([
    buildTrackingHealthSnapshot({ windowHours }),
    listRecentTrackingFailures(40),
    listTrackingHealthHistory(14),
  ]);

  return NextResponse.json({
    ok: true,
    snapshot,
    failures,
    history,
  });
}

export async function POST(request: NextRequest) {
  const { response } = await requireTrackingHealthAdmin(request);
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    hours?: number;
    orderId?: string;
    failureId?: string;
    sendAlert?: boolean;
  };

  if (body.action === 'run_check') {
    const windowHours = Math.min(Math.max(Number(body.hours) || 24, 1), 24 * 30);
    const snapshot = await buildTrackingHealthSnapshot({ windowHours });
    const persisted = await persistTrackingHealthCheck(snapshot);
    const alert = body.sendAlert ? await sendTrackingHealthAlert(snapshot) : { sent: false, reason: 'MANUAL_ALERT_DISABLED' };

    return NextResponse.json({
      ok: true,
      snapshot,
      alert,
      healthCheckId: persisted.id,
    });
  }

  if (body.action === 'retry_order_tracking') {
    let orderId = body.orderId;
    let failureEventName: string | null = null;
    let failureProvider: string | null = null;

    if (body.failureId) {
      const failure = await prisma.metaCapiFailure.findUnique({
        where: { id: body.failureId },
        select: { orderId: true, eventName: true, provider: true },
      });
      orderId = orderId ?? failure?.orderId ?? undefined;
      failureEventName = failure?.eventName ?? null;
      failureProvider = failure?.provider ?? null;
    }

    if (!orderId) {
      return NextResponse.json({ ok: false, error: 'orderId or failureId is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        paymentMethod: true,
        paymentStatus: true,
        phoneConfirmedAt: true,
        paymentPaidAt: true,
        paidAt: true,
        metaPurchaseSent: true,
        gaPurchaseSent: true,
        gaRefundSent: true,
        isTest: true,
      },
    });

    if (!order) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    }

    if (order.isTest) {
      return NextResponse.json({ ok: false, error: 'Test/internal orders are not retried' }, { status: 400 });
    }

    const queued: string[] = [];
    const isCod = isCodPaymentMethod(order.paymentMethod);
    const hasOnlinePaidSignal = Boolean(order.paymentPaidAt || order.paidAt || order.paymentStatus === 'COMPLETED');

    if (!order.metaPurchaseSent) {
      if (isCod && order.phoneConfirmedAt) {
        await enqueueMetaCapiPurchase({ type: 'cod_purchase', orderId: order.id }, { jobId: `manual_retry:cod_purchase:${order.id}:${Date.now()}` });
        queued.push('meta_cod_purchase');
      } else if (hasOnlinePaidSignal) {
        await enqueueMetaCapiPurchase({ type: 'online_paid_purchase', orderId: order.id }, { jobId: `manual_retry:online_paid_purchase:${order.id}:${Date.now()}` });
        queued.push('meta_online_paid_purchase');
      }
    }

    if (!order.gaPurchaseSent && (order.phoneConfirmedAt || hasOnlinePaidSignal)) {
      await enqueueGa4Purchase(
        {
          orderId: order.id,
          source: isCod && order.phoneConfirmedAt ? 'cod_phone_confirmed' : 'online_paid',
        },
        { jobId: `manual_retry:ga4_purchase:${order.id}:${Date.now()}` }
      );
      queued.push('ga4_purchase');
    }


    const isGa4RefundFailure = failureProvider === 'GA4' && failureEventName === 'refund';
    if (isGa4RefundFailure && !order.gaRefundSent) {
      await enqueueGa4Refund(
        { orderId: order.id, source: 'manual_retry' },
        { jobId: `manual_retry:ga4_refund:${order.id}:${Date.now()}` }
      );
      queued.push('ga4_refund');
    }

    if (body.failureId) {
      await prisma.metaCapiFailure.update({
        where: { id: body.failureId },
        data: { retryCount: { increment: 1 }, finalFailed: false },
      }).catch(() => null);
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      queued,
      message: queued.length ? 'Tracking retry jobs queued' : 'No retry job queued. Order may already be sent or not eligible.',
    });
  }

  return NextResponse.json({ ok: false, error: 'Unsupported action' }, { status: 400 });
}
