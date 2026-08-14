import type { Prisma } from '@/generated/prisma/client';
/**
 * Phase 23 search click integrity helpers.
 *
 * Security goals:
 * - public clients may record clicks, but they cannot create conversions/revenue;
 * - clicks must be rate-limited, tied to hashed device/session identifiers, and deduped;
 * - product IDs must refer to active, non-deleted products;
 * - query/result context must be sane before it can affect CTR metrics.
 */
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRateLimit } from '@/lib/cache/redis';
import { ACTIVE_PRODUCT_PRISMA_WHERE } from '@/lib/search/activeProductFilter';
import { trackSearchClick } from '@/lib/elasticsearch/trending';
import { trackQueryClick } from '@/lib/elasticsearch/searchAnalytics';

const DEVICE_COOKIE = 'mc_search_device';
const SESSION_COOKIE = 'mc_search_session';
const DEVICE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const SESSION_MAX_AGE_SECONDS = 60 * 30;
const CLICK_DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const MAX_QUERY_LENGTH = 120;
const MAX_RESULT_COUNT = 10_000;
const MAX_FILTERS = 20;
const MAX_FILTER_LENGTH = 120;

export interface PublicClickTrackingPayload {
  query?: unknown;
  productId?: unknown;
  productName?: unknown;
  position?: unknown;
  resultCount?: unknown;
  filters?: unknown;
  category?: unknown;
  price?: unknown;
  score?: unknown;
}

export type SanitizedClickPayload = {
  query: string;
  productId: string;
  productName: string | null;
  position: number;
  resultCount: number;
  filters: string[];
  category: string | null;
  price: number | null;
  score: number | null;
};

type TrackingIdentity = {
  ipHash: string;
  deviceIdHash: string;
  sessionIdHash: string;
  setDeviceCookie?: string;
  setSessionCookie?: string;
};

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeHeaderIp(value: string | null): string | null {
  if (!value) return null;
  return value.split(',')[0]?.trim() || null;
}

export function getClientIp(request: NextRequest): string {
  return (
    normalizeHeaderIp(request.headers.get('cf-connecting-ip')) ||
    normalizeHeaderIp(request.headers.get('x-real-ip')) ||
    normalizeHeaderIp(request.headers.get('x-forwarded-for')) ||
    'unknown'
  );
}

function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent')?.slice(0, 500) || 'unknown';
}

function sanitizeOptionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeFilters(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_FILTERS)
    .map((item) => item.slice(0, MAX_FILTER_LENGTH));
}

export function sanitizeClickPayload(payload: PublicClickTrackingPayload):
  | { ok: true; value: SanitizedClickPayload }
  | { ok: false; error: string; status: number } {
  const query = sanitizeOptionalString(payload.query, MAX_QUERY_LENGTH)?.toLowerCase() ?? '';
  const productId = sanitizeOptionalString(payload.productId, 128) ?? '';
  const productName = sanitizeOptionalString(payload.productName, 180);
  const category = sanitizeOptionalString(payload.category, 120);
  const position = normalizeNumeric(payload.position);
  const resultCount = normalizeNumeric(payload.resultCount);
  const price = normalizeNumeric(payload.price);
  const score = normalizeNumeric(payload.score);
  const filters = normalizeFilters(payload.filters);

  if (!query || !productId || position == null || resultCount == null) {
    return {
      ok: false,
      error: 'Missing required fields: query, productId, position, resultCount',
      status: 400,
    };
  }

  if (query.length < 1 || query.length > MAX_QUERY_LENGTH) {
    return { ok: false, error: 'Invalid query length', status: 400 };
  }

  if (position < 1 || !Number.isInteger(position)) {
    return { ok: false, error: 'Invalid click position. Position must start at 1.', status: 400 };
  }

  if (resultCount < 1 || resultCount > MAX_RESULT_COUNT || !Number.isInteger(resultCount)) {
    return { ok: false, error: 'Invalid resultCount', status: 400 };
  }

  if (position > resultCount) {
    return { ok: false, error: 'Invalid click context: position cannot exceed resultCount', status: 400 };
  }

  if (price != null && price < 0) {
    return { ok: false, error: 'Invalid price', status: 400 };
  }

  return {
    ok: true,
    value: {
      query,
      productId,
      productName,
      position,
      resultCount,
      filters,
      category,
      price,
      score,
    },
  };
}

