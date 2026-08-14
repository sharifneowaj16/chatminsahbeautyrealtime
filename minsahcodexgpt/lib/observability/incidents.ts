import { createHash } from 'node:crypto';
import prisma from '@/lib/prisma';
import { redactObservabilityData } from './redaction';
import { setMetaGauge } from './metrics';

export type MetaIncidentType =
  | 'CATALOG_DIAGNOSTIC' | 'CATALOG_BATCH_STUCK' | 'CATALOG_FAILURE_SPIKE' | 'TOKEN_INVALID'
  | 'GRAPH_VERSION_EXPIRING' | 'CAPI_FAILURE_SPIKE' | 'PURCHASE_SILENCE' | 'WEBHOOK_SILENCE'
  | 'QUEUE_BACKLOG' | 'MASS_DELETE_CANDIDATE' | 'PRODUCT_SET_EMPTY' | 'PRODUCT_SET_BROKEN'
  | 'INSTAGRAM_PERMISSION_FAILURE' | 'INSTAGRAM_WEBHOOK_FAILURE' | 'INSTAGRAM_REPLY_FAILURE';
export type MetaIncidentSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type MetaIncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

type IncidentRecord = {
  id: string; incidentType: string; severity: string; status: string; dedupeKey: string; resourceType: string;
  resourceId: string | null; summary: string; details: unknown; correlationId: string | null; runbookUrl: string | null;
  occurrenceCount: number; firstSeenAt: Date; lastSeenAt: Date; cooldownUntil: Date | null; acknowledgedAt: Date | null;
  acknowledgedById: string | null; resolvedAt: Date | null; resolvedById: string | null; createdAt: Date; updatedAt: Date;
};
type Delegate = {
  upsert(args: unknown): Promise<IncidentRecord>;
  update(args: unknown): Promise<IncidentRecord>;
  findUnique(args: unknown): Promise<IncidentRecord | null>;
  findMany(args: unknown): Promise<IncidentRecord[]>;
  groupBy(args: unknown): Promise<Array<{ severity: string; incidentType: string; _count: { _all: number } }>>;
};
type QueryDelegate = { findFirst(args: unknown): Promise<unknown>; findMany(args: unknown): Promise<unknown[]>; count(args: unknown): Promise<number> };
type IncidentDb = {
  metaIncident: Delegate;
  metaCatalogBatch: QueryDelegate;
  metaCatalogSyncItem: QueryDelegate;
  metaConnection: QueryDelegate;
  metaEventOutbox: QueryDelegate;
  metaWebhookReceipt: QueryDelegate;
  metaJobAudit: QueryDelegate;
};
const db = prisma as unknown as IncidentDb;

export function buildMetaIncidentDedupeKey(input: {
  incidentType: MetaIncidentType;
  resourceType: string;
  resourceId?: string | null;
  at?: Date;
  timeWindowMinutes?: number;
}) {
  const at = input.at ?? new Date();
  const windowMs = Math.max(1, input.timeWindowMinutes ?? 60) * 60_000;
  const bucket = Math.floor(at.getTime() / windowMs);
  return createHash('sha256').update([
    input.incidentType, input.resourceType, input.resourceId ?? 'global', String(bucket),
  ].join('|')).digest('hex');
}

export async function openOrRefreshMetaIncident(input: {
  incidentType: MetaIncidentType;
  severity: MetaIncidentSeverity;
  resourceType: string;
  resourceId?: string | null;
  summary: string;
  details?: unknown;
  correlationId?: string | null;
  runbookUrl?: string | null;
  at?: Date;
  timeWindowMinutes?: number;
  cooldownMinutes?: number;
}) {
  const now = input.at ?? new Date();
  const dedupeKey = buildMetaIncidentDedupeKey({ ...input, at: now });
  return db.metaIncident.upsert({
    where: { dedupeKey },
    create: {
      incidentType: input.incidentType,
      severity: input.severity,
      status: 'OPEN',
      dedupeKey,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      summary: input.summary.slice(0, 500),
      details: redactObservabilityData(input.details) as never,
      correlationId: input.correlationId ?? null,
      runbookUrl: input.runbookUrl ?? null,
      firstSeenAt: now,
      lastSeenAt: now,
      cooldownUntil: new Date(now.getTime() + Math.max(1, input.cooldownMinutes ?? 30) * 60_000),
    },
    update: {
      severity: input.severity,
      status: 'OPEN',
      summary: input.summary.slice(0, 500),
      details: redactObservabilityData(input.details) as never,
      correlationId: input.correlationId ?? undefined,
      runbookUrl: input.runbookUrl ?? undefined,
      lastSeenAt: now,
      resolvedAt: null,
      resolvedById: null,
      occurrenceCount: { increment: 1 },
      cooldownUntil: new Date(now.getTime() + Math.max(1, input.cooldownMinutes ?? 30) * 60_000),
    },
  });
}

