import 'server-only';
import {
  buildCatalogDiagnosticsIdempotencyKey,
  buildCatalogFullIdempotencyKey,
  buildCatalogIncrementalIdempotencyKey,
  buildCatalogInventoryIdempotencyKey,
  buildCatalogReconcileIdempotencyKey,
  buildCatalogStatusIdempotencyKey,
  buildTokenHealthIdempotencyKey,
  buildVersionHealthIdempotencyKey,
  buildLeadReceiptRecoveryIdempotencyKey,
  buildLeadSlaAlertIdempotencyKey,
  buildLeadRetentionIdempotencyKey,
  buildProductSetReconcileIdempotencyKey,
  buildAdsInsightsIdempotencyKey,
  buildInstagramReceiptRecoveryIdempotencyKey,
  buildInstagramRetentionIdempotencyKey,
} from './idempotency';
import {
  enqueueMetaCatalogDiagnosticsJob,
  enqueueMetaCatalogStatusJob,
  enqueueMetaCatalogSyncJob,
  enqueueMetaConnectionHealthJob,
  enqueueMetaLeadReceiptRecoveryJob,
  enqueueMetaLeadSlaAlertJob,
  enqueueMetaLeadRetentionJob,
  enqueueMetaProductSetReconcileJob,
  enqueueMetaAdsInsightsJob,
  enqueueMetaInstagramReceiptRecoveryJob,
  enqueueMetaInstagramRetentionJob,
} from './queues';

export type MetaSchedulePlanItem = {
  key: string;
  queue: 'catalog-status' | 'catalog-sync' | 'diagnostics' | 'connection-health' | 'leads' | 'product-sets' | 'ads-insights' | 'instagram';
  due: boolean;
};

export function buildMetaSchedulePlan(now = new Date()): MetaSchedulePlanItem[] {
  const minute = now.getUTCMinutes();
  const hour = now.getUTCHours();
  const day = now.getUTCDay();
  return [
    { key: 'batch-status-5m', queue: 'catalog-status', due: minute % 5 === 0 },
    { key: 'lead-receipt-recovery-5m', queue: 'leads', due: minute % 5 === 0 },
    { key: 'instagram-receipt-recovery-5m', queue: 'instagram', due: minute % 5 === 0 },
    { key: 'lead-sla-alert-5m', queue: 'leads', due: minute % 5 === 0 },
    { key: 'inventory-15m', queue: 'catalog-sync', due: minute % 15 === 0 },
    { key: 'incremental-hourly', queue: 'catalog-sync', due: minute === 0 },
    { key: 'reconcile-nightly', queue: 'catalog-sync', due: hour === 2 && minute < 5 },
    { key: 'token-permission-asset-daily', queue: 'connection-health', due: hour === 4 && minute < 5 },
    { key: 'api-version-weekly', queue: 'connection-health', due: day === 1 && hour === 4 && minute < 5 },
    { key: 'diagnostics-daily', queue: 'diagnostics', due: hour === 4 && minute < 5 },
    { key: 'product-sets-6h', queue: 'product-sets', due: hour % 6 === 0 && minute < 5 },
    { key: 'ads-insights-6h', queue: 'ads-insights', due: hour % 6 === 1 && minute < 5 },
    { key: 'lead-retention-daily', queue: 'leads', due: hour === 3 && minute < 5 },
    { key: 'instagram-retention-daily', queue: 'instagram', due: hour === 3 && minute >= 5 && minute < 10 },
    { key: 'full-weekly', queue: 'catalog-sync', due: day === 0 && hour === 3 && minute < 5 },
  ];
}

