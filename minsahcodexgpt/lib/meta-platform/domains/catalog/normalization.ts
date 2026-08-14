import { createHash } from 'node:crypto';
import type { MetaCatalogBatchItemOutcome, MetaCatalogBatchTerminalStatus, MetaCatalogDeletePlanPayload } from './types';

export function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
function integer(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function stableCatalogHash(value: unknown): string {
  const stable = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(stable);
    if (input && typeof input === 'object') {
      return Object.fromEntries(Object.entries(input as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stable(child)]));
    }
    return input;
  };
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function normalizeCatalogBatchStatus(value: unknown): MetaCatalogBatchTerminalStatus {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (['FINISHED', 'COMPLETED', 'SUCCESS', 'SUCCEEDED', 'COMPLETE'].includes(normalized)) return 'SUCCESS';
  if (['FAILED', 'ERROR', 'FATAL', 'CANCELLED', 'CANCELED'].includes(normalized)) return 'FAILED';
  return 'SUBMITTED';
}

function retryableProviderError(value: unknown): boolean {
  const row = objectValue(value);
  const code = Number(row?.code ?? objectValue(row?.error)?.code);
  const status = Number(row?.status ?? row?.http_status);
  if ([4, 17, 32, 613].includes(code) || status === 429 || status >= 500) return true;
  const message = String(row?.message ?? objectValue(row?.error)?.message ?? '').toLowerCase();
  return /timeout|temporar|rate.?limit|try again|unavailable|internal/.test(message);
}

function outcomeFrom(value: unknown, fallbackIndex: number): MetaCatalogBatchItemOutcome | null {
  const row = objectValue(value);
  if (!row) return null;
  const retailerId = text(row.retailer_id) ?? text(row.retailerId) ?? text(row.id);
  const index = integer(row.index ?? row.request_index ?? row.item_index) ?? fallbackIndex;
  const error = row.error ?? row.errors ?? row.failure ?? null;
  const rawStatus = row.status ?? row.state ?? row.result;
  const status = error || ['FAILED', 'ERROR', 'INVALID'].includes(String(rawStatus ?? '').trim().toUpperCase()) ? 'FAILED' : 'SUCCESS';
  return Object.freeze({
    ...(retailerId ? { retailerId } : {}),
    index,
    status,
    retryable: status === 'FAILED' && retryableProviderError(error ?? row),
    error: status === 'FAILED' ? error ?? row : null,
  });
}

export function normalizeCatalogBatchItemOutcomes(payload: unknown): readonly MetaCatalogBatchItemOutcome[] {
  const root = objectValue(payload);
  const first = Array.isArray(root?.data) ? objectValue(root.data[0]) : root;
  const candidates = [
    first?.item_results,
    first?.results,
    first?.requests,
    first?.items,
    root?.item_results,
    root?.results,
  ].find(Array.isArray) as unknown[] | undefined;
  if (!candidates) return Object.freeze([]);
  return Object.freeze(candidates.map(outcomeFrom).filter((item): item is MetaCatalogBatchItemOutcome => Boolean(item)));
}

export function buildCatalogDeletePlanPayload(input: {
  catalogId: string;
  retailerIds: readonly string[];
  sourceSnapshotHash: string;
  managedItemCount: number;
  maxDeleteCount?: number;
  maxDeleteRatio?: number;
}): MetaCatalogDeletePlanPayload {
  const retailerIds = Object.freeze([...new Set(input.retailerIds.map((item) => item.trim()).filter(Boolean))].sort());
  const itemCount = retailerIds.length;
  const managedItemCount = Math.max(0, Math.trunc(input.managedItemCount));
  const deleteRatio = managedItemCount > 0 ? itemCount / managedItemCount : itemCount > 0 ? 1 : 0;
  const maxDeleteCount = Math.max(1, Math.trunc(input.maxDeleteCount ?? 100));
  const maxDeleteRatio = Math.min(1, Math.max(0.01, input.maxDeleteRatio ?? 0.25));
  const digest = stableCatalogHash({ catalogId: input.catalogId, retailerIds, sourceSnapshotHash: input.sourceSnapshotHash });
  return Object.freeze({
    catalogId: input.catalogId,
    retailerIds,
    digest,
    itemCount,
    sourceSnapshotHash: input.sourceSnapshotHash,
    managedItemCount,
    deleteRatio,
    requiresEmergencyOverride: itemCount > maxDeleteCount || deleteRatio > maxDeleteRatio,
  });
}

export function assertCatalogDeletePlanIntegrity(plan: MetaCatalogDeletePlanPayload): void {
  const expected = stableCatalogHash({ catalogId: plan.catalogId, retailerIds: [...plan.retailerIds].sort(), sourceSnapshotHash: plan.sourceSnapshotHash });
  if (expected !== plan.digest || plan.itemCount !== plan.retailerIds.length) throw new Error('META_CATALOG_DELETE_PLAN_INTEGRITY_FAILED');
}
