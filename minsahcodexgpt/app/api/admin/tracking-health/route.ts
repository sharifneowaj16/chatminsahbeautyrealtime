import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/app/api/admin/_utils';
import { enqueueGa4Purchase, enqueueGa4Refund, enqueueTikTokPurchase } from '@/lib/queue/metaCapiQueue';
import { createMetaPurchaseOutbox } from '@/lib/meta/capi/purchase-outbox';
import { requestMetaOutboxDispatch } from '@/lib/meta/capi/dispatcher';
import { requeueMetaOutboxById } from '@/lib/meta/capi/outbox-repository';
import {
  buildTrackingHealthSnapshot,
  listRecentTrackingFailures,
  listTrackingHealthHistory,
  persistTrackingHealthCheck,
  sendTrackingHealthAlert,
} from '@/lib/tracking/health';
import {
  getTrackingFailureLogRetentionMetadata,
  getTrackingFailureRetentionConfig,
  runTrackingFailureCleanup,
} from '@/lib/tracking/failure-retention';
import {
  getRequestId,
  getRequestLogContext,
  logOperationalError,
  logOperationalInfo,
  logOperationalWarning,
} from '@/lib/observability/logger';

const TRACKING_HEALTH_ACTIONS = [
  'run_check',
  'cleanup_failures',
  'retry_order_tracking',
] as const;

type TrackingHealthAction = (typeof TRACKING_HEALTH_ACTIONS)[number];

type TrackingHealthActionBody = {
  action?: unknown;
  hours?: unknown;
  orderId?: unknown;
  failureId?: unknown;
  sendAlert?: unknown;
  dryRun?: unknown;
  limit?: unknown;
};

function parseWindowHours(value: unknown, fallback = 24) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), 24 * 30);
}

function parseCleanupLimit(value: unknown) {
  if (value == null) return undefined;
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) return undefined;
  return Math.min(Math.max(parsed, 1), 10_000);
}

function isTrackingHealthAction(value: unknown): value is TrackingHealthAction {
  return typeof value === 'string' && TRACKING_HEALTH_ACTIONS.includes(value as TrackingHealthAction);
}

function isCodPaymentMethod(paymentMethod: string | null) {
  if (!paymentMethod) return false;
  const normalized = paymentMethod.toLowerCase();
  return normalized.includes('cod') || normalized.includes('cash');
}

