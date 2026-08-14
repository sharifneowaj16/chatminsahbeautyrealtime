import { NextRequest, NextResponse } from 'next/server';
import { authorizeSharedSecretRequest } from '@/lib/security/request-secret';
import {
  buildTrackingHealthSnapshot,
  persistTrackingHealthCheck,
  sendTrackingHealthAlert,
} from '@/lib/tracking/health';
import {
  getRequestId,
  getRequestLogContext,
  logOperationalError,
  logOperationalInfo,
  logOperationalWarning,
} from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

function parseWindowHours(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('hours');
  const parsed = raw ? Number.parseInt(raw, 10) : 24;
  if (Number.isNaN(parsed)) return 24;
  return Math.min(Math.max(parsed, 1), 24 * 30);
}

function authorizeCron(request: NextRequest) {
  return authorizeSharedSecretRequest(request, {
    secrets: [process.env.TRACKING_HEALTH_CRON_SECRET, process.env.CRON_SECRET],
    headerNames: ['x-cron-secret'],
    allowQueryParamInNonProduction: true,
    allowWhenUnconfiguredInNonProduction: true,
  });
}

function jsonWithRequestId(body: unknown, requestId: string, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('x-request-id', requestId);
  response.headers.set('cache-control', 'no-store');
  return response;
}

async function runTrackingHealthCron(request: NextRequest) {
  const requestId = getRequestId(request);
  const context = getRequestLogContext(request, requestId);
  const authorization = authorizeCron(request);

  if (!authorization.ok) {
    logOperationalWarning('cron.tracking_health.unauthorized', {
      ...context,
      secretConfigured: authorization.configured,
    });
    return jsonWithRequestId({ ok: false, error: 'Unauthorized cron request' }, requestId, { status: 401 });
  }

  const windowHours = parseWindowHours(request);
  const startedAt = Date.now();

  try {
    const snapshot = await buildTrackingHealthSnapshot({ windowHours });
    const persisted = await persistTrackingHealthCheck(snapshot);
    const alert = await sendTrackingHealthAlert(snapshot);

    logOperationalInfo('cron.tracking_health.completed', {
      ...context,
      windowHours,
      status: snapshot.status,
      healthCheckId: persisted.id,
      alertSent: alert.sent,
      durationMs: Date.now() - startedAt,
    });

    return jsonWithRequestId({
      ok: true,
      checkedAt: new Date().toISOString(),
      healthCheckId: persisted.id,
      snapshot,
      alert,
    }, requestId);
  } catch (error) {
    logOperationalError('cron.tracking_health.failed', error, {
      ...context,
      windowHours,
      durationMs: Date.now() - startedAt,
    });
    return jsonWithRequestId(
      { ok: false, error: 'Tracking health cron failed.' },
      requestId,
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return runTrackingHealthCron(request);
}

export async function POST(request: NextRequest) {
  return runTrackingHealthCron(request);
}
