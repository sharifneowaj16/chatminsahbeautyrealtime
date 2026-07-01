import { NextRequest, NextResponse } from 'next/server';
import {
  buildTrackingHealthSnapshot,
  persistTrackingHealthCheck,
  sendTrackingHealthAlert,
} from '@/lib/tracking/health';

export const dynamic = 'force-dynamic';

function parseWindowHours(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('hours');
  const parsed = raw ? Number.parseInt(raw, 10) : 24;
  if (Number.isNaN(parsed)) return 24;
  return Math.min(Math.max(parsed, 1), 24 * 30);
}

function isAuthorizedCron(request: NextRequest) {
  const secret = process.env.TRACKING_HEALTH_CRON_SECRET || process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null;
  const headerToken = request.headers.get('x-cron-secret');
  const queryToken = request.nextUrl.searchParams.get('secret');
  const queryTokenAllowed = process.env.NODE_ENV !== 'production' && queryToken === secret;

  return bearerToken === secret || headerToken === secret || queryTokenAllowed;
}

async function runTrackingHealthCron(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized cron request' }, { status: 401 });
  }

  const windowHours = parseWindowHours(request);
  const snapshot = await buildTrackingHealthSnapshot({ windowHours });
  const persisted = await persistTrackingHealthCheck(snapshot);
  const alert = await sendTrackingHealthAlert(snapshot);

  return NextResponse.json({
    ok: true,
    healthCheckId: persisted.id,
    snapshot,
    alert,
  });
}

export async function GET(request: NextRequest) {
  return runTrackingHealthCron(request);
}

export async function POST(request: NextRequest) {
  return runTrackingHealthCron(request);
}
