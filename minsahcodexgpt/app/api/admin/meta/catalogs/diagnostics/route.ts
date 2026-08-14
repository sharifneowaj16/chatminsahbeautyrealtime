import { NextRequest } from 'next/server';
import { requireAdminPermission, requireSuperAdmin } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { GET as getDiagnostics, POST as importDiagnostics } from '@/app/api/admin/meta/diagnostics/route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  return getDiagnostics(request);
}

export async function POST(request: NextRequest) {
  const { response } = await requireSuperAdmin(request);
  if (response) return response;
  return importDiagnostics(request);
}
