import { NextRequest, NextResponse } from 'next/server';
import { requireAdminMutationPermission, requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import {
  assertMetaAdminSafeDto,
  getAdminInboxConversation,
  getAdminInboxUnreadCount,
  listAdminInboxConversations,
  markAdminInboxRead,
  metaAdminNoStoreHeaders,
} from '@/lib/meta-platform/admin';
import { createAndPublishSocialRealtimeEvent } from '@/lib/meta-platform/realtime/social-events';

export const dynamic = 'force-dynamic';

function errorResponse(error: unknown) {
  const status = typeof (error as { status?: unknown })?.status === 'number'
    ? Number((error as { status: number }).status)
    : 500;
  const code = typeof (error as { code?: unknown })?.code === 'string'
    ? String((error as { code: string }).code)
    : status >= 500 ? 'META_ADMIN_INBOX_READ_FAILED' : 'META_ADMIN_INBOX_REQUEST_INVALID';
  return NextResponse.json(
    { ok: false, error: code },
    { status, headers: metaAdminNoStoreHeaders() },
  );
}

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_SOCIAL_VIEW);
  if (response) return response;
  try {
    const q = request.nextUrl.searchParams;
    const platform = q.get('platform') ?? 'facebook';
    if (q.get('mode') === 'unread_count') {
      const dto = { ok: true, unreadCount: await getAdminInboxUnreadCount({ platform }) };
      assertMetaAdminSafeDto(dto);
      return NextResponse.json(dto, { headers: metaAdminNoStoreHeaders() });
    }
    if (q.get('mode') === 'conversations') {
      const dto = {
        ok: true,
        ...(await listAdminInboxConversations({
          platform,
          unreadOnly: q.get('unread') === 'true',
          limit: q.get('conversationLimit'),
          cursor: q.get('conversationCursor'),
          query: q.get('q'),
        })),
      };
      assertMetaAdminSafeDto(dto);
      return NextResponse.json(dto, { headers: metaAdminNoStoreHeaders() });
    }
    const conversationId = q.get('conversationId');
    if (conversationId) {
      const dto = {
        ok: true,
        ...(await getAdminInboxConversation({
          conversationId,
          platform,
          unreadOnly: q.get('unread') === 'true',
          limit: q.get('messageLimit') ?? q.get('limit'),
          cursor: q.get('messageCursor'),
          includeUnreadSummary: q.get('unreadSummary') === 'true',
        })),
      };
      assertMetaAdminSafeDto(dto);
      return NextResponse.json(dto, { headers: metaAdminNoStoreHeaders() });
    }
    const dto = {
      ok: true,
      ...(await listAdminInboxConversations({
        platform,
        unreadOnly: q.get('unread') === 'true',
        limit: q.get('conversationLimit') ?? q.get('limit'),
        cursor: q.get('conversationCursor'),
        query: q.get('q'),
      })),
    };
    assertMetaAdminSafeDto(dto);
    return NextResponse.json(dto, { headers: metaAdminNoStoreHeaders() });
  } catch (error) {
    console.error('[admin/inbox/messages] GET failed', error);
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const { admin, response } = await requireAdminMutationPermission(request, ADMIN_PERMISSIONS.META_SOCIAL_OPERATE);
  if (response) return response;
  try {
    const body = await request.json() as {
      id?: unknown;
      conversationId?: unknown;
      platform?: unknown;
      markAll?: unknown;
    };
    const result = await markAdminInboxRead({
      id: body.id,
      conversationId: body.conversationId,
      platform: body.platform,
      markAll: body.markAll === true,
    });
    const eventPlatform = result.platform === 'instagram' ? 'instagram' : 'facebook';
    await createAndPublishSocialRealtimeEvent({
      type: 'SOCIAL_CONVERSATION_READ',
      platform: eventPlatform,
      correlationId: `admin-inbox-read:${admin.adminId}:${Date.now()}`,
      orderingKey: result.conversationId ?? `admin-inbox-read:${eventPlatform}:all`,
      conversationId: result.conversationId,
      messageId: result.messageId,
      state: body.markAll === true ? 'ALL_READ' : 'READ',
    }).catch((error) => console.error('[admin/inbox/messages] realtime publish failed', error));
    return NextResponse.json({ ok: true, success: true, updated: result.updated }, { headers: metaAdminNoStoreHeaders() });
  } catch (error) {
    console.error('[admin/inbox/messages] PATCH failed', error);
    return errorResponse(error);
  }
}
