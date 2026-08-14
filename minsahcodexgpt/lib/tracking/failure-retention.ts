import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';

export type TrackingFailureCategory = 'DEBUG_NON_CRITICAL' | 'FINAL_RETRYABLE' | 'CRITICAL';

export type TrackingFailureRetentionConfig = {
  debugNonCriticalDays: number;
  finalRetryableDays: number;
  criticalDays: number;
  cleanupLimit: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parsePositiveIntEnv(name: string, fallback: number, min = 1, max = 3650) {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : fallback;
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function getTrackingFailureRetentionConfig(): TrackingFailureRetentionConfig {
  return {
    debugNonCriticalDays: parsePositiveIntEnv('TRACKING_FAILURE_DEBUG_RETENTION_DAYS', 30, 1, 365),
    finalRetryableDays: parsePositiveIntEnv('TRACKING_FAILURE_FINAL_RETENTION_DAYS', 90, 7, 730),
    criticalDays: parsePositiveIntEnv('TRACKING_FAILURE_CRITICAL_RETENTION_DAYS', 180, 30, 1095),
    cleanupLimit: parsePositiveIntEnv('TRACKING_FAILURE_CLEANUP_LIMIT', 1000, 1, 10_000),
  };
}

function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * DAY_MS);
}

export function isCriticalTrackingFailure(params: {
  provider?: string | null;
  statusCode?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}) {
  const provider = (params.provider ?? '').toUpperCase();
  const code = String(params.errorCode ?? '').toUpperCase();
  const message = String(params.errorMessage ?? '').toLowerCase();
  const statusCode = params.statusCode ?? null;

  if (code === 'META_ENV_MISSING' || code === 'GA4_ENV_MISSING' || code === 'TIKTOK_ENV_MISSING') return true;
  if (code.includes('TOKEN') || code.includes('PERMISSION') || code.includes('AUTH')) return true;
  if (code === '190' || code === 'OAUTH') return true;
  if (statusCode === 401 || statusCode === 403) return true;
  if (provider === 'META' && (message.includes('access token') || message.includes('invalid oauth') || message.includes('permission'))) return true;
  if (provider === 'GA4' && (message.includes('api secret') || message.includes('measurement id'))) return true;
  if (provider === 'TIKTOK' && (message.includes('access token') || message.includes('token') || message.includes('permission'))) return true;

  return false;
}

export function classifyTrackingFailure(params: {
  provider?: string | null;
  statusCode?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  finalFailed?: boolean | null;
}): TrackingFailureCategory {
  if (isCriticalTrackingFailure(params)) return 'CRITICAL';
  if (params.finalFailed) return 'FINAL_RETRYABLE';
  return 'DEBUG_NON_CRITICAL';
}

export function getTrackingFailureLogRetentionMetadata(params: {
  provider?: string | null;
  statusCode?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  finalFailed?: boolean | null;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const config = getTrackingFailureRetentionConfig();
  const failureCategory = classifyTrackingFailure(params);
  const days =
    failureCategory === 'CRITICAL'
      ? config.criticalDays
      : failureCategory === 'FINAL_RETRYABLE'
        ? config.finalRetryableDays
        : config.debugNonCriticalDays;

  return {
    failureCategory,
    cleanupAfter: addDays(now, days),
  };
}

function olderThan(now: Date, days: number) {
  return new Date(now.getTime() - days * DAY_MS);
}

function criticalFailureWhere(): Prisma.MetaCapiFailureWhereInput {
  return {
    OR: [
      { failureCategory: 'CRITICAL' },
      { errorCode: { in: ['META_ENV_MISSING', 'GA4_ENV_MISSING', 'TIKTOK_ENV_MISSING', '190'] } },
      { statusCode: { in: [401, 403] } },
      { errorCode: { contains: 'TOKEN', mode: 'insensitive' } },
      { errorCode: { contains: 'AUTH', mode: 'insensitive' } },
      { errorCode: { contains: 'PERMISSION', mode: 'insensitive' } },
      { errorMessage: { contains: 'access token', mode: 'insensitive' } },
      { errorMessage: { contains: 'invalid oauth', mode: 'insensitive' } },
      { errorMessage: { contains: 'permission', mode: 'insensitive' } },
      { errorMessage: { contains: 'api secret', mode: 'insensitive' } },
      { errorMessage: { contains: 'measurement id', mode: 'insensitive' } },
    ],
  };
}

export function buildTrackingFailureCleanupWhere(now = new Date()): Prisma.MetaCapiFailureWhereInput {
  const config = getTrackingFailureRetentionConfig();
  const debugCutoff = olderThan(now, config.debugNonCriticalDays);
  const finalCutoff = olderThan(now, config.finalRetryableDays);
  const criticalCutoff = olderThan(now, config.criticalDays);

  return {
    OR: [
      { cleanupAfter: { lte: now } },
      {
        AND: [
          { cleanupAfter: null },
          { finalFailed: false },
          { createdAt: { lt: debugCutoff } },
        ],
      },
      {
        AND: [
          { cleanupAfter: null },
          { createdAt: { lt: finalCutoff } },
          { finalFailed: true },
          { NOT: criticalFailureWhere() },
        ],
      },
      {
        AND: [
          { cleanupAfter: null },
          { createdAt: { lt: criticalCutoff } },
          criticalFailureWhere(),
        ],
      },
    ],
  };
}

export async function runTrackingFailureCleanup(options: {
  dryRun?: boolean;
  now?: Date;
  limit?: number;
} = {}) {
  const now = options.now ?? new Date();
  const config = getTrackingFailureRetentionConfig();
  const take = Math.min(Math.max(options.limit ?? config.cleanupLimit, 1), 10_000);
  const where = buildTrackingFailureCleanupWhere(now);

  const candidates = await prisma.metaCapiFailure.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take,
    select: {
      id: true,
      provider: true,
      eventName: true,
      orderId: true,
      errorCode: true,
      finalFailed: true,
      failureCategory: true,
      createdAt: true,
      cleanupAfter: true,
    },
  });

  const byCategory = candidates.reduce<Record<TrackingFailureCategory | 'UNKNOWN', number>>(
    (acc, row) => {
      const category = (row.failureCategory as TrackingFailureCategory | null) ?? 'UNKNOWN';
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    },
    { DEBUG_NON_CRITICAL: 0, FINAL_RETRYABLE: 0, CRITICAL: 0, UNKNOWN: 0 }
  );

  if (!options.dryRun && candidates.length) {
    await prisma.metaCapiFailure.deleteMany({
      where: { id: { in: candidates.map((row) => row.id) } },
    });
  }

  return {
    ok: true,
    dryRun: Boolean(options.dryRun),
    deletedCount: options.dryRun ? 0 : candidates.length,
    candidateCount: candidates.length,
    byCategory,
    retention: config,
    checkedAt: now.toISOString(),
    sample: candidates.slice(0, 25).map((row) => ({
      id: row.id,
      provider: row.provider,
      eventName: row.eventName,
      orderId: row.orderId,
      errorCode: row.errorCode,
      finalFailed: row.finalFailed,
      failureCategory: row.failureCategory,
      createdAt: row.createdAt.toISOString(),
      cleanupAfter: row.cleanupAfter?.toISOString() ?? null,
    })),
  };
}
