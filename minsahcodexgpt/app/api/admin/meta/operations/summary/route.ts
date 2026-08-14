import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { describeMetaProviderState } from '@/lib/meta/admin/status';
import { assertMetaAdminSafeDto, metaAdminNoStoreHeaders, projectMetaAdminFailure, safeMetaAdminCode, safeMetaAdminText } from '@/lib/meta-platform/admin/contracts';

export const dynamic = 'force-dynamic';

type StatusCountRow = { status: string; _count: { _all: number } };
type FailedEventRow = { id: string; eventName: string; eventId: string; orderId: string | null; status: string; attempts: number; lastError: unknown; updatedAt: Date };
type FailedJobRow = { id: string; queueName: string; jobName: string; externalJobId: string | null; status: string; attempts: number; lastError: unknown; updatedAt: Date };
type RecentAuditRow = { id: string; actionKey: string; risk: string; resourceType: string; resourceId: string | null; outcome: string; reason: string | null; createdAt: Date; actor: { id: string; name: string } };
type ConnectionRow = { id: string; name: string; status: string; graphApiVersion: string; tokenExpiresAt: Date | null; dataAccessExpiresAt: Date | null; lastCheckedAt: Date | null; lastSuccessfulAt: Date | null; warnings: unknown; lastError: unknown; updatedAt: Date };
type QueryDelegate = { groupBy?(args: unknown): Promise<unknown>; findFirst?(args: unknown): Promise<unknown>; findMany?(args: unknown): Promise<unknown>; count?(args: unknown): Promise<number> };
type MetaOpsDb = {
  metaCatalogSyncItem: Required<Pick<QueryDelegate, 'groupBy'>>; metaCatalogBatch: Required<Pick<QueryDelegate, 'groupBy'>>;
  metaEventOutbox: Required<Pick<QueryDelegate, 'groupBy' | 'findMany'>>; metaJobAudit: Required<Pick<QueryDelegate, 'groupBy' | 'findMany'>>;
  metaLead: Required<Pick<QueryDelegate, 'groupBy' | 'count'>>; metaAdminApproval: Required<Pick<QueryDelegate, 'groupBy'>>;
  metaConnection: Required<Pick<QueryDelegate, 'findFirst'>>; metaAdminAudit: Required<Pick<QueryDelegate, 'findMany'>>;
  order: Required<Pick<QueryDelegate, 'count'>>;
};
const metaOpsDb = prisma as unknown as MetaOpsDb;

