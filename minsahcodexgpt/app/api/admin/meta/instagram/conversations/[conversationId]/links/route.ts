import { NextRequest, NextResponse } from 'next/server';
import { requireAdminMutationPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { metaAdminActionErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { linkInstagramConversation, unlinkInstagramConversation, type InstagramConversationLinkType } from '@/lib/meta/instagram/conversations';
import { assertMetaAdminSafeDto, metaAdminNoStoreHeaders, requireMetaAdminOpaqueId, safeMetaAdminCode, toMetaAdminIso } from '@/lib/meta-platform/admin';

const TYPES = new Set(['CUSTOMER', 'LEAD', 'PRODUCT', 'ORDER']);
function linkType(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!TYPES.has(normalized)) throw Object.assign(new Error('INSTAGRAM_LINK_TYPE_INVALID'), { status: 400 });
  return normalized as InstagramConversationLinkType;
}
function safeLink(value: unknown) {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: requireMetaAdminOpaqueId(row.id, 'INSTAGRAM_LINK_ID_INVALID'),
    linkType: safeMetaAdminCode(row.linkType, 'UNKNOWN'),
    targetId: requireMetaAdminOpaqueId(row.targetId, 'INSTAGRAM_LINK_TARGET_ID_INVALID'),
    verificationMethod: safeMetaAdminCode(row.verificationMethod, 'UNKNOWN'),
    linkedAt: toMetaAdminIso(row.linkedAt),
  };
}
type Context = { params: Promise<{ conversationId: string }> };

export async function POST(request: NextRequest, context: Context) {
  const { admin, response } = await requireAdminMutationPermission(request, ADMIN_PERMISSIONS.META_SOCIAL_LINK);
  if (response) return response;
  try {
    const { conversationId: rawId } = await context.params;
    const conversationId = requireMetaAdminOpaqueId(rawId, 'INSTAGRAM_CONVERSATION_ID_INVALID');
    const body = await readJsonObject(request);
    const type = linkType(body.linkType);
    const targetId = requireMetaAdminOpaqueId(requiredString(body.targetId, 'targetId'), 'INSTAGRAM_LINK_TARGET_ID_INVALID');
    const verificationMethod = requiredString(body.verificationMethod, 'verificationMethod');
    const reason = typeof body.reason === 'string' ? body.reason.trim() : 'Verified Instagram CRM link';
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_INSTAGRAM_LINK', resourceType: 'META_CONVERSATION', resourceId: conversationId,
      payload: { conversationId, linkType: type, targetId, verificationMethod }, reason,
      run: () => linkInstagramConversation({ conversationId, linkType: type, targetId, verificationMethod, linkedById: admin.adminId }),
    });
    const payload = { ok: true, link: safeLink(executed.result), auditId: executed.auditId };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, { status: 201, headers: metaAdminNoStoreHeaders() });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function DELETE(request: NextRequest, context: Context) {
  const { admin, response } = await requireAdminMutationPermission(request, ADMIN_PERMISSIONS.META_SOCIAL_LINK);
  if (response) return response;
  try {
    const { conversationId: rawId } = await context.params;
    const conversationId = requireMetaAdminOpaqueId(rawId, 'INSTAGRAM_CONVERSATION_ID_INVALID');
    const body = await readJsonObject(request);
    const type = linkType(body.linkType);
    const targetId = requireMetaAdminOpaqueId(requiredString(body.targetId, 'targetId'), 'INSTAGRAM_LINK_TARGET_ID_INVALID');
    const reason = typeof body.reason === 'string' ? body.reason.trim() : 'Instagram CRM link removed';
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_INSTAGRAM_UNLINK', resourceType: 'META_CONVERSATION', resourceId: conversationId,
      payload: { conversationId, linkType: type, targetId }, reason,
      run: () => unlinkInstagramConversation({ conversationId, linkType: type, targetId }),
    });
    const payload = { ok: true, result: { removed: Number((executed.result as { count?: unknown }).count ?? 0) === 1 }, auditId: executed.auditId };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
