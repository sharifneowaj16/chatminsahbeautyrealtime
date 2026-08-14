import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { metaAdminActionErrorResponse } from '@/app/api/admin/meta/_shared/response';
import { listInstagramConversationsSafe, type InstagramConversationStatus } from '@/lib/meta/instagram/conversations';
import { assertMetaAdminSafeDto, metaAdminNoStoreHeaders, parseMetaAdminLimit, requireMetaAdminOpaqueId } from '@/lib/meta-platform/admin';
import { getInstagramAdminHealth } from '@/lib/meta-platform/admin/instagram-status';

export const dynamic = 'force-dynamic';
const STATUSES = new Set<InstagramConversationStatus>(['OPEN', 'PENDING', 'RESOLVED', 'SPAM', 'ARCHIVED']);

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_SOCIAL_VIEW);
  if (response) return response;
  try {
    const rawStatus = request.nextUrl.searchParams.get('status')?.toUpperCase();
    const status = rawStatus && STATUSES.has(rawStatus as InstagramConversationStatus) ? rawStatus as InstagramConversationStatus : undefined;
    const limit = parseMetaAdminLimit(request.nextUrl.searchParams.get('limit'), 50, 100);
    const rawCursor = request.nextUrl.searchParams.get('cursor');
    const cursor = rawCursor ? requireMetaAdminOpaqueId(rawCursor, 'INSTAGRAM_CURSOR_INVALID') : undefined;
    const health = await getInstagramAdminHealth();
    const rows = await listInstagramConversationsSafe({
      status,
      assignedToId: request.nextUrl.searchParams.get('assignedToId')?.trim() || undefined,
      query: request.nextUrl.searchParams.get('q')?.trim() || undefined,
      cursor,
      limit: limit + 1,
    }, {
      permissionGranted: health.permissionGranted,
      accountHealthy: health.replyEnabled,
    });
    const hasMore = rows.length > limit;
    const conversations = rows.slice(0, limit);
    const payload = {
      ok: true,
      conversations,
      pageInfo: { limit, hasMore, nextCursor: hasMore ? conversations.at(-1)?.id ?? null : null },
    };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
