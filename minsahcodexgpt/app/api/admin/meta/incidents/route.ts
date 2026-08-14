import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { listMetaIncidents } from '@/lib/observability/incidents';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  const statusValue = request.nextUrl.searchParams.get('status')?.toUpperCase();
  const severityValue = request.nextUrl.searchParams.get('severity')?.toUpperCase();
  const status = statusValue && ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].includes(statusValue) ? statusValue as 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' : undefined;
  const severity = severityValue && ['INFO', 'WARNING', 'ERROR', 'CRITICAL'].includes(severityValue) ? severityValue as 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' : undefined;
  const limit = Math.max(1, Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 100) || 100, 250));
  const incidents = await listMetaIncidents({ status, severity, limit });
  return NextResponse.json({ ok: true, incidents });
}