function jsonWithRequestId(body: unknown, requestId: string, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('x-request-id', requestId);
  response.headers.set('cache-control', 'no-store');
  return response;
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const context = getRequestLogContext(request, requestId);
  const { admin, response } = await requireSuperAdmin(
    request,
    'Tracking health is restricted to SUPER_ADMIN users.'
  );
  if (response) return response;

  const windowHours = parseWindowHours(request.nextUrl.searchParams.get('hours'));
  const startedAt = Date.now();

  try {
    const [snapshot, failures, history] = await Promise.all([
      buildTrackingHealthSnapshot({ windowHours }),
      listRecentTrackingFailures(40),
      listTrackingHealthHistory(14),
    ]);

    logOperationalInfo('admin.tracking_health.read', {
      ...context,
      adminId: admin.adminId,
      windowHours,
      status: snapshot.status,
      failureCount: failures.length,
      durationMs: Date.now() - startedAt,
    });

    return jsonWithRequestId({
      ok: true,
      checkedAt: new Date().toISOString(),
      snapshot,
      failures,
      history,
      retention: getTrackingFailureRetentionConfig(),
    }, requestId);
  } catch (error) {
    logOperationalError('admin.tracking_health.read_failed', error, {
      ...context,
      adminId: admin.adminId,
      windowHours,
      durationMs: Date.now() - startedAt,
    });
    return jsonWithRequestId(
      { ok: false, error: 'Tracking health data could not be loaded.' },
      requestId,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const context = getRequestLogContext(request, requestId);
  const { admin, response } = await requireSuperAdmin(
    request,
    'Tracking health is restricted to SUPER_ADMIN users.'
  );
  if (response) return response;

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 64_000) {
    return jsonWithRequestId({ ok: false, error: 'Request payload is too large.' }, requestId, { status: 413 });
  }

  const body = (await request.json().catch(() => null)) as TrackingHealthActionBody | null;
  if (!body || !isTrackingHealthAction(body.action)) {
    return jsonWithRequestId({ ok: false, error: 'Unsupported action' }, requestId, { status: 400 });
  }

  const action = body.action;
  const startedAt = Date.now();

  try {
    if (action === 'run_check') {
      const windowHours = parseWindowHours(body.hours);
      const snapshot = await buildTrackingHealthSnapshot({ windowHours });
      const persisted = await persistTrackingHealthCheck(snapshot);
      const alert = body.sendAlert === true
        ? await sendTrackingHealthAlert(snapshot)
        : { sent: false, reason: 'MANUAL_ALERT_DISABLED' };

      logOperationalInfo('admin.tracking_health.check_completed', {
        ...context,
        adminId: admin.adminId,
        windowHours,
        status: snapshot.status,
        alertSent: alert.sent,
        healthCheckId: persisted.id,
        durationMs: Date.now() - startedAt,
      });

      return jsonWithRequestId({
        ok: true,
        checkedAt: new Date().toISOString(),
        snapshot,
        alert,
        healthCheckId: persisted.id,
      }, requestId);
    }

    if (action === 'cleanup_failures') {
      const dryRun = body.dryRun !== false;
      const limit = parseCleanupLimit(body.limit);
      const result = await runTrackingFailureCleanup({ dryRun, limit });

      logOperationalInfo('admin.tracking_health.cleanup_completed', {
        ...context,
        adminId: admin.adminId,
        dryRun,
        limit,
        durationMs: Date.now() - startedAt,
      });

      return jsonWithRequestId(result, requestId);
    }

    let orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const failureId = typeof body.failureId === 'string' ? body.failureId.trim() : '';
    let failureEventName: string | null = null;
    let failureProvider: string | null = null;

    if (failureId) {
      const failure = await prisma.metaCapiFailure.findUnique({
        where: { id: failureId },
        select: { orderId: true, eventName: true, provider: true },
      });
      orderId = orderId || failure?.orderId || '';
      failureEventName = failure?.eventName ?? null;
      failureProvider = failure?.provider ?? null;
    }

    if (!orderId) {
      return jsonWithRequestId(
        { ok: false, error: 'orderId or failureId is required' },
        requestId,
        { status: 400 }
      );
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
        tiktokPurchaseSent: true,
        isTest: true,
      },
    });

    if (!order) {
      return jsonWithRequestId({ ok: false, error: 'Order not found' }, requestId, { status: 404 });
    }

    if (order.isTest) {
      return jsonWithRequestId(
        { ok: false, error: 'Test/internal orders are not retried' },
        requestId,
        { status: 400 }
      );
    }

    const queued: string[] = [];
    const isCod = isCodPaymentMethod(order.paymentMethod);
    const hasOnlinePaidSignal = Boolean(
      order.paymentPaidAt || order.paidAt || order.paymentStatus === 'COMPLETED'
    );
    const retryNonce = Date.now();

    if (!order.metaPurchaseSent) {
      const purchaseType = isCod && order.phoneConfirmedAt
        ? 'cod_purchase'
        : hasOnlinePaidSignal
          ? 'online_paid_purchase'
          : null;
      const eventTime = purchaseType === 'cod_purchase'
        ? order.phoneConfirmedAt
        : order.paymentPaidAt ?? order.paidAt;

      if (purchaseType && eventTime) {
        const outbox = await createMetaPurchaseOutbox({
          purchaseType,
          orderId: order.id,
          eventTime,
          sourceType: 'MANUAL_TRACKING_RETRY',
          sourceId: failureId || `manual-${retryNonce}`,
        });
        if (!outbox.created && ['FAILED_PERMANENT', 'SUPPRESSED'].includes(outbox.record.status)) {
          await requeueMetaOutboxById({
            outboxId: outbox.record.id,
            reason: `Manual tracking-health replay by ${admin.adminId}`,
          });
        }
        const dispatch = await requestMetaOutboxDispatch(outbox.record.id);
        queued.push(
          dispatch.queued
            ? `meta_${purchaseType}`
            : `meta_${purchaseType}_durable_pending`
        );
      }
    }

    if (!order.gaPurchaseSent && (order.phoneConfirmedAt || hasOnlinePaidSignal)) {
      await enqueueGa4Purchase(
        {
          orderId: order.id,
          source: isCod && order.phoneConfirmedAt ? 'cod_phone_confirmed' : 'online_paid',
        },
        { jobId: `manual_retry:ga4_purchase:${order.id}:${retryNonce}` }
      );
      queued.push('ga4_purchase');
    }

    if (!order.tiktokPurchaseSent) {
      if (isCod && order.phoneConfirmedAt) {
        await enqueueTikTokPurchase(
          { type: 'tiktok_cod_purchase', orderId: order.id },
          { jobId: `manual_retry:tiktok_cod_purchase:${order.id}:${retryNonce}` }
        );
        queued.push('tiktok_cod_purchase');
      } else if (hasOnlinePaidSignal) {
        await enqueueTikTokPurchase(
          { type: 'tiktok_online_paid_purchase', orderId: order.id },
          { jobId: `manual_retry:tiktok_online_paid_purchase:${order.id}:${retryNonce}` }
        );
        queued.push('tiktok_online_paid_purchase');
      }
    }

    const isGa4RefundFailure = failureProvider === 'GA4' && failureEventName === 'refund';
    if (isGa4RefundFailure && !order.gaRefundSent) {
      await enqueueGa4Refund(
        { orderId: order.id, source: 'manual_retry' },
        { jobId: `manual_retry:ga4_refund:${order.id}:${retryNonce}` }
      );
      queued.push('ga4_refund');
    }

    if (failureId) {
      const retention = getTrackingFailureLogRetentionMetadata({
        provider: failureProvider,
        finalFailed: false,
      });
      try {
        await prisma.metaCapiFailure.update({
          where: { id: failureId },
          data: {
            retryCount: { increment: 1 },
            finalFailed: false,
            failureCategory: retention.failureCategory,
            cleanupAfter: retention.cleanupAfter,
            lastRetryAt: new Date(),
          },
        });
      } catch (error) {
        logOperationalWarning('admin.tracking_health.retry_metadata_update_failed', {
          ...context,
          adminId: admin.adminId,
          orderId: order.id,
          failureId,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    }

    logOperationalInfo('admin.tracking_health.retry_queued', {
      ...context,
      adminId: admin.adminId,
      orderId: order.id,
      failureId: failureId || undefined,
      queued,
      durationMs: Date.now() - startedAt,
    });

    return jsonWithRequestId({
      ok: true,
      orderId: order.id,
      queued,
      message: queued.length
        ? 'Tracking retry jobs queued'
        : 'No retry job queued. Order may already be sent or not eligible.',
    }, requestId);
  } catch (error) {
    logOperationalError('admin.tracking_health.action_failed', error, {
      ...context,
      adminId: admin.adminId,
      action,
      durationMs: Date.now() - startedAt,
    });

    return jsonWithRequestId(
      { ok: false, error: 'Tracking health action failed.' },
      requestId,
      { status: 500 }
    );
  }
}
