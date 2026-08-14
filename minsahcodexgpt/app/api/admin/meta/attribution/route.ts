import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import prisma from '@/lib/prisma';
import { getAttributionReport } from '@/lib/attribution/reports';
import type { AttributionDb } from '@/lib/attribution/repository';
import { setMetaGauge } from '@/lib/observability/metrics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try {
    const windowDays = Number(request.nextUrl.searchParams.get('windowDays') ?? 30);
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 50);
    const report = await getAttributionReport(prisma as unknown as AttributionDb, { windowDays, limit });
    setMetaGauge('meta_attribution_order_coverage_ratio', { window: `${report.windowDays}d` }, report.coverage.coverage ?? 0);
    return NextResponse.json({ ok: true, ...report });
  } catch {
    return NextResponse.json({ ok: false, error: 'Attribution report unavailable' }, { status: 500 });
  }
}
