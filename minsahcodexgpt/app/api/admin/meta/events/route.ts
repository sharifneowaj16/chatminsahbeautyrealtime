import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, requireSuperAdminMutation } from '@/app/api/admin/_utils';
import { requestMetaOutboxDispatch } from '@/lib/meta/capi/dispatcher';
import { listMetaEventOutbox, requeueMetaOutboxById } from '@/lib/meta/capi/outbox-repository';
import type { MetaEventOutboxStatus } from '@/lib/meta/capi/types';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { metaAdminActionErrorResponse } from '@/app/api/admin/meta/_shared/response';
import { getMetaCapiCutoverStatus } from '@/lib/meta-platform/migration/phase28-capi-facade';
import { assertMetaAdminSafeDto, metaAdminNoStoreHeaders, parseMetaAdminLimit, projectMetaAdminFailure, safeMetaAdminCode, safeMetaAdminText } from '@/lib/meta-platform/admin/contracts';

const STATUS_VALUES = new Set<MetaEventOutboxStatus>([
  'PENDING', 'DISPATCHED', 'PROCESSING', 'SENT', 'RETRY_SCHEDULED', 'FAILED_PERMANENT', 'SUPPRESSED',
]);

function safeRecord(record: Awaited<ReturnType<typeof listMetaEventOutbox>>[number]) {
  return Object.freeze({
    id: record.id,
    eventName: safeMetaAdminCode(record.eventName, 'META_EVENT'),
    eventId: record.eventId,
    orderId: record.orderId,
    sourceType: safeMetaAdminCode(record.sourceType, 'UNKNOWN'),
    sourceId: record.sourceId,
    actionSource: safeMetaAdminCode(record.actionSource, 'UNKNOWN'),
    eventTime: record.eventTime.toISOString(),
    status: safeMetaAdminCode(record.status, 'UNKNOWN'),
    attempts: record.attempts,
    nextAttemptAt: record.nextAttemptAt?.toISOString() ?? null,
    dispatchedAt: record.dispatchedAt?.toISOString() ?? null,
    processingAt: record.processingAt?.toISOString() ?? null,
    sentAt: record.sentAt?.toISOString() ?? null,
    failure: projectMetaAdminFailure(record.lastError),
    suppressReason: safeMetaAdminText(record.suppressReason, 240),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

export async function GET(request: NextRequest) {
  const { response } = await requireSuperAdmin(request);
  if (response) return response;
  const rawStatus = request.nextUrl.searchParams.get('status')?.toUpperCase();
  const status = rawStatus && STATUS_VALUES.has(rawStatus as MetaEventOutboxStatus) ? rawStatus as MetaEventOutboxStatus : undefined;
  const eventName = request.nextUrl.searchParams.get('eventName') ?? undefined;
  const limit = parseMetaAdminLimit(request.nextUrl.searchParams.get('limit'));
  const records = await listMetaEventOutbox({ status, eventName, limit });
  const payload = { ok: true, count: records.length, cutover: getMetaCapiCutoverStatus(), events: records.map(safeRecord) };
  assertMetaAdminSafeDto(payload);
  return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
}

export async function POST(request: NextRequest) {
  const { admin, response } = await requireSuperAdminMutation(request);
  if (response) return response;
  if (!admin) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as { outboxId?: unknown; approvalId?: unknown; reason?: unknown } | null;
  const outboxId = typeof body?.outboxId === 'string' ? body.outboxId.trim() : '';
  if (!outboxId) return NextResponse.json({ ok: false, error: 'outboxId is required' }, { status: 400 });
  try {
    const executed = await executeMetaAdminAction({
      request,
      actorId: admin.adminId,
      actionKey: 'META_EVENT_REPLAY',
      resourceType: 'META_EVENT_OUTBOX',
      resourceId: outboxId,
      payload: { outboxId },
      approvalId: typeof body?.approvalId === 'string' ? body.approvalId : null,
      reason: typeof body?.reason === 'string' ? body.reason : 'Manual Meta event replay',
      run: async () => {
        const record = await requeueMetaOutboxById({ outboxId, reason: `Approved manual replay requested by ${admin.adminId}` });
        if (!record) throw new Error('Outbox event not found or already sent');
        const dispatch = await requestMetaOutboxDispatch(record.id);
        return { outboxId: record.id, status: record.status, queued: dispatch.queued, jobId: dispatch.jobId, durablePending: !dispatch.queued };
      },
    });
    const payload = { ok: true, outboxId: executed.result.outboxId, status: safeMetaAdminCode(executed.result.status, 'UNKNOWN'), queued: executed.result.queued === true, durablePending: executed.result.durablePending === true, auditId: executed.auditId };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
  } catch (error) {
    return metaAdminActionErrorResponse(error);
  }
}