function countsByStatus(rows: Array<{ status: string; _count: { _all: number } }>) {
  return Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
}

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW, {
    message: 'Meta Operations Center access is restricted.',
  });
  if (response) return response;

  const overdueBefore = new Date(Date.now() - 15 * 60_000);
  const attributionSince = new Date(Date.now() - 30 * 24 * 60 * 60_000);
  const [
    catalogItems,
    catalogBatches,
    events,
    jobs,
    leads,
    approvals,
    connection,
    overdueLeads,
    recentFailedEvents,
    recentFailedJobs,
    recentAudits,
    attributedOrders,
    totalOrders,
  ] = await Promise.all([
    metaOpsDb.metaCatalogSyncItem.groupBy({ by: ['status'], _count: { _all: true } }),
    metaOpsDb.metaCatalogBatch.groupBy({ by: ['status'], _count: { _all: true } }),
    metaOpsDb.metaEventOutbox.groupBy({ by: ['status'], _count: { _all: true } }),
    metaOpsDb.metaJobAudit.groupBy({ by: ['status'], _count: { _all: true } }),
    metaOpsDb.metaLead.groupBy({ by: ['status'], _count: { _all: true } }),
    metaOpsDb.metaAdminApproval.groupBy({ by: ['status'], _count: { _all: true } }),
    metaOpsDb.metaConnection.findFirst({ orderBy: { updatedAt: 'desc' }, select: { id: true, name: true, status: true, graphApiVersion: true, tokenExpiresAt: true, dataAccessExpiresAt: true, lastCheckedAt: true, lastSuccessfulAt: true, warnings: true, lastError: true, updatedAt: true } }),
    metaOpsDb.metaLead.count({ where: { status: 'NEW', contactedAt: null, receivedAt: { lt: overdueBefore } } }),
    metaOpsDb.metaEventOutbox.findMany({ where: { status: 'FAILED_PERMANENT' }, orderBy: { updatedAt: 'desc' }, take: 8, select: { id: true, eventName: true, eventId: true, orderId: true, status: true, attempts: true, lastError: true, updatedAt: true } }),
    metaOpsDb.metaJobAudit.findMany({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } }, orderBy: { updatedAt: 'desc' }, take: 8, select: { id: true, queueName: true, jobName: true, externalJobId: true, status: true, attempts: true, lastError: true, updatedAt: true } }),
    metaOpsDb.metaAdminAudit.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, actionKey: true, risk: true, resourceType: true, resourceId: true, outcome: true, reason: true, createdAt: true, actor: { select: { id: true, name: true } } } }),
    metaOpsDb.order.count({ where: { createdAt: { gte: attributionSince }, OR: [{ utmSource: { not: null } }, { campaignId: { not: null } }, { fbc: { not: null } }] } }),
    metaOpsDb.order.count({ where: { createdAt: { gte: attributionSince } } }),
  ]);

  const catalogItemRows = catalogItems as StatusCountRow[];
  const catalogBatchRows = catalogBatches as StatusCountRow[];
  const eventRows = events as StatusCountRow[];
  const jobRows = jobs as StatusCountRow[];
  const leadRows = leads as StatusCountRow[];
  const approvalRows = approvals as StatusCountRow[];
  const failedEventRows = recentFailedEvents as FailedEventRow[];
  const failedJobRows = recentFailedJobs as FailedJobRow[];
  const auditRows = recentAudits as RecentAuditRow[];

  const connectionRow = connection as ConnectionRow | null;
  const connectionState = connectionRow ? describeMetaProviderState(connectionRow.status) : null;
  const payload = {
    ok: true,
    checkedAt: new Date().toISOString(),
    health: {
      connection: connectionState?.status ?? 'UNCONFIGURED',
      openApprovals: approvalRows.find((row) => row.status === 'PENDING')?._count._all ?? 0,
      failedCatalogItems: catalogItemRows.find((row) => row.status === 'FAILED')?._count._all ?? 0,
      failedEvents: eventRows.find((row) => row.status === 'FAILED_PERMANENT')?._count._all ?? 0,
      deadLetterJobs: jobRows.find((row) => row.status === 'DEAD_LETTER')?._count._all ?? 0,
      overdueLeads,
    },
    domains: {
      catalog: { items: countsByStatus(catalogItemRows), batches: countsByStatus(catalogBatchRows) },
      events: countsByStatus(eventRows),
      jobs: countsByStatus(jobRows),
      leads: countsByStatus(leadRows),
      approvals: countsByStatus(approvalRows),
      attribution: { windowDays: 30, attributedOrders, totalOrders, coverage: totalOrders > 0 ? attributedOrders / totalOrders : null },
    },
    connection: connectionRow ? {
      id: connectionRow.id,
      name: connectionRow.name,
      status: connectionRow.status,
      graphApiVersion: connectionRow.graphApiVersion,
      tokenExpiresAt: connectionRow.tokenExpiresAt?.toISOString() ?? null,
      dataAccessExpiresAt: connectionRow.dataAccessExpiresAt?.toISOString() ?? null,
      lastCheckedAt: connectionRow.lastCheckedAt?.toISOString() ?? null,
      lastSuccessfulAt: connectionRow.lastSuccessfulAt?.toISOString() ?? null,
      updatedAt: connectionRow.updatedAt.toISOString(),
      state: connectionState,
      warningCodes: Array.isArray(connectionRow.warnings)
        ? connectionRow.warnings.slice(0, 20).map((warning) => safeMetaAdminCode(typeof warning === 'string' ? warning : 'PROVIDER_WARNING', 'PROVIDER_WARNING'))
        : [],
      failure: projectMetaAdminFailure(connectionRow.lastError),
    } : null,
    failures: {
      events: failedEventRows.map((item) => ({
        id: item.id, eventName: item.eventName, eventId: item.eventId, orderId: item.orderId, status: item.status, attempts: item.attempts,
        updatedAt: item.updatedAt.toISOString(), state: describeMetaProviderState(item.status), failure: projectMetaAdminFailure(item.lastError),
      })),
      jobs: failedJobRows.map((item) => ({
        id: item.id, queueName: item.queueName, jobName: item.jobName, externalJobId: item.externalJobId, status: item.status, attempts: item.attempts,
        updatedAt: item.updatedAt.toISOString(), state: describeMetaProviderState(item.status), failure: projectMetaAdminFailure(item.lastError),
      })),
    },
    recentAudits: auditRows.map((item) => ({
      id: item.id, actionKey: safeMetaAdminCode(item.actionKey, 'META_ADMIN_ACTION'), risk: safeMetaAdminCode(item.risk, 'UNKNOWN'),
      resourceType: safeMetaAdminCode(item.resourceType, 'UNKNOWN'), resourceId: item.resourceId, outcome: safeMetaAdminCode(item.outcome, 'UNKNOWN'),
      reason: safeMetaAdminText(item.reason, 240), createdAt: item.createdAt.toISOString(), actor: { id: item.actor.id, name: safeMetaAdminText(item.actor.name, 120) },
    })),
  };
  assertMetaAdminSafeDto(payload);
  return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
}
