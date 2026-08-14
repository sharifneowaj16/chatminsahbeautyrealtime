import 'server-only';

import prisma from '@/lib/prisma';
import { decodeMetaAdminCursor, encodeMetaAdminCursor, parseMetaAdminLimit, safeMetaAdminCode } from './contracts';
import { getMetaAdminActionControls, projectMetaJobAuditForAdmin } from './jobs-dto';

type Delegate = { findMany(args: unknown): Promise<unknown>; groupBy(args: unknown): Promise<unknown> };
type Db = { metaJobAudit: Delegate };
const db = prisma as unknown as Db;

export async function listMetaAdminJobs(input: Readonly<{
  status?: string;
  queueName?: string;
  cursor?: string | null;
  limit?: number;
}>) {
  const limit = parseMetaAdminLimit(input.limit, 50, 100);
  const cursor = input.cursor ? decodeMetaAdminCursor(input.cursor) : null;
  if (input.cursor && !cursor) throw Object.assign(new Error('META_JOB_CURSOR_INVALID'), { status: 400, code: 'META_JOB_CURSOR_INVALID' });
  const where = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.queueName ? { queueName: input.queueName } : {}),
    ...(cursor ? { OR: [{ createdAt: { lt: new Date(cursor.at) } }, { createdAt: new Date(cursor.at), id: { lt: cursor.id } }] } : {}),
  };
  const [rowsValue, countsValue] = await Promise.all([
    db.metaJobAudit.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: {
        id: true, queueName: true, jobName: true, externalJobId: true, idempotencyKey: true, correlationId: true,
        status: true, attempts: true, maxAttempts: true, progress: true, sourceId: true, lastError: true,
        replayOfId: true, replayCount: true, requestedBy: true, nextRunAt: true, startedAt: true,
        completedAt: true, lastHeartbeatAt: true, createdAt: true, updatedAt: true,
      },
    }),
    db.metaJobAudit.groupBy({ by: ['queueName', 'status'], _count: { _all: true } }),
  ]);
  const controls = getMetaAdminActionControls();
  const rows = Array.isArray(rowsValue) ? rowsValue : [];
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const jobs = pageRows.map((row) => projectMetaJobAuditForAdmin(row, controls));
  const last = pageRows.at(-1) as Record<string, unknown> | undefined;
  const nextCursor = hasMore && last?.createdAt && last.id
    ? encodeMetaAdminCursor({ at: new Date(last.createdAt as string | number | Date).toISOString(), id: String(last.id) })
    : null;
  const counts: Record<string, Record<string, number>> = {};
  if (Array.isArray(countsValue)) for (const value of countsValue) {
    const row = value as { queueName?: unknown; status?: unknown; _count?: { _all?: unknown } };
    const queue = String(row.queueName ?? 'unknown');
    counts[queue] ??= {};
    counts[queue][safeMetaAdminCode(row.status, 'UNKNOWN')] = Number(row._count?._all ?? 0);
  }
  return Object.freeze({ jobs, counts, controls, pageInfo: Object.freeze({ limit, hasMore, nextCursor }) });
}