export async function transitionMetaIncident(input: {
  incidentId: string;
  status: 'ACKNOWLEDGED' | 'RESOLVED';
  actorId: string;
}) {
  const existing = await db.metaIncident.findUnique({ where: { id: input.incidentId } });
  if (!existing) throw new Error('META_INCIDENT_NOT_FOUND');
  if (input.status === 'ACKNOWLEDGED' && existing.status === 'RESOLVED') throw new Error('META_INCIDENT_ALREADY_RESOLVED');
  const now = new Date();
  return db.metaIncident.update({
    where: { id: input.incidentId },
    data: input.status === 'ACKNOWLEDGED'
      ? { status: 'ACKNOWLEDGED', acknowledgedAt: now, acknowledgedById: input.actorId }
      : { status: 'RESOLVED', resolvedAt: now, resolvedById: input.actorId },
  });
}

export async function listMetaIncidents(input: { status?: MetaIncidentStatus; severity?: MetaIncidentSeverity; limit?: number } = {}) {
  return db.metaIncident.findMany({
    where: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.severity ? { severity: input.severity } : {}),
    },
    orderBy: [{ status: 'asc' }, { severity: 'desc' }, { lastSeenAt: 'desc' }],
    take: Math.max(1, Math.min(input.limit ?? 100, 250)),
    include: {
      acknowledgedBy: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true, name: true } },
    },
  });
}

export async function refreshOpenIncidentMetrics() {
  const rows = await db.metaIncident.groupBy({
    by: ['severity', 'incidentType'],
    where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
    _count: { _all: true },
  });
  for (const row of rows) {
    setMetaGauge('meta_incidents_open_total', { severity: row.severity, type: row.incidentType }, row._count._all);
  }
  return rows;
}

