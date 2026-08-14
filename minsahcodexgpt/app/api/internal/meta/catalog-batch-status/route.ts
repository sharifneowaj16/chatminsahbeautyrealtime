import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { metaErrorResponse } from '@/app/api/admin/meta/_shared/response';
import { enqueueMetaCatalogStatusJob } from '@/lib/jobs/queues';
import { buildCatalogStatusIdempotencyKey } from '@/lib/jobs/idempotency';

export const dynamic = 'force-dynamic';
function safeEqual(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const configured = process.env.META_BUSINESS_CRON_SECRET?.trim() || process.env.INTERNAL_CRON_SECRET?.trim();
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? request.headers.get('x-internal-cron-secret') ?? '';
  if (!configured || !safeEqual(configured, supplied)) return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
  try {
    const catalogId = request.nextUrl.searchParams.get('catalogId') ?? (process.env.META_CATALOG_ID?.trim() || undefined);
    const limitValue = Number(request.nextUrl.searchParams.get('limit') ?? 25);
    const job = await enqueueMetaCatalogStatusJob({
      catalogId,
      limit: Number.isFinite(limitValue) ? limitValue : 25,
      idempotencyKey: buildCatalogStatusIdempotencyKey(catalogId, new Date()),
      requestedBy: 'internal-cron',
    });
    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    return metaErrorResponse(error);
  }
}
