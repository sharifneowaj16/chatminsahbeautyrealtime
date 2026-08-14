import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { metaAdminActionErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { createMetaAdminApproval, executeMetaAdminAction } from '@/lib/meta/admin/service';
import {
  attachCatalogDeletePlanApproval,
  catalogDeleteApprovalPayload,
  createCatalogDeletePlan,
  failQueuedCatalogDeletePlan,
  getCatalogDeletePlan,
  markCatalogDeletePlanQueued,
} from '@/lib/meta-platform/domains/catalog/orchestration';
import { enqueueMetaCatalogSyncJob } from '@/lib/jobs/queues';
import { buildCatalogDeletePlanIdempotencyKey } from '@/lib/jobs/idempotency';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try {
    const deletePlanId = requiredString(request.nextUrl.searchParams.get('deletePlanId'), 'deletePlanId');
    const plan = await getCatalogDeletePlan(deletePlanId);
    if (!plan) return NextResponse.json({ ok: false, error: 'Delete plan not found' }, { status: 404 });
    return NextResponse.json({ ok: true, plan });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  const guard = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (guard.response) return guard.response;
  const admin = guard.admin!;
  try {
    const body = await readJsonObject(request);
    const action = typeof body.action === 'string' ? body.action : 'preview';

    if (action === 'preview') {
      const catalogId = typeof body.catalogId === 'string' ? body.catalogId.trim() || undefined : undefined;
      const expiresInMinutes = Number(body.expiresInMinutes ?? 30);
      const executed = await executeMetaAdminAction({
        request, actorId: admin.adminId, actionKey: 'META_CATALOG_DELETE_PREVIEW', resourceType: 'META_CATALOG_DELETE_PLAN', resourceId: null,
        payload: { catalogId: catalogId ?? null, expiresInMinutes }, reason: typeof body.reason === 'string' ? body.reason : 'Preview managed catalog deletions',
        run: () => createCatalogDeletePlan({ catalogId, requestedById: admin.adminId, expiresInMinutes }),
      });
      return NextResponse.json({ ok: true, ...executed.result, auditId: executed.auditId }, { status: 201 });
    }

    const deletePlanId = requiredString(body.deletePlanId, 'deletePlanId');
    const plan = await getCatalogDeletePlan(deletePlanId);
    if (!plan) return NextResponse.json({ ok: false, error: 'Delete plan not found' }, { status: 404 });
    const approvalPayload = catalogDeleteApprovalPayload(plan);

    if (action === 'request_approval') {
      const reason = requiredString(body.reason, 'reason');
      const executed = await executeMetaAdminAction({
        request, actorId: admin.adminId, actionKey: 'META_APPROVAL_REQUEST', resourceType: 'META_CATALOG_DELETE_PLAN', resourceId: deletePlanId,
        payload: { requestedAction: 'META_CATALOG_DELETE', deletePlanId, digest: plan.digest }, reason,
        run: async () => {
          const approval = await createMetaAdminApproval({
            actionKey: 'META_CATALOG_DELETE', resourceType: 'META_CATALOG_DELETE_PLAN', resourceId: deletePlanId,
            payload: approvalPayload, reason, requestedById: admin.adminId, expiresInMinutes: Math.max(5, Math.floor((plan.expiresAt.getTime() - Date.now()) / 60_000)),
          });
          await attachCatalogDeletePlanApproval({ deletePlanId, approvalId: approval.id });
          return approval;
        },
      });
      return NextResponse.json({ ok: true, approval: executed.result, auditId: executed.auditId }, { status: 201 });
    }

    if (action === 'execute') {
      const approvalId = requiredString(body.approvalId, 'approvalId');
      const reason = typeof body.reason === 'string' ? body.reason : 'Execute independently approved catalog deletion plan';
      const executed = await executeMetaAdminAction({
        request, actorId: admin.adminId, actionKey: 'META_CATALOG_DELETE', resourceType: 'META_CATALOG_DELETE_PLAN', resourceId: deletePlanId,
        payload: approvalPayload, approvalId, reason,
        run: async () => {
          await markCatalogDeletePlanQueued({ deletePlanId, approvalId, executedById: admin.adminId });
          try {
            return await enqueueMetaCatalogSyncJob({
              mode: 'delete', deletePlanId, catalogId: plan.catalogId, requestedBy: admin.adminId,
              idempotencyKey: buildCatalogDeletePlanIdempotencyKey(deletePlanId),
            });
          } catch (error) {
            await failQueuedCatalogDeletePlan({ deletePlanId, error });
            throw error;
          }
        },
      });
      return NextResponse.json({ ok: true, queued: executed.result, auditId: executed.auditId }, { status: 202 });
    }

    return NextResponse.json({ ok: false, error: 'action must be preview, request_approval or execute' }, { status: 400 });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
