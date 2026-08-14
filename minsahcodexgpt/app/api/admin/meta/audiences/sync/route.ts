import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { metaAdminActionErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { executeOrRequestApprovedMetaAudienceMutation } from '@/app/api/admin/meta/_shared/audience-mutation';
import { assertMetaAudienceConsentBatch, hashMetaAudienceCustomers } from '@/lib/meta-platform/domains/audiences/hashing';
import type { MetaAudienceCustomerRecord, MetaAudienceSegment } from '@/lib/meta-platform/domains/audiences/types';
import { prepareDatabaseSegmentBatch } from '@/lib/meta-business/audiences';

export async function POST(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const audienceId = requiredString(body.audienceId, 'audienceId');
    const mode = body.mode === 'remove' || body.mode === 'replace' ? body.mode : 'add';
    const valueBased = body.valueBased === true;
    let batch;
    let segment: MetaAudienceSegment | undefined;
    if (Array.isArray(body.customers)) {
      batch = hashMetaAudienceCustomers({ customers: body.customers as MetaAudienceCustomerRecord[], valueBased, requireExplicitConsent: true });
      assertMetaAudienceConsentBatch(batch);
    } else {
      segment = body.segment === 'newsletter' || body.segment === 'purchasers_180d' ? body.segment : 'all_marketable';
      batch = await prepareDatabaseSegmentBatch({ segment, valueBased, limit: typeof body.limit === 'number' ? body.limit : undefined });
      assertMetaAudienceConsentBatch(batch);
    }
    const executed = await executeOrRequestApprovedMetaAudienceMutation({
      request, actorId: admin!.adminId, operation: 'SYNC_CUSTOM_AUDIENCE', resourceId: audienceId,
      payload: { mode, batch, segment }, approvalId: body.approvalId, requestApproval: body.requestApproval, reason: body.reason,
    });
    return executed.mode === 'APPROVAL_REQUESTED'
      ? NextResponse.json({ ok: true, approval: executed.approval, auditId: executed.auditId, accepted: batch.accepted }, { status: 202 })
      : NextResponse.json({ ok: true, sync: executed.result, auditId: executed.auditId });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
