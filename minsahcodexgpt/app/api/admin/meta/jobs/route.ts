import { NextRequest, NextResponse } from 'next/server';
import { requireAdminMutationPermission, requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { isKnownMetaQueue } from '@/lib/jobs/health';
import { replayMetaDeadLetter } from '@/lib/jobs/dead-letter';
import type { MetaJobStatus } from '@/lib/jobs/job-types';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { metaAdminActionErrorResponse, readJsonObject } from '@/app/api/admin/meta/_shared/response';
import { assertMetaAdminSafeDto, metaAdminNoStoreHeaders, parseMetaAdminLimit, requireMetaAdminOpaqueId } from '@/lib/meta-platform/admin';
import { listMetaAdminJobs } from '@/lib/meta-platform/admin/jobs-status';
import { getMetaAdminActionControls } from '@/lib/meta-platform/admin/jobs-dto';
import { cancelMetaAdminJob } from '@/lib/meta-platform/admin/job-actions';

export const dynamic = 'force-dynamic';
const STATUSES = new Set<MetaJobStatus>(['QUEUED', 'RUNNING', 'RETRYING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'DEAD_LETTER']);

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try {
    const rawStatus = request.nextUrl.searchParams.get('status')?.toUpperCase();
    const status = rawStatus && STATUSES.has(rawStatus as MetaJobStatus) ? rawStatus : undefined;
    const rawQueue = request.nextUrl.searchParams.get('queueName') ?? '';
    const queueName = rawQueue && isKnownMetaQueue(rawQueue) ? rawQueue : undefined;
    if (rawQueue && !queueName) throw Object.assign(new Error('META_QUEUE_NAME_INVALID'), { status: 400, code: 'META_QUEUE_NAME_INVALID' });
    const result = await listMetaAdminJobs({
      status,
      queueName,
      cursor: request.nextUrl.searchParams.get('cursor'),
      limit: parseMetaAdminLimit(request.nextUrl.searchParams.get('limit')),
    });
    const payload = { ok: true, ...result };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  const { admin, response } = await requireAdminMutationPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE, {
    message: 'Meta job controls require the meta_ops_operate permission.',
  });
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
    const auditId = requireMetaAdminOpaqueId(body.auditId, 'META_JOB_AUDIT_ID_INVALID');
    const approvalId = typeof body.approvalId === 'string' ? requireMetaAdminOpaqueId(body.approvalId, 'META_JOB_APPROVAL_ID_INVALID') : null;
    const reason = typeof body.reason === 'string' ? body.reason.trim() : action === 'replay' ? 'Manual dead-letter replay' : 'Manual queue cancellation';
    const controls = getMetaAdminActionControls();
    if (action === 'replay') {
      if (!controls.replay.enabled) throw Object.assign(new Error(controls.replay.reasonCode), { status: 423, code: controls.replay.reasonCode });
      const executed = await executeMetaAdminAction({
        request, actorId: admin.adminId, actionKey: 'META_JOB_REPLAY', resourceType: 'META_JOB_AUDIT', resourceId: auditId,
        payload: { auditId }, approvalId, reason,
        run: async () => {
          const result = await replayMetaDeadLetter({ auditId, requestedBy: admin.adminId, approvalId: approvalId ?? '', reason });
          if (!result.ok) throw Object.assign(new Error(result.reason), { status: 409, code: result.reason });
          return result;
        },
      });
      const payload = { ...executed.result, auditId: executed.auditId };
      assertMetaAdminSafeDto(payload);
      return NextResponse.json(payload, { status: 202, headers: metaAdminNoStoreHeaders() });
    }
    if (action === 'cancel') {
      if (!controls.cancel.enabled) throw Object.assign(new Error(controls.cancel.reasonCode), { status: 423, code: controls.cancel.reasonCode });
      const executed = await executeMetaAdminAction({
        request, actorId: admin.adminId, actionKey: 'META_JOB_CANCEL', resourceType: 'META_JOB_AUDIT', resourceId: auditId,
        payload: { auditId }, approvalId, reason,
        run: () => cancelMetaAdminJob({ auditId, requestedBy: admin.adminId }),
      });
      const payload = { ok: true, ...executed.result, auditId: executed.auditId };
      assertMetaAdminSafeDto(payload);
      return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
    }
    return NextResponse.json({ ok: false, error: 'action must be replay or cancel' }, { status: 400, headers: metaAdminNoStoreHeaders() });
  } catch (error) {
    return metaAdminActionErrorResponse(error);
  }
}
