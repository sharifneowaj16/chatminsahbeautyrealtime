import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';
import { requestFacebookInboxSyncProduction } from '@/lib/meta-platform/domains/facebook/legacy-bridge';

export async function POST(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_SOCIAL_OPERATE);
  if (response) return response;
  const body = await request.json().catch(() => ({})) as Readonly<Record<string, unknown>>;
  const configured = getMetaBusinessConfig();
  const pageId = typeof body.pageId === 'string' ? body.pageId.trim() : configured.pageId?.trim() ?? '';
  if (!pageId) return NextResponse.json({ error: 'META_PAGE_NOT_CONFIGURED' }, { status: 409 });
  try {
    const queued = await requestFacebookInboxSyncProduction({ pageId, actorId: admin.adminId });
    return NextResponse.json({
      ok: true,
      queued: queued.accepted,
      deduplicated: queued.deduplicated,
      requestId: queued.requestId,
      synced: 0,
      conversations: 0,
    }, { status: queued.accepted ? 202 : 503 });
  } catch (error) {
    const candidate = error as { code?: unknown };
    return NextResponse.json(
      { error: typeof candidate.code === 'string' ? candidate.code : 'META_FACEBOOK_INBOX_SYNC_REQUEST_FAILED' },
      { status: 400 },
    );
  }
}
