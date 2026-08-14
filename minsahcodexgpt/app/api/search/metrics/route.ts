import { NextRequest, NextResponse } from 'next/server';
import { searchMetrics } from '@/lib/elasticsearch/metrics';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(
    request,
    ADMIN_PERMISSIONS.ANALYTICS_VIEW,
    { message: 'Search metrics are restricted to admin users with analytics access.' }
  );
  if (response) return response;

  try {
    const summary = searchMetrics.getSummary();
    const noResultQueries = searchMetrics.getZeroResultQueries();

    return NextResponse.json({
      success: true,
      metrics: {
        overview: summary,
        slowQueries: summary.slowQueries.slice(0, 10),
        noResultQueries: noResultQueries.slice(0, 10),
      },
      timestamp: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (error) {
    console.error('Metrics error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
