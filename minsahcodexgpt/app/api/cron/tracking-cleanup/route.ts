import { NextRequest, NextResponse } from 'next/server';
import { authorizeSharedSecretRequest } from '@/lib/security/request-secret';
import { runTrackingFailureCleanup } from '@/lib/tracking/failure-retention';
import { cleanupExpiredTelegramActionTokens } from '@/lib/telegram/action-tokens';
import {
  getRequestId,
  getRequestLogContext,
  logOperationalError,
  logOperationalInfo,
  logOperationalWarning,
} from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

function authorizeCron(request: NextRequest) {
  return authorizeSharedSecretRequest(request, {
    secrets: [
      process.env.TRACKING_CLEANUP_CRON_SECRET,
      process.env.TRACKING_HEALTH_CRON_SECRET,
      process.env.CRON_SECRET,
    ],
    headerNames: ['x-cron-secret'],
    allowQueryParamInNonProduction: true,
    allowWhenUnconfiguredInNonProduction: true,
  });
}

function parseBooleanQuery(value: string | null) {
  return value === '1' || value === 'true' || value === 'yes';
}

function parseLimit(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('limit');
  const parsed = raw ? Number.parseInt(raw, 10) : undefined;
  if (!parsed || Number.isNaN(parsed)) return undefined;
  return Math.min(Math.max(parsed, 1), 10_000);
}

function jsonWithRequestId(body: unknown, requestId: string, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('x-request-id', requestId);
  response.headers.set('cache-control', 'no-store');
  return response;
}

async function runCleanupCron(request: NextRequest) {
  const requestId = getRequestId(request);
  const context = getRequestLogContext(request, requestId);
  const authorization = authorizeCron(request);

  if (!authorization.ok) {
    logOperationalWarning('cron.tracking_cleanup.unauthorized', {
      ...context,
      secretConfigured: authorization.configured,
    });
    return jsonWithRequestId({ ok: false, error: 'Unauthorized cron request' }, requestId, { status: 401 });
  }

  const dryRun = parseBooleanQuery(request.nextUrl.searchParams.get('dryRun'));
  const limit = parseLimit(request);
  const startedAt = Date.now();

  try {
    const result = await runTrackingFailureCleanup({ dryRun, limit });
    const telegram = dryRun
      ? { skipped: true, reason: 'DRY_RUN' }
      : { deletedActionTokens: await cleanupExpiredTelegramActionTokens({ limit }) };

    logOperationalInfo('cron.tracking_cleanup.completed', {
      ...context,
      dryRun,
      limit,
      telegramDeletedActionTokens: 'deletedActionTokens' in telegram ? telegram.deletedActionTokens : 0,
      durationMs: Date.now() - startedAt,
    });

    return jsonWithRequestId({ ...result, telegram }, requestId);
  } catch (error) {
    logOperationalError('cron.tracking_cleanup.failed', error, {
      ...context,
      dryRun,
      limit,
      durationMs: Date.now() - startedAt,
    });
    return jsonWithRequestId(
      { ok: false, error: 'Tracking cleanup cron failed.' },
      requestId,
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return runCleanupCron(request);
}

export async function POST(request: NextRequest) {
  return runCleanupCron(request);
}
