import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { listMetaLeadWebhookFailures } from '@/lib/meta/leads/repository';
import { assertMetaAdminSafeDto, metaAdminNoStoreHeaders, parseMetaAdminLimit } from '@/lib/meta-platform/admin';
import { projectLegacyLeadWebhookFailureForAdmin } from '@/lib/meta-platform/admin/lead-status';
import { metaAdminActionErrorResponse } from '@/app/api/admin/meta/_shared/response';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try {
    const limit = parseMetaAdminLimit(request.nextUrl.searchParams.get('limit'), 50, 100);
    const data = (await listMetaLeadWebhookFailures(limit)).map(projectLegacyLeadWebhookFailureForAdmin);
    const payload = { ok: true, data };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