export function buildTrackingIdentity(request: NextRequest): TrackingIdentity {
  const ip = getClientIp(request);
  const ua = getUserAgent(request);
  const ipHash = hashValue(ip);
  const fingerprintFallback = `fp:${hashValue(`${ip}|${ua}`)}`;
  const sessionBucket = Math.floor(Date.now() / (SESSION_MAX_AGE_SECONDS * 1000));
  const sessionFallback = `sess:${hashValue(`${ip}|${ua}|${sessionBucket}`)}`;

  const existingDevice = request.cookies.get(DEVICE_COOKIE)?.value;
  const existingSession = request.cookies.get(SESSION_COOKIE)?.value;
  const rawDevice = existingDevice || fingerprintFallback;
  const rawSession = existingSession || sessionFallback;

  const newDevice = existingDevice ? undefined : rawDevice;
  const newSession = existingSession ? undefined : rawSession;

  return {
    ipHash,
    deviceIdHash: hashValue(rawDevice),
    sessionIdHash: hashValue(rawSession),
    setDeviceCookie: newDevice,
    setSessionCookie: newSession,
  };
}

export function attachTrackingCookies(response: NextResponse, identity: TrackingIdentity): void {
  const secure = process.env.NODE_ENV === 'production';
  if (identity.setDeviceCookie) {
    response.cookies.set(DEVICE_COOKIE, identity.setDeviceCookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: DEVICE_MAX_AGE_SECONDS,
    });
  }
  if (identity.setSessionCookie) {
    response.cookies.set(SESSION_COOKIE, identity.setSessionCookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  }
}

export async function enforceClickRateLimits(identity: TrackingIdentity): Promise<
  | { ok: true }
  | { ok: false; status: number; error: string; retryAfter: number }
> {
  const checks = [
    await checkRateLimit(`search-click:ip:${identity.ipHash}`, 60, 60),
    await checkRateLimit(`search-click:device:${identity.deviceIdHash}`, 40, 60),
    await checkRateLimit(`search-click:session:${identity.sessionIdHash}`, 25, 60),
  ];

  const blocked = checks.find((item) => !item.allowed);
  if (!blocked) return { ok: true };

  return {
    ok: false,
    status: 429,
    error: 'Too many search click events. Please try again later.',
    retryAfter: blocked.resetIn,
  };
}

export async function findActiveClickableProduct(productId: string) {
  return prisma.product.findFirst({
    where: {
      id: productId,
      ...ACTIVE_PRODUCT_PRISMA_WHERE,
    },
    select: {
      id: true,
      sku: true,
      name: true,
      price: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
  });
}

export async function isDuplicateClick(input: {
  query: string;
  productId: string;
  userId: string | null;
  deviceIdHash: string;
  sessionIdHash: string;
}): Promise<boolean> {
  const since = new Date(Date.now() - CLICK_DEDUPE_WINDOW_MS);
  const identityClauses: Prisma.SearchClickEventWhereInput[] = [
    ...(input.userId ? [{ userId: input.userId }] : []),
    { deviceId: input.deviceIdHash },
    { sessionId: input.sessionIdHash },
  ];

  const existing = await prisma.searchClickEvent.findFirst({
    where: {
      query: input.query,
      productId: input.productId,
      clickedAt: { gte: since },
      OR: identityClauses,
    },
    select: { id: true },
  });

  return Boolean(existing);
}

export async function recordValidatedSearchClick(input: {
  click: SanitizedClickPayload;
  userId: string | null;
  identity: TrackingIdentity;
}): Promise<void> {
  const now = new Date();
  const filters = input.click.filters.length ? JSON.stringify(input.click.filters) : null;

  await prisma.searchClickEvent.create({
    data: {
      query: input.click.query,
      productId: input.click.productId,
      position: input.click.position,
      resultCount: input.click.resultCount,
      filters,
      category: input.click.category,
      price: input.click.price,
      score: input.click.score,
      userId: input.userId,
      deviceId: input.identity.deviceIdHash,
      sessionId: input.identity.sessionIdHash,
      clickedAt: now,
    },
  });

  const existingMetric = await prisma.searchClickMetrics.findUnique({
    where: {
      query_productId: {
        query: input.click.query,
        productId: input.click.productId,
      },
    },
    select: { clicks: true, avgPosition: true },
  });

  const nextClicks = (existingMetric?.clicks ?? 0) + 1;
  const nextAvgPosition = existingMetric
    ? ((existingMetric.avgPosition * existingMetric.clicks) + input.click.position) / nextClicks
    : input.click.position;

  await prisma.searchClickMetrics.upsert({
    where: {
      query_productId: {
        query: input.click.query,
        productId: input.click.productId,
      },
    },
    create: {
      query: input.click.query,
      productId: input.click.productId,
      avgPosition: input.click.position,
      clicks: 1,
      conversions: 0,
      revenue: 0,
      resultCount: input.click.resultCount,
      lastClicked: now,
    },
    update: {
      clicks: { increment: 1 },
      avgPosition: nextAvgPosition,
      resultCount: input.click.resultCount,
      lastClicked: now,
    },
  });

  // Phase 25: persist validated click intelligence in Redis for multi-instance
  // trending suggestions. Only call this after Phase 23 validation/dedupe passed.
  await Promise.all([
    trackSearchClick(input.click.query, input.click.productId),
    trackQueryClick(input.click.query),
  ]);
}
