import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { getMetaProviderAdminHealth } from '@/lib/meta-platform/admin/provider-health';
import { assertMetaAdminSafeDto, metaAdminNoStoreHeaders } from '@/lib/meta-platform/admin';
import { metaAdminActionErrorResponse } from '@/app/api/admin/meta/_shared/response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try {
    const health = await getMetaProviderAdminHealth();
    const payload = { ok: true, health };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
