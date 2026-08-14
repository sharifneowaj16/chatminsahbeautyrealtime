import 'server-only';

import { randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import type { MetaFencedLockLease, MetaFencedLockManager } from './types';

export interface MetaFencedLockSqlExecutor {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
}

const PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,254}$/;
function clean(value: string, code: string): string {
  const normalized = value.trim();
  if (!PATTERN.test(normalized)) throw new TypeError(code);
  return normalized;
}
function hydrate(row: Record<string, unknown>): MetaFencedLockLease {
  const fencingToken = Number(row.fencingToken);
  if (!Number.isSafeInteger(fencingToken) || fencingToken < 1) throw new Error('META_FENCED_LOCK_TOKEN_UNSAFE');
  return Object.freeze({
    scopeKey: String(row.scopeKey), ownerId: String(row.ownerId), leaseToken: String(row.leaseToken), fencingToken,
    expiresAt: new Date(row.expiresAt as string | Date).toISOString(),
  });
}

export class PrismaMetaFencedLockManager implements MetaFencedLockManager {
  constructor(private readonly client: MetaFencedLockSqlExecutor = prisma as unknown as MetaFencedLockSqlExecutor) {}

  async acquire(input: { readonly scopeKey: string; readonly ownerId: string; readonly leaseMs?: number; readonly now?: Date }) {
    const ownerId = clean(input.ownerId, 'META_FENCED_LOCK_OWNER_INVALID');
    const leaseToken = `${ownerId}:${randomUUID()}`;
    const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(
      `INSERT INTO "MetaWorkflowLock" ("scopeKey", "ownerId", "leaseToken", "fencingToken", "expiresAt", "updatedAt")
       VALUES ($1, $2, $3, 1, NOW() + ($4 * INTERVAL '1 millisecond'), NOW())
       ON CONFLICT ("scopeKey") DO UPDATE
       SET "ownerId" = EXCLUDED."ownerId", "leaseToken" = EXCLUDED."leaseToken",
           "fencingToken" = "MetaWorkflowLock"."fencingToken" + 1,
           "expiresAt" = NOW() + ($4 * INTERVAL '1 millisecond'), "updatedAt" = NOW()
       WHERE "MetaWorkflowLock"."expiresAt" <= NOW()
       RETURNING *`,
      clean(input.scopeKey, 'META_FENCED_LOCK_SCOPE_INVALID'), ownerId, leaseToken,
      Math.max(1_000, input.leaseMs ?? 60_000),
    );
    return rows[0] ? hydrate(rows[0]) : null;
  }

  async renew(input: { readonly scopeKey: string; readonly leaseToken: string; readonly leaseMs?: number; readonly now?: Date }) {
    const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE "MetaWorkflowLock"
       SET "expiresAt" = NOW() + ($3 * INTERVAL '1 millisecond'), "updatedAt" = NOW()
       WHERE "scopeKey" = $1 AND "leaseToken" = $2 AND "expiresAt" > NOW()
       RETURNING *`,
      clean(input.scopeKey, 'META_FENCED_LOCK_SCOPE_INVALID'), input.leaseToken, Math.max(1_000, input.leaseMs ?? 60_000),
    );
    return rows[0] ? hydrate(rows[0]) : null;
  }

  async release(input: { readonly scopeKey: string; readonly leaseToken: string }) {
    return (await this.client.$executeRawUnsafe(
      `UPDATE "MetaWorkflowLock" SET "expiresAt" = NOW(), "updatedAt" = NOW()
       WHERE "scopeKey" = $1 AND "leaseToken" = $2 AND "expiresAt" > NOW()`,
      clean(input.scopeKey, 'META_FENCED_LOCK_SCOPE_INVALID'), input.leaseToken,
    )) === 1;
  }

  async inspect(scopeKey: string) {
    const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "MetaWorkflowLock" WHERE "scopeKey" = $1`, clean(scopeKey, 'META_FENCED_LOCK_SCOPE_INVALID'),
    );
    return rows[0] ? hydrate(rows[0]) : null;
  }
}

export function createPrismaMetaFencedLockManager(): PrismaMetaFencedLockManager {
  return new PrismaMetaFencedLockManager();
}
