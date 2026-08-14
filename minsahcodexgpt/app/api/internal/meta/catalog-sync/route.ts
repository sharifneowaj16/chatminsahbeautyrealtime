import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { metaErrorResponse } from '@/app/api/admin/meta/_shared/response';
import { getMetaBusinessPreferences } from '@/lib/meta-business/preferences';
import { enqueueMetaCatalogSyncJob } from '@/lib/jobs/queues';
import { buildCatalogIncrementalIdempotencyKey, buildCatalogInventoryIdempotencyKey } from '@/lib/jobs/idempotency';

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
    const preferences = await getMetaBusinessPreferences();
    if (!preferences.catalogSyncEnabled) return NextResponse.json({ accepted: false, skipped: true, reason: 'CATALOG_SYNC_DISABLED' });
    const inventoryOnlyParam = request.nextUrl.searchParams.get('inventoryOnly');
    const inventoryOnly = inventoryOnlyParam === null ? preferences.catalogSyncInventoryOnly : inventoryOnlyParam === 'true';
    const catalogId = process.env.META_CATALOG_ID?.trim() || undefined;
    const now = new Date();
    const job = await enqueueMetaCatalogSyncJob({
      catalogId,
      mode: inventoryOnly ? 'inventory' : 'incremental',
      idempotencyKey: inventoryOnly
        ? buildCatalogInventoryIdempotencyKey(catalogId, now)
        : buildCatalogIncrementalIdempotencyKey(catalogId, now),
      requestedBy: 'internal-cron',
    });
    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    return metaErrorResponse(error);
  }
}
