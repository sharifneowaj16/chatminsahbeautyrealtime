import { NextRequest, NextResponse } from 'next/server';
import { requireAdminMutationPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { metaAdminActionErrorResponse } from '@/app/api/admin/meta/_shared/response';
import { requestFacebookAdminReplyProduction } from '@/lib/meta-platform/domains/facebook/admin-reply';
import { assertMetaAdminSafeDto, metaAdminNoStoreHeaders } from '@/lib/meta-platform/admin';

export async function POST(request: NextRequest) {
  const { admin, response } = await requireAdminMutationPermission(request, ADMIN_PERMISSIONS.META_SOCIAL_OPERATE);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const resourceId = typeof body.recipientPsid === 'string'
      ? body.recipientPsid
      : typeof body.commentId === 'string' ? body.commentId : null;
    const executed = await executeMetaAdminAction({
      request,
      actorId: admin.adminId,
      actionKey: 'META_FACEBOOK_REPLY',
      resourceType: body.type === 'comment' ? 'FACEBOOK_COMMENT' : 'FACEBOOK_CONVERSATION',
      resourceId,
      payload: {
        type: body.type,
        recipientPsid: body.recipientPsid,
        commentId: body.commentId,
        pageId: body.pageId,
        hasText: typeof body.text === 'string' && Boolean(body.text.trim()),
        attachmentCount: Array.isArray(body.attachments) ? body.attachments.length : 0,
        clientMessageId: body.clientMessageId,
      },
      reason: 'Admin social inbox reply',
      run: () => requestFacebookAdminReplyProduction({
        type: body.type,
        recipientPsid: body.recipientPsid,
        commentId: body.commentId,
        pageId: body.pageId,
        text: body.text,
        attachments: body.attachments,
        actorId: admin.adminId,
        clientMessageId: body.clientMessageId,
      }),
    });
    const payload = { ...executed.result, auditId: executed.auditId };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, {
      status: executed.result.queued ? 202 : 200,
      headers: metaAdminNoStoreHeaders(),
    });
  } catch (error) {
    return metaAdminActionErrorResponse(error);
  }
}
