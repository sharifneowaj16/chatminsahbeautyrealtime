import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission, requireSuperAdminMutation } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { listMetaLeadsSafe } from '@/lib/meta/leads/repository';
import { metaAdminActionErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { buildLeadFormSyncIdempotencyKey } from '@/lib/jobs/idempotency';
import { enqueueMetaLeadFormSyncJob } from '@/lib/jobs/queues';
import { assertMetaAdminSafeDto, metaAdminNoStoreHeaders, parseMetaAdminLimit, requireMetaAdminOpaqueId } from '@/lib/meta-platform/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try {
    const q = request.nextUrl.searchParams;
    const result = await listMetaLeadsSafe({
      page: Math.max(1, Number(q.get('page') ?? 1)),
      limit: parseMetaAdminLimit(q.get('limit'), 50, 100),
      status: q.get('status') ?? undefined,
      formId: q.get('formId') ?? undefined,
      assignedToId: q.get('assignedToId') ?? undefined,
      campaignId: q.get('campaignId') ?? undefined,
    });
    const payload = { ok: true, ...result };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdminMutation(request);
  if (guard.response) return guard.response;
  try {
    const body = await readJsonObject(request);
    const formId = requireMetaAdminOpaqueId(requiredString(body.formId, 'formId'), 'META_LEAD_FORM_ID_INVALID');
    const pageId = typeof body.pageId === 'string' && body.pageId.trim()
      ? requireMetaAdminOpaqueId(body.pageId, 'META_LEAD_PAGE_ID_INVALID')
      : undefined;
    const queued = await enqueueMetaLeadFormSyncJob({
      formId,
      pageId,
      limit: typeof body.limit === 'number' ? Math.min(Math.max(Math.trunc(body.limit), 1), 500) : undefined,
      since: typeof body.since === 'number' ? body.since : undefined,
      until: typeof body.until === 'number' ? body.until : undefined,
      requestedBy: guard.admin.adminId,
      idempotencyKey: buildLeadFormSyncIdempotencyKey(formId),
    });
    const row = queued && typeof queued === 'object' ? queued as Record<string, unknown> : {};
    const payload = {
      accepted: true,
      job: {
        queueName: typeof row.queueName === 'string' ? row.queueName : 'meta-leads',
        jobId: typeof row.jobId === 'string' ? row.jobId : typeof row.id === 'string' ? row.id : null,
        auditId: typeof row.auditId === 'string' ? row.auditId : null,
      },
    };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, { status: 202, headers: metaAdminNoStoreHeaders() });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