export async function scheduleMetaMaintenanceJobs(now = new Date()) {
  const catalogId = process.env.META_CATALOG_ID?.trim() || undefined;
  const connectionId = process.env.META_BUSINESS_ID?.trim() || undefined;
  const plan = buildMetaSchedulePlan(now);
  const accepted: unknown[] = [];

  for (const item of plan) {
    if (!item.due) continue;
    if (item.key === 'batch-status-5m') {
      accepted.push(await enqueueMetaCatalogStatusJob({
        catalogId,
        idempotencyKey: buildCatalogStatusIdempotencyKey(catalogId, now),
      }));
    } else if (item.key === 'lead-receipt-recovery-5m') {
      accepted.push(await enqueueMetaLeadReceiptRecoveryJob({
        idempotencyKey: buildLeadReceiptRecoveryIdempotencyKey(now),
        limit: 100,
      }));
    } else if (item.key === 'instagram-receipt-recovery-5m') {
      accepted.push(await enqueueMetaInstagramReceiptRecoveryJob({
        idempotencyKey: buildInstagramReceiptRecoveryIdempotencyKey(now),
        limit: 100,
      }));
    } else if (item.key === 'lead-sla-alert-5m') {
      accepted.push(await enqueueMetaLeadSlaAlertJob({
        idempotencyKey: buildLeadSlaAlertIdempotencyKey(now),
      }));
    } else if (item.key === 'inventory-15m') {
      accepted.push(await enqueueMetaCatalogSyncJob({
        catalogId,
        mode: 'inventory',
        idempotencyKey: buildCatalogInventoryIdempotencyKey(catalogId, now),
      }));
    } else if (item.key === 'incremental-hourly') {
      accepted.push(await enqueueMetaCatalogSyncJob({
        catalogId,
        mode: 'incremental',
        idempotencyKey: buildCatalogIncrementalIdempotencyKey(catalogId, now),
      }));
    } else if (item.key === 'reconcile-nightly') {
      accepted.push(await enqueueMetaCatalogSyncJob({
        catalogId,
        mode: 'reconcile',
        idempotencyKey: buildCatalogReconcileIdempotencyKey(catalogId, now),
      }));
    } else if (item.key === 'token-permission-asset-daily') {
      accepted.push(await enqueueMetaConnectionHealthJob({
        connectionId,
        checks: ['TOKEN', 'PERMISSIONS', 'ASSETS'],
        idempotencyKey: buildTokenHealthIdempotencyKey(connectionId, now, 'token-permission-asset'),
      }));
    } else if (item.key === 'api-version-weekly') {
      accepted.push(await enqueueMetaConnectionHealthJob({
        connectionId,
        checks: ['VERSION'],
        idempotencyKey: buildVersionHealthIdempotencyKey(connectionId, now),
      }));
    } else if (item.key === 'diagnostics-daily') {
      accepted.push(await enqueueMetaCatalogDiagnosticsJob({
        catalogId,
        idempotencyKey: buildCatalogDiagnosticsIdempotencyKey(catalogId, now),
      }));
    } else if (item.key === 'product-sets-6h') {
      accepted.push(await enqueueMetaProductSetReconcileJob({
        idempotencyKey: buildProductSetReconcileIdempotencyKey(now),
      }));
    } else if (item.key === 'ads-insights-6h') {
      const stop = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
      const start = new Date(stop.getTime() - 6 * 86_400_000);
      accepted.push(await enqueueMetaAdsInsightsJob({
        level: 'CAMPAIGN',
        since: start.toISOString().slice(0, 10),
        until: stop.toISOString().slice(0, 10),
        idempotencyKey: buildAdsInsightsIdempotencyKey('CAMPAIGN', now),
      }));
    } else if (item.key === 'lead-retention-daily') {
      accepted.push(await enqueueMetaLeadRetentionJob({
        idempotencyKey: buildLeadRetentionIdempotencyKey(now),
      }));
    } else if (item.key === 'instagram-retention-daily') {
      accepted.push(await enqueueMetaInstagramRetentionJob({ idempotencyKey: buildInstagramRetentionIdempotencyKey(now) }));
    } else if (item.key === 'full-weekly') {
      accepted.push(await enqueueMetaCatalogSyncJob({
        catalogId,
        mode: 'full',
        idempotencyKey: buildCatalogFullIdempotencyKey(catalogId, now),
      }));
    }
  }

  return { checkedAt: now.toISOString(), due: plan.filter((item) => item.due).map((item) => item.key), accepted };
}
