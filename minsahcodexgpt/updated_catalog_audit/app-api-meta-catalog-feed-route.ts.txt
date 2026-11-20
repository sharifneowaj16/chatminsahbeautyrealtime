import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { buildCatalogCsv } from '@/lib/meta-business/catalog';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';
import { cacheGetOrSet } from '@/lib/cache/redis';

export const dynamic = 'force-dynamic';

const CATALOG_FEED_CACHE_KEY = 'meta:catalog:feed:csv';
const CATALOG_FEED_CACHE_TTL = 1800; // 30 minutes

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function GET(request: NextRequest) {
  const config = getMetaBusinessConfig();
  const token = request.nextUrl.searchParams.get('token') ?? '';
  if (!config.catalogFeedToken || !safeEqual(token, config.catalogFeedToken)) {
    return NextResponse.json({ error: 'Invalid catalog feed token' }, { status: 401 });
  }
  const refresh = request.nextUrl.searchParams.get('refresh') === 'true';
  const csv = refresh
    ? await buildCatalogCsv()
    : await cacheGetOrSet(CATALOG_FEED_CACHE_KEY, () => buildCatalogCsv(), CATALOG_FEED_CACHE_TTL);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'inline; filename="minsah-meta-catalog.csv"',
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}
