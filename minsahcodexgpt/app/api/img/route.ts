// app/api/img/route.ts
//
// MinIO image proxy — cache headers যোগ করে serve করে।
// Usage: <Image src="/api/img?url=https://minio.minsahbeauty.cloud/..." />
//
// কিন্তু আরও ভালো উপায়: Next.js <Image> component সরাসরি MinIO URL
// দিলে /_next/image দিয়ে automatically optimize হয়। এই route শুধু
// সেই ক্ষেত্রে দরকার যেখানে <img> tag ব্যবহার করতেই হচ্ছে।

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// 1 year — immutable product images
const CACHE_TTL = 60 * 60 * 24 * 365;

// Allowed hostnames — security: যে কোনো URL proxy করলে SSRF vulnerability
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

  // Security: শুধু allowed hosts থেকে proxy করব
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return new NextResponse('Forbidden host', { status: 403 });
  }

  try {
    const upstream = await fetch(imageUrl, {
      // Next.js server-এ 1 minute cache — upstream থেকে বারবার fetch না করতে
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
        // এই header browser এবং Traefik দুটোই দেখবে
        'Cache-Control': `public, max-age=${CACHE_TTL}, immutable`,
        // CDN/Traefik-এর জন্য
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
