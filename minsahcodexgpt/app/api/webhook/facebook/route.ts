import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';
import { getMetaFacebookRealtimeCutoverStatus } from '@/lib/meta-platform/domains/facebook/cutover';
import { requestFacebookInboxSyncProduction } from '@/lib/meta-platform/domains/facebook/legacy-bridge';
import { verifyInternalRealtimeBridgeRequest } from '@/lib/meta-platform/realtime/bridge-auth';
import { verifyMetaWebhookChallengeRequest, verifyMetaWebhookSignature } from '@/lib/meta-platform/transports/webhook';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const MAX_BYTES = 2 * 1024 * 1024;
const SAFE_PAGE_ID = /^[A-Za-z0-9._:-]{1,191}$/;

export async function GET(request: NextRequest) {
  const config = getMetaBusinessConfig();
  const result = verifyMetaWebhookChallengeRequest({
    searchParams: request.nextUrl.searchParams,
    expectedToken: config.webhookVerifyToken,
  });
  if (!result.ok) return NextResponse.json({ error: 'Webhook verification failed', code: result.code }, { status: 403 });
  return new NextResponse(result.challenge, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

function pageIdsFromEnvelope(value: unknown, configuredPageId?: string | null): string[] {
  const envelope = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const entries = Array.isArray(envelope.entry) ? envelope.entry : [];
  const ids = new Set<string>();
  for (const item of entries) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const id = (item as Record<string, unknown>).id;
    if (typeof id === 'string' && SAFE_PAGE_ID.test(id)) ids.add(id);
  }
  if (!ids.size && configuredPageId && SAFE_PAGE_ID.test(configuredPageId)) ids.add(configuredPageId);
  return [...ids];
}

export async function POST(request: NextRequest) {
  const rawBody = Buffer.from(await request.arrayBuffer());
  if (rawBody.byteLength > MAX_BYTES) return NextResponse.json({ error: 'PAYLOAD_TOO_LARGE' }, { status: 413 });

  const bridgeTimestamp = request.headers.get('x-realtime-bridge-timestamp');
  const bridgeSignature = request.headers.get('x-realtime-bridge-signature');
  const hasBridgeHeaders = Boolean(bridgeTimestamp || bridgeSignature);
  if (hasBridgeHeaders && !verifyInternalRealtimeBridgeRequest({
    timestamp: bridgeTimestamp,
    signature: bridgeSignature,
    method: 'POST',
    path: '/api/webhook/facebook',
    body: rawBody,
  })) {
    return NextResponse.json({ error: 'REALTIME_BRIDGE_AUTH_INVALID' }, { status: 401 });
  }

  const cutover = getMetaFacebookRealtimeCutoverStatus(process.env);
  if (!cutover.valid || cutover.mode === 'BLOCKED') {
    return NextResponse.json({ error: 'FACEBOOK_CUTOVER_BLOCKED', code: cutover.reasonCode }, { status: 503 });
  }
  if (cutover.mode === 'LEGACY' || cutover.mode === 'LEGACY_ROLLBACK') {
    return NextResponse.json({ error: 'FACEBOOK_LEGACY_AUTHORITY_ACTIVE', code: cutover.reasonCode }, { status: 409 });
  }
  if (cutover.mode === 'SHADOW' && !hasBridgeHeaders) {
    return NextResponse.json({ error: 'FACEBOOK_SHADOW_REQUIRES_SIGNED_LEGACY_MIRROR' }, { status: 409 });
  }

  const config = getMetaBusinessConfig();
  const providerSignature = verifyMetaWebhookSignature({
    rawBody,
    signatureHeader: request.headers.get('x-hub-signature-256'),
    appSecret: config.appSecret,
  });
  if (!providerSignature.ok) {
    return NextResponse.json({ error: 'WEBHOOK_SIGNATURE_INVALID', code: providerSignature.code }, { status: 403 });
  }

  let envelope: unknown;
  try {
    envelope = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'WEBHOOK_JSON_INVALID' }, { status: 400 });
  }
  const pageIds = pageIdsFromEnvelope(envelope, config.pageId);
  if (!pageIds.length) return NextResponse.json({ error: 'FACEBOOK_PAGE_ID_MISSING' }, { status: 422 });

  const digest = createHash('sha256').update(rawBody).digest('hex');
  try {
    const queued = await Promise.all(pageIds.map((pageId) => requestFacebookInboxSyncProduction({
      pageId,
      requestKey: `${digest}:${pageId}`,
      correlationId: `fb-webhook:${digest.slice(0, 48)}`,
    })));
    return NextResponse.json({
      accepted: queued.some((item) => item.accepted),
      deduplicated: queued.every((item) => item.deduplicated),
      pageCount: pageIds.length,
      requestIds: queued.map((item) => item.requestId),
      cutover: { mode: cutover.mode, authority: cutover.authority, reasonCode: cutover.reasonCode },
    }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'FACEBOOK_WEBHOOK_HANDOFF_UNAVAILABLE' }, { status: 503 });
  }
}
