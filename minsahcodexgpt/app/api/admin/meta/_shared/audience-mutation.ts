import type { NextRequest } from 'next/server';
import { createMetaAdminApproval, executeMetaAdminAction, getMetaAdminRequestMetadata } from '@/lib/meta/admin/service';
import { MetaAdminActionError } from '@/lib/meta/admin/errors';
import { executeMetaAudienceMutation, prepareMetaAudienceMutation } from '@/lib/meta/audiences/mutations';
import type { MetaAudienceMutationOperation } from '@/lib/meta/audiences/types';

export async function executeOrRequestApprovedMetaAudienceMutation(input: {
  readonly request: NextRequest;
  readonly actorId: string;
  readonly operation: MetaAudienceMutationOperation;
  readonly resourceId?: string | null;
  readonly payload: Record<string, unknown>;
  readonly approvalId?: unknown;
  readonly requestApproval?: unknown;
  readonly reason?: unknown;
}) {
  const reason = typeof input.reason === 'string' && input.reason.trim() ? input.reason.trim() : `Execute approved ${input.operation}`;
  const prepared = await prepareMetaAudienceMutation({ operation: input.operation, resourceId: input.resourceId, payload: input.payload });
  const approvalId = typeof input.approvalId === 'string' ? input.approvalId.trim() : '';

  if (!approvalId) {
    if (input.requestApproval !== true) throw new MetaAdminActionError('An approved approvalId is required, or set requestApproval=true to request one.', 428, 'APPROVAL_REQUIRED');
    const requested = await executeMetaAdminAction({
      request: input.request,
      actorId: input.actorId,
      actionKey: 'META_APPROVAL_REQUEST',
      resourceType: 'META_ADMIN_APPROVAL',
      resourceId: prepared.approvalPayload.resourceId,
      payload: { requestedAction: 'META_AUDIENCE_MUTATION', operation: input.operation, resourceId: prepared.approvalPayload.resourceId },
      reason,
      run: () => createMetaAdminApproval({
        actionKey: 'META_AUDIENCE_MUTATION', resourceType: 'META_AUDIENCE', resourceId: prepared.approvalPayload.resourceId,
        payload: prepared.approvalPayload, reason, requestedById: input.actorId,
      }),
    });
    return Object.freeze({ mode: 'APPROVAL_REQUESTED' as const, approval: requested.result, auditId: requested.auditId });
  }

  const correlationId = getMetaAdminRequestMetadata(input.request).requestId;
  const executed = await executeMetaAdminAction({
    request: input.request,
    actorId: input.actorId,
    actionKey: 'META_AUDIENCE_MUTATION',
    resourceType: 'META_AUDIENCE',
    resourceId: prepared.approvalPayload.resourceId,
    payload: prepared.approvalPayload,
    approvalId,
    reason,
    beforeData: prepared.before,
    run: () => executeMetaAudienceMutation({ approvalId, actorId: input.actorId, correlationId, payload: prepared.approvalPayload, before: prepared.before }),
  });
  return Object.freeze({ mode: 'EXECUTED' as const, result: executed.result, auditId: executed.auditId });
}
