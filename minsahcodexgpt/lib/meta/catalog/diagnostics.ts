import { createHash } from 'node:crypto';
import prisma from '@/lib/prisma';
import { fetchCatalogDiagnosticsThroughMetaPlatform } from '@/lib/meta-platform/migration/phase30-catalog-facade';
import { ensureCorrelationId } from '@/lib/observability/correlation';
import { incrementMetaCounter } from '@/lib/observability/metrics';
import { openOrRefreshMetaIncident } from '@/lib/observability/incidents';
import { redactObservabilityData } from '@/lib/observability/redaction';
import { writeMetaLog } from '@/lib/observability/logger';

export type CatalogDiagnosticSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type NormalizedCatalogDiagnosticItem = { retailerId: string; providerItemId?: string };
export type NormalizedCatalogDiagnostic = {
  diagnosticKey: string;
  issueType: string;
  severity: CatalogDiagnosticSeverity;
  title: string;
  description?: string;
  affectedItemCount: number;
  items: NormalizedCatalogDiagnosticItem[];
  rawData: unknown;
};

type DiagnosticRecord = { id: string; diagnosticKey: string; severity: string; status: string };
type DiagnosticDelegate = {
  upsert(args: unknown): Promise<DiagnosticRecord>;
  findMany(args: unknown): Promise<DiagnosticRecord[]>;
  updateMany(args: unknown): Promise<{ count: number }>;
};
type DiagnosticItemDelegate = {
  upsert(args: unknown): Promise<unknown>;
  updateMany(args: unknown): Promise<{ count: number }>;
};
type DiagnosticDb = {
  metaCatalogDiagnostic: DiagnosticDelegate;
  metaCatalogDiagnosticItem: DiagnosticItemDelegate;
  $transaction<T>(run: (tx: DiagnosticDb) => Promise<T>): Promise<T>;
};
const db = prisma as unknown as DiagnosticDb;

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0; }

function normalizeSeverity(value: unknown): CatalogDiagnosticSeverity {
  const severity = String(value ?? '').trim().toUpperCase();
  if (['FATAL', 'CRITICAL', 'BLOCKER'].includes(severity)) return 'CRITICAL';
  if (['ERROR', 'SEVERE', 'HIGH'].includes(severity)) return 'ERROR';
  if (['WARNING', 'WARN', 'MEDIUM'].includes(severity)) return 'WARNING';
  return 'INFO';
}

function extractItem(value: unknown): NormalizedCatalogDiagnosticItem | null {
  if (typeof value === 'string' && value.trim()) return { retailerId: value.trim() };
  const row = objectValue(value);
  if (!row) return null;
  const retailerId = text(row.retailer_id) ?? text(row.retailerId) ?? text(row.content_id) ?? text(row.contentId);
  if (!retailerId) return null;
  const providerItemId = text(row.id) ?? text(row.item_id) ?? text(row.product_item_id);
  return { retailerId, ...(providerItemId ? { providerItemId } : {}) };
}

function uniqueItems(values: unknown[]) {
  const byRetailerId = new Map<string, NormalizedCatalogDiagnosticItem>();
  for (const value of values) {
    const item = extractItem(value);
    if (!item) continue;
    const existing = byRetailerId.get(item.retailerId);
    if (!existing || (!existing.providerItemId && item.providerItemId)) byRetailerId.set(item.retailerId, item);
  }
  return [...byRetailerId.values()];
}

export function normalizeCatalogDiagnostic(value: unknown): NormalizedCatalogDiagnostic | null {
  const row = objectValue(value);
  if (!row) return null;
  const issueType = text(row.type) ?? text(row.error_type) ?? text(row.code) ?? text(row.issue_type) ?? 'UNKNOWN_CATALOG_ISSUE';
  const title = text(row.title) ?? text(row.name) ?? text(row.short_description) ?? issueType.replace(/_/g, ' ');
  const description = text(row.description) ?? text(row.actionable_description) ?? text(row.message);
  const rawItems = [row.affected_items, row.sample_affected_items, row.sample_affected_entities, row.items]
    .flatMap((candidate) => Array.isArray(candidate) ? candidate : []);
  const items = uniqueItems(rawItems);
  const affectedItemCount = number(row.number_of_affected_items ?? row.affected_item_count ?? row.count) || items.length;
  const diagnosticKey = createHash('sha256').update(`${issueType}|${title}`).digest('hex');
  return {
    diagnosticKey,
    issueType: issueType.slice(0, 200),
    severity: normalizeSeverity(row.severity ?? row.level),
    title: title.slice(0, 500),
    description: description?.slice(0, 4_000),
    affectedItemCount,
    items,
    rawData: redactObservabilityData(row),
  };
}

export async function fetchMetaCatalogDiagnostics(input: { catalogId?: string; limit?: number; correlationId?: string } = {}) {
  const provider = await fetchCatalogDiagnosticsThroughMetaPlatform(input);
  return Object.freeze({
    catalogId: provider.catalogId,
    diagnostics: provider.rows.map(normalizeCatalogDiagnostic).filter((item): item is NormalizedCatalogDiagnostic => Boolean(item)),
    pages: provider.pages,
    migration: provider.migration,
  });
}

function metricLabel(value: string) {
  return value.replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 64) || 'unknown';
}

