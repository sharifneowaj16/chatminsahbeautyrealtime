import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { buildCatalogCsv } from '@/lib/meta-business/catalog';
import { getMetaBusinessConfig } from '@/lib/meta-business/config';

export const dynamic = 'force-dynamic';

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
  const csv = await buildCatalogCsv();
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'inline; filename="minsah-meta-catalog.csv"',
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}
