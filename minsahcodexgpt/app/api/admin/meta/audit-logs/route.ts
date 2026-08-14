import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { listMetaAdminAudits } from '@/lib/meta/admin/service';
import { redactMetaAdminData } from '@/lib/meta/admin/redaction';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_AUDIT, {
    message: 'Meta audit log access is restricted.',
  });
  if (response) return response;
  const audits = await listMetaAdminAudits({
    actionKey: request.nextUrl.searchParams.get('actionKey') || undefined,
    outcome: request.nextUrl.searchParams.get('outcome')?.toUpperCase() || undefined,
    limit: Number(request.nextUrl.searchParams.get('limit') ?? 50),
  });
  return NextResponse.json({
    ok: true,
    audits: audits.map((item) => ({
      ...item,
      beforeData: redactMetaAdminData(item.beforeData),
      afterData: redactMetaAdminData(item.afterData),
      errorData: redactMetaAdminData(item.errorData),
      createdAt: item.createdAt.toISOString(),
    })),
  });
}
