import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminMutationPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { metaAdminActionErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { getInstagramConversation } from '@/lib/meta/instagram/conversations';
import { requestInstagramStandardReplyProduction as sendInstagramReply } from '@/lib/meta-platform/domains/instagram/standard-reply-runtime';
import { requestInstagramPrivateReplyProduction } from '@/lib/meta-platform/domains/instagram/private-reply-runtime';
import { assertInstagramOutboundMediaRequestSupported } from '@/lib/meta-platform/domains/instagram/media-policy';
import { assertMetaAdminSafeDto, metaAdminNoStoreHeaders, requireMetaAdminOpaqueId, safeMetaAdminCode, toMetaAdminIso } from '@/lib/meta-platform/admin';
import { projectInstagramReplyAttemptForAdmin } from '@/lib/meta-platform/admin/instagram-dto';

export async function POST(request: NextRequest, context: { params: Promise<{ conversationId: string }> }) {
  const { admin, response } = await requireAdminMutationPermission(request, ADMIN_PERMISSIONS.META_SOCIAL_OPERATE);
  if (response) return response;
  try {
    const { conversationId: rawId } = await context.params;
    const conversationId = requireMetaAdminOpaqueId(rawId, 'INSTAGRAM_CONVERSATION_ID_INVALID');
    const body = await readJsonObject(request);
    const text = requiredString(body.text, 'text');
    assertInstagramOutboundMediaRequestSupported(body.attachments);
    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : `ig-reply:${randomUUID()}`;
    const mode = body.mode === 'PRIVATE_REPLY' ? 'PRIVATE_REPLY' : body.mode === 'MESSAGE' ? 'MESSAGE' : undefined;
    const sourceMessageId = typeof body.sourceMessageId === 'string' ? body.sourceMessageId : null;
    const reason = typeof body.reason === 'string' ? body.reason.trim() : 'Policy-checked Instagram reply';
    const before = await getInstagramConversation(conversationId);
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_INSTAGRAM_REPLY', resourceType: 'META_CONVERSATION', resourceId: conversationId,
      payload: { conversationId, textHashOnly: true, idempotencyKey, mode, sourceMessageId }, reason,
      beforeData: { status: before.status, lastInboundAt: before.lastInboundAt, replyWindowExpiresAt: before.replyWindowExpiresAt },
      run: () => mode === 'PRIVATE_REPLY'
        ? requestInstagramPrivateReplyProduction({ conversationId, actorId: admin.adminId, text, idempotencyKey, sourceMessageId: sourceMessageId ?? '' })
        : sendInstagramReply({ conversationId, actorId: admin.adminId, text, idempotencyKey, sourceMessageId }),
    });
    const rawResult = executed.result && typeof executed.result === 'object'
      ? executed.result as Record<string, unknown>
      : {};
    const reservation = rawResult.reservation && typeof rawResult.reservation === 'object'
      ? rawResult.reservation as Record<string, unknown>
      : null;
    const payload = {
      ok: true,
      result: {
        deduplicated: rawResult.deduplicated === true,
        queued: rawResult.queued === true,
        messageId: typeof rawResult.messageId === 'string' ? rawResult.messageId.slice(0, 255) : null,
        jobReference: typeof rawResult.jobReference === 'string' ? rawResult.jobReference.slice(0, 255) : null,
        attempt: projectInstagramReplyAttemptForAdmin(rawResult.attempt),
        reservation: reservation ? {
          id: typeof reservation.id === 'string' ? reservation.id.slice(0, 255) : null,
          status: safeMetaAdminCode(reservation.status, 'UNKNOWN'),
          expiresAt: toMetaAdminIso(reservation.expiresAt),
        } : null,
      },
      auditId: executed.auditId,
    };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
