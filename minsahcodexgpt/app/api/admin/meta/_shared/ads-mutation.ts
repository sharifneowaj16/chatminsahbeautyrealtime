import type { NextRequest } from 'next/server';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { getMetaAdminRequestMetadata } from '@/lib/meta/admin/service';
import { executeMetaAdsMutation, prepareMetaAdsMutation } from '@/lib/meta/ads/mutations';
import type { MetaAdsMutationOperation } from '@/lib/meta/ads/types';
import { MetaAdminActionError } from '@/lib/meta/admin/errors';

export async function executeApprovedMetaAdsMutation(input: {
  request: NextRequest;
  actorId: string;
  operation: MetaAdsMutationOperation;
  resourceId?: string | null;
  payload: Record<string, unknown>;
  approvalId?: unknown;
  reason?: unknown;
}) {
  const approvalId = typeof input.approvalId === 'string' ? input.approvalId.trim() : '';
  if (!approvalId) throw new MetaAdminActionError('An approved approvalId is required for every Meta ad mutation.', 428, 'APPROVAL_REQUIRED');
  const reason = typeof input.reason === 'string' && input.reason.trim() ? input.reason.trim() : 'Execute approved Meta ad mutation';
  const prepared = await prepareMetaAdsMutation({ operation: input.operation, resourceId: input.resourceId, payload: input.payload });
  const correlationId = getMetaAdminRequestMetadata(input.request).requestId;
  return executeMetaAdminAction({
    request: input.request,
    actorId: input.actorId,
    actionKey: 'META_AD_MUTATION',
    resourceType: 'META_AD_ENTITY',
    resourceId: prepared.approvalPayload.resourceId,
    payload: prepared.approvalPayload,
    approvalId,
    reason,
    beforeData: prepared.before,
    run: () => executeMetaAdsMutation({
      approvalId,
      actorId: input.actorId,
      correlationId,
      payload: prepared.approvalPayload,
      before: prepared.before,
    }),
  });
}
