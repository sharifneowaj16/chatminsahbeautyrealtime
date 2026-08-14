import prisma from '@/lib/prisma';
import { redactObservabilityData } from './redaction';

type HealthDb = {
  metaConnection: { findFirst(args: unknown): Promise<unknown> };
  metaIncident: { groupBy(args: unknown): Promise<unknown[]> };
  metaCatalogBatch: { findFirst(args: unknown): Promise<unknown> };
  metaJobAudit: { count(args: unknown): Promise<number> };
  metaCatalogDiagnostic: { count(args: unknown): Promise<number> };
};
const db = prisma as unknown as HealthDb;

export async function getMetaAggregateHealth() {
  const now = new Date();
  const stuckBefore = new Date(now.getTime() - 30 * 60_000);
  const [connection, incidents, oldestPendingBatch, queueBacklog, activeDiagnostics] = await Promise.all([
    db.metaConnection.findFirst({ orderBy: { updatedAt: 'desc' }, select: { status: true, lastCheckedAt: true, lastSuccessfulAt: true, graphApiVersion: true, warnings: true } }),
    db.metaIncident.groupBy({ by: ['severity', 'status'], where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } }, _count: { _all: true } }),
    db.metaCatalogBatch.findFirst({ where: { status: 'SUBMITTED', submittedAt: { lt: stuckBefore } }, orderBy: { submittedAt: 'asc' }, select: { handle: true, catalogId: true, submittedAt: true, correlationId: true } }),
    db.metaJobAudit.count({ where: { status: { in: ['QUEUED', 'RUNNING', 'RETRYING'] } } }),
    db.metaCatalogDiagnostic.count({ where: { status: 'ACTIVE' } }),
  ]);
  const incidentRows = incidents as Array<{ severity: string; status: string; _count: { _all: number } }>;
  const connectionRow = connection as { status?: string; lastCheckedAt?: Date | null; lastSuccessfulAt?: Date | null; graphApiVersion?: string; warnings?: unknown } | null;
  const critical = incidentRows.filter((row) => row.severity === 'CRITICAL').reduce((sum, row) => sum + row._count._all, 0);
  const errors = incidentRows.filter((row) => row.severity === 'ERROR').reduce((sum, row) => sum + row._count._all, 0);
  const status = critical > 0 || connectionRow?.status === 'INVALID_TOKEN' ? 'CRITICAL'
    : errors > 0 || oldestPendingBatch || connectionRow?.status === 'DEGRADED' ? 'DEGRADED' : 'HEALTHY';
  return redactObservabilityData({
    status,
    checkedAt: now,
    connection: connectionRow ?? { status: 'UNCONFIGURED' },
    incidents: incidentRows,
    catalog: { activeDiagnostics, oldestStuckBatch: oldestPendingBatch ?? null },
    queues: { backlog: queueBacklog },
  });
}