export async function persistMetaCatalogDiagnostics(input: {
  catalogId: string;
  diagnostics: NormalizedCatalogDiagnostic[];
  correlationId?: string;
  observedAt?: Date;
}) {
  const observedAt = input.observedAt ?? new Date();
  const correlationId = ensureCorrelationId(input.correlationId, 'catalog-diagnostics');
  const activeKeys = input.diagnostics.map((item) => item.diagnosticKey);
  const persisted: DiagnosticRecord[] = [];

  await db.$transaction(async (tx) => {
    for (const diagnostic of input.diagnostics) {
      const record = await tx.metaCatalogDiagnostic.upsert({
        where: { catalogId_diagnosticKey: { catalogId: input.catalogId, diagnosticKey: diagnostic.diagnosticKey } },
        create: {
          catalogId: input.catalogId,
          diagnosticKey: diagnostic.diagnosticKey,
          issueType: diagnostic.issueType,
          severity: diagnostic.severity,
          title: diagnostic.title,
          description: diagnostic.description,
          affectedItemCount: diagnostic.affectedItemCount,
          status: 'ACTIVE',
          correlationId,
          rawData: diagnostic.rawData as never,
          firstSeenAt: observedAt,
          lastSeenAt: observedAt,
        },
        update: {
          issueType: diagnostic.issueType,
          severity: diagnostic.severity,
          title: diagnostic.title,
          description: diagnostic.description,
          affectedItemCount: diagnostic.affectedItemCount,
          status: 'ACTIVE',
          correlationId,
          rawData: diagnostic.rawData as never,
          lastSeenAt: observedAt,
          resolvedAt: null,
        },
      });
      persisted.push(record);
      const retailerIds = diagnostic.items.map((item) => item.retailerId);
      for (const item of diagnostic.items) {
        await tx.metaCatalogDiagnosticItem.upsert({
          where: { diagnosticId_retailerId: { diagnosticId: record.id, retailerId: item.retailerId } },
          create: { diagnosticId: record.id, retailerId: item.retailerId, providerItemId: item.providerItemId, status: 'ACTIVE', firstSeenAt: observedAt, lastSeenAt: observedAt },
          update: { providerItemId: item.providerItemId, status: 'ACTIVE', lastSeenAt: observedAt, resolvedAt: null },
        });
      }
      await tx.metaCatalogDiagnosticItem.updateMany({
        where: { diagnosticId: record.id, status: 'ACTIVE', ...(retailerIds.length ? { retailerId: { notIn: retailerIds } } : {}) },
        data: { status: 'RESOLVED', resolvedAt: observedAt },
      });
    }

    const stale = await tx.metaCatalogDiagnostic.findMany({
      where: { catalogId: input.catalogId, status: 'ACTIVE', ...(activeKeys.length ? { diagnosticKey: { notIn: activeKeys } } : {}) },
      select: { id: true, diagnosticKey: true, severity: true, status: true },
    });
    if (stale.length) {
      const staleIds = stale.map((item) => item.id);
      await tx.metaCatalogDiagnostic.updateMany({ where: { id: { in: staleIds } }, data: { status: 'RESOLVED', resolvedAt: observedAt, lastSeenAt: observedAt } });
      await tx.metaCatalogDiagnosticItem.updateMany({ where: { diagnosticId: { in: staleIds }, status: 'ACTIVE' }, data: { status: 'RESOLVED', resolvedAt: observedAt } });
    }
  });

  for (const diagnostic of input.diagnostics) {
    incrementMetaCounter('meta_catalog_diagnostics_errors_total', {
      severity: diagnostic.severity.toLowerCase(),
      issue_type: metricLabel(diagnostic.issueType.toLowerCase()),
    });
    if (diagnostic.severity === 'ERROR' || diagnostic.severity === 'CRITICAL') {
      await openOrRefreshMetaIncident({
        incidentType: 'CATALOG_DIAGNOSTIC',
        severity: diagnostic.severity,
        resourceType: 'META_CATALOG_DIAGNOSTIC',
        resourceId: `${input.catalogId}:${diagnostic.diagnosticKey}`,
        summary: diagnostic.title,
        details: { catalogId: input.catalogId, issueType: diagnostic.issueType, affectedItemCount: diagnostic.affectedItemCount, sampleRetailerIds: diagnostic.items.map((item) => item.retailerId) },
        correlationId,
        runbookUrl: '/admin/meta?tab=diagnostics',
        at: observedAt,
        timeWindowMinutes: 240,
        cooldownMinutes: 60,
      });
    }
  }

  writeMetaLog('info', { operation: 'catalog_diagnostics_import', outcome: 'SUCCEEDED', correlationId, catalogId: input.catalogId, details: { imported: input.diagnostics.length, sampledItems: input.diagnostics.reduce((sum, item) => sum + item.items.length, 0) } });
  return { catalogId: input.catalogId, correlationId, imported: input.diagnostics.length, sampledItems: input.diagnostics.reduce((sum, item) => sum + item.items.length, 0) };
}

export async function importMetaCatalogDiagnostics(input: { catalogId?: string; correlationId?: string; limit?: number } = {}) {
  const correlationId = ensureCorrelationId(input.correlationId, 'catalog-diagnostics');
  const fetched = await fetchMetaCatalogDiagnostics({ catalogId: input.catalogId, limit: input.limit });
  return persistMetaCatalogDiagnostics({ catalogId: fetched.catalogId, diagnostics: fetched.diagnostics, correlationId });
}
