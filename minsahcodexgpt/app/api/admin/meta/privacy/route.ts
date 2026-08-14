import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/app/api/admin/_utils';
import prisma from '@/lib/prisma';
import { TRACKING_POLICY } from '@/lib/privacy/tracking-policy';
import { enqueuePrivacyJob, PRIVACY_JOB_NAMES } from '@/lib/privacy/jobs';

export async function GET(request: NextRequest) {
  const { response } = await requireSuperAdmin(request, 'Privacy governance is restricted to SUPER_ADMIN users.');
  if (response) return response;
  const [consent, deletions, suppressed, latestAudit] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ state: string; count: bigint }>>(
      `SELECT "state"::text AS state, COUNT(*)::bigint AS count FROM "TrackingConsentRecord" GROUP BY "state"`
    ),
    prisma.$queryRawUnsafe<Array<{ id: string; status: string; source: string; requestedAt: Date; completedAt: Date | null }>>(
      `SELECT "id","status"::text AS status,"source","requestedAt","completedAt"
       FROM "DataDeletionRequest" ORDER BY "requestedAt" DESC LIMIT 100`
    ),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "MetaEventOutbox" WHERE "status"='SUPPRESSED'`
    ),
    prisma.$queryRawUnsafe<Array<{ action: string; createdAt: Date; safeDetails: unknown }>>(
      `SELECT "action","createdAt","safeDetails" FROM "PrivacyAuditLog" ORDER BY "createdAt" DESC LIMIT 50`
    ),
  ]);
  return NextResponse.json({
    ok: true,
    policy: TRACKING_POLICY,
    consentDistribution: Object.fromEntries(consent.map((row) => [row.state, Number(row.count)])),
    suppressedEventCount: Number(suppressed[0]?.count ?? 0),
    deletionRequests: deletions.map((row) => ({ ...row, requestedAt: row.requestedAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null })),
    latestAudit: latestAudit.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
  });
}

export async function POST(request: NextRequest) {
  const { admin, response } = await requireSuperAdmin(request, 'Privacy governance actions are restricted to SUPER_ADMIN users.');
  if (response) return response;
  const body = await request.json().catch(() => null) as { action?: unknown; requestId?: unknown } | null;
  const action = String(body?.action ?? '');
  const map = {
    retention_cleanup: PRIVACY_JOB_NAMES.RETENTION_CLEANUP,
    suppression_sync: PRIVACY_JOB_NAMES.SUPPRESSION_SYNC,
    pii_audit_scan: PRIVACY_JOB_NAMES.PII_AUDIT_SCAN,
    deletion_replay: PRIVACY_JOB_NAMES.DELETION_PROCESSOR,
  } as const;
  const type = map[action as keyof typeof map];
  if (!type) return NextResponse.json({ ok: false, error: 'Unsupported action' }, { status: 400 });
  const requestId = typeof body?.requestId === 'string' ? body.requestId.trim() : undefined;
  if (type === PRIVACY_JOB_NAMES.DELETION_PROCESSOR && !requestId) {
    return NextResponse.json({ ok: false, error: 'requestId is required' }, { status: 400 });
  }
  const job = await enqueuePrivacyJob({
    type,
    requestId,
    idempotencyKey: `admin:${type}:${requestId ?? Date.now()}:${admin.adminId}`,
    limit: 1000,
  });
  return NextResponse.json({ ok: true, jobId: String(job.id), type }, { status: 202 });
}
