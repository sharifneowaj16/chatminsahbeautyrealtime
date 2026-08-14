import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { assertMetaAdminSafeDto, metaAdminNoStoreHeaders } from '@/lib/meta-platform/admin';
import { getInstagramAdminHealth } from '@/lib/meta-platform/admin/instagram-status';
import { metaAdminActionErrorResponse } from '@/app/api/admin/meta/_shared/response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_SOCIAL_VIEW);
  if (response) return response;
  try {
    const health = await getInstagramAdminHealth();
    const payload = { ok: true, health };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
  } catch (error) {
    return metaAdminActionErrorResponse(error);
  }
}
