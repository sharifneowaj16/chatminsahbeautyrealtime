// app/api/img/route.ts
//
// MinIO image proxy — serves images with cache headers.
// Usage: <Image src="/api/img?url=https://minio.minsahbeauty.cloud/..." />
//
// Recommended: Next.js <Image> component directly with MinIO URL
// automatically optimizes via /_next/image. This route is for raw <img> fallback.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// 1 year — immutable product images
const CACHE_TTL = 60 * 60 * 24 * 365;

// Allowed hostnames — security: prevent SSRF
const ALLOWED_HOSTS = new Set([
  'minio.minsahbeauty.cloud',
  'storage.minsahbeauty.cloud',
  'minsahbeauty.cloud',
]);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing url param', { status: 400 });
  }

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return new NextResponse('Invalid URL', { status: 400 });
  }

  // Security: only proxy allowed hosts
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return new NextResponse('Forbidden host', { status: 403 });
  }

  try {
    const upstream = await fetch(imageUrl, {
      // 1 minute cache in Next.js server to avoid duplicate upstream fetches
      next: { revalidate: 60 },
    });

    if (!upstream.ok) {
      return new NextResponse('Upstream error', { status: upstream.status });
    }

    const buffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        // Browser and Traefik cache header
        'Cache-Control': `public, max-age=${CACHE_TTL}, immutable`,
        // CDN / Traefik
        'Surrogate-Control': `max-age=${CACHE_TTL}`,
        // ETag — conditional request support
        'ETag': upstream.headers.get('etag') || `"${Date.now()}"`,
        // Vary header — content negotiation
        'Vary': 'Accept',
      },
    });
  } catch (err) {
    console.error('[img proxy] fetch error:', err);
    return new NextResponse('Proxy error', { status: 502 });
  }
}
