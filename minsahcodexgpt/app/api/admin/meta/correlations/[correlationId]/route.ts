import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { getMetaCorrelationTimeline } from '@/lib/observability/tracing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ correlationId: string }> }) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try {
    const { correlationId } = await context.params;
    return NextResponse.json({ ok: true, ...(await getMetaCorrelationTimeline(correlationId)) });
  } catch (error) {
    const invalid = error instanceof Error && error.message === 'META_CORRELATION_ID_INVALID';
    return NextResponse.json({ ok: false, error: invalid ? 'Invalid correlation ID' : 'Unable to load correlation timeline' }, { status: invalid ? 400 : 500 });
  }
}