export async function evaluateMetaOperationalAlerts(input: { now?: Date } = {}) {
  const now = input.now ?? new Date();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60_000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60_000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60_000);
  const incidents: IncidentRecord[] = [];

  const [stuckBatches, connection, failedCatalog, recentCatalog, lastPurchase, lastWebhook, queueBacklog, deleteCandidates, totalCatalog] = await Promise.all([
    db.metaCatalogBatch.findMany({ where: { status: 'SUBMITTED', submittedAt: { lt: thirtyMinutesAgo } }, orderBy: { submittedAt: 'asc' }, take: 25 }),
    db.metaConnection.findFirst({ orderBy: { updatedAt: 'desc' } }),
    db.metaCatalogSyncItem.count({ where: { status: 'FAILED', updatedAt: { gte: oneHourAgo } } }),
    db.metaCatalogSyncItem.count({ where: { updatedAt: { gte: oneHourAgo } } }),
    db.metaEventOutbox.findFirst({ where: { eventName: 'Purchase', status: 'SENT' }, orderBy: { sentAt: 'desc' } }),
    db.metaWebhookReceipt.findFirst({ where: { status: { in: ['PROCESSED', 'QUEUED', 'VERIFIED'] } }, orderBy: { receivedAt: 'desc' } }),
    db.metaJobAudit.count({ where: { status: { in: ['QUEUED', 'RUNNING', 'RETRYING'] } } }),
    db.metaCatalogSyncItem.count({ where: { status: 'DELETE_SUBMITTED' } }),
    db.metaCatalogSyncItem.count({}),
  ]);

  for (const batch of stuckBatches as Array<{ handle: string; catalogId: string; submittedAt: Date; correlationId?: string | null }>) {
    incidents.push(await openOrRefreshMetaIncident({
      incidentType: 'CATALOG_BATCH_STUCK', severity: 'ERROR', resourceType: 'META_CATALOG_BATCH', resourceId: batch.handle,
      summary: `Catalog batch ${batch.handle} has remained submitted for more than 30 minutes.`,
      details: { catalogId: batch.catalogId, submittedAt: batch.submittedAt }, correlationId: batch.correlationId,
      runbookUrl: '/admin/meta?tab=incidents', at: now, timeWindowMinutes: 120, cooldownMinutes: 30,
    }));
  }

  const connectionRow = connection as { id?: string; status?: string; graphApiVersion?: string; tokenExpiresAt?: Date | null } | null;
  if (connectionRow?.status === 'INVALID_TOKEN') {
    incidents.push(await openOrRefreshMetaIncident({
      incidentType: 'TOKEN_INVALID', severity: 'CRITICAL', resourceType: 'META_CONNECTION', resourceId: connectionRow.id ?? 'primary',
      summary: 'The active Meta access token is invalid.', details: { status: connectionRow.status }, at: now,
      timeWindowMinutes: 240, cooldownMinutes: 30, runbookUrl: '/admin/meta?tab=connection',
    }));
  }

  if (recentCatalog >= 10 && failedCatalog / recentCatalog >= 0.2) {
    incidents.push(await openOrRefreshMetaIncident({
      incidentType: 'CATALOG_FAILURE_SPIKE', severity: 'ERROR', resourceType: 'META_CATALOG', resourceId: 'global',
      summary: 'Catalog item failure rate exceeded 20% during the last hour.', details: { failedCatalog, recentCatalog }, at: now,
      timeWindowMinutes: 60, cooldownMinutes: 30, runbookUrl: '/admin/meta?tab=diagnostics',
    }));
  }

  const purchase = lastPurchase as { sentAt?: Date | null; createdAt?: Date } | null;
  if (purchase && (purchase.sentAt ?? purchase.createdAt ?? now) < twoHoursAgo) {
    incidents.push(await openOrRefreshMetaIncident({
      incidentType: 'PURCHASE_SILENCE', severity: 'WARNING', resourceType: 'META_EVENT', resourceId: 'Purchase',
      summary: 'No successfully sent Meta Purchase event has been observed for more than two hours.',
      details: { lastSentAt: purchase.sentAt ?? purchase.createdAt }, at: now, timeWindowMinutes: 120, cooldownMinutes: 60,
      runbookUrl: '/admin/meta?tab=events',
    }));
  }

  const webhook = lastWebhook as { receivedAt?: Date } | null;
  if (webhook?.receivedAt && webhook.receivedAt < twoHoursAgo) {
    incidents.push(await openOrRefreshMetaIncident({
      incidentType: 'WEBHOOK_SILENCE', severity: 'WARNING', resourceType: 'META_WEBHOOK', resourceId: 'leadgen',
      summary: 'No verified or processed Meta webhook has been observed for more than two hours.',
      details: { lastReceivedAt: webhook.receivedAt }, at: now, timeWindowMinutes: 120, cooldownMinutes: 60,
      runbookUrl: '/admin/meta?tab=leads',
    }));
  }

  if (queueBacklog >= 100) {
    incidents.push(await openOrRefreshMetaIncident({
      incidentType: 'QUEUE_BACKLOG', severity: queueBacklog >= 500 ? 'CRITICAL' : 'ERROR', resourceType: 'META_QUEUE', resourceId: 'all',
      summary: `Meta queue backlog reached ${queueBacklog} jobs.`, details: { queueBacklog }, at: now,
      timeWindowMinutes: 60, cooldownMinutes: 15, runbookUrl: '/admin/meta?tab=jobs',
    }));
  }

  const massDeleteThreshold = Math.max(20, Math.ceil(totalCatalog * 0.25));
  if (deleteCandidates >= massDeleteThreshold) {
    incidents.push(await openOrRefreshMetaIncident({
      incidentType: 'MASS_DELETE_CANDIDATE', severity: 'CRITICAL', resourceType: 'META_CATALOG', resourceId: 'global',
      summary: `${deleteCandidates} catalog items are pending deletion, exceeding the safety threshold.`,
      details: { deleteCandidates, totalCatalog, massDeleteThreshold }, at: now, timeWindowMinutes: 240, cooldownMinutes: 60,
      runbookUrl: '/admin/meta?tab=catalog',
    }));
  }

  await refreshOpenIncidentMetrics();
  return { evaluatedAt: now, createdOrRefreshed: incidents.length, incidents };
}
