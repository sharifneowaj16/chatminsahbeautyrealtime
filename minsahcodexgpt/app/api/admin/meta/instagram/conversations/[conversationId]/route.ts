import { NextRequest, NextResponse } from 'next/server';
import { requireAdminMutationPermission, requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { metaAdminActionErrorResponse, readJsonObject } from '@/app/api/admin/meta/_shared/response';
import { getInstagramConversation, getInstagramConversationSafe, updateInstagramConversation, type InstagramConversationStatus } from '@/lib/meta/instagram/conversations';
import { assertMetaAdminSafeDto, metaAdminNoStoreHeaders, requireMetaAdminOpaqueId } from '@/lib/meta-platform/admin';
import { projectInstagramConversationForAdmin } from '@/lib/meta-platform/admin/instagram-dto';
import { getInstagramAdminHealth } from '@/lib/meta-platform/admin/instagram-status';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ conversationId: string }> };

export async function GET(request: NextRequest, context: Context) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_SOCIAL_VIEW);
  if (response) return response;
  try {
    const { conversationId: rawId } = await context.params;
    const conversationId = requireMetaAdminOpaqueId(rawId, 'INSTAGRAM_CONVERSATION_ID_INVALID');
    const health = await getInstagramAdminHealth();
    const payload = {
      ok: true,
      conversation: await getInstagramConversationSafe(conversationId, {
        permissionGranted: health.permissionGranted,
        accountHealthy: health.replyEnabled,
      }),
    };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function PATCH(request: NextRequest, context: Context) {
  const { admin, response } = await requireAdminMutationPermission(request, ADMIN_PERMISSIONS.META_SOCIAL_OPERATE);
  if (response) return response;
  try {
    const { conversationId: rawId } = await context.params;
    const conversationId = requireMetaAdminOpaqueId(rawId, 'INSTAGRAM_CONVERSATION_ID_INVALID');
    const body = await readJsonObject(request);
    const before = await getInstagramConversation(conversationId);
    const assignedToId = body.assignedToId === null ? null : typeof body.assignedToId === 'string' ? body.assignedToId.trim() : undefined;
    const status = typeof body.status === 'string' ? body.status.toUpperCase() as InstagramConversationStatus : undefined;
    const actionKey = assignedToId !== undefined ? 'META_INSTAGRAM_ASSIGN' : 'META_INSTAGRAM_STATUS_UPDATE';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : 'Instagram conversation updated by operator';
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey, resourceType: 'META_CONVERSATION', resourceId: conversationId,
      payload: { conversationId, assignedToId, status, tagCount: Array.isArray(body.tags) ? body.tags.length : 0, hasSubject: typeof body.subject === 'string' }, reason,
      beforeData: { assignedToId: before.assignedToId, status: before.status, tags: before.tags, subject: before.subject },
      run: () => updateInstagramConversation({
        conversationId, assignedToId, status, tags: body.tags,
        subject: body.subject === null ? null : typeof body.subject === 'string' ? body.subject : undefined,
      }),
    });
    const health = await getInstagramAdminHealth();
    const payload = {
      ok: true,
      conversation: projectInstagramConversationForAdmin(executed.result, {
        permissionGranted: health.permissionGranted,
        accountHealthy: health.replyEnabled,
      }),
      auditId: executed.auditId,
    };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
