import crypto from 'node:crypto';

function clean(value: string | undefined, fallback = 'default') {
  const normalized = value?.trim();
  return normalized || fallback;
}

export function utcWindowStart(date: Date, windowMinutes: number) {
  const windowMs = Math.max(1, windowMinutes) * 60_000;
  return new Date(Math.floor(date.getTime() / windowMs) * windowMs);
}

export function buildCatalogInventoryIdempotencyKey(catalogId: string | undefined, now = new Date()) {
  return `catalog-inventory:${clean(catalogId)}:${utcWindowStart(now, 15).toISOString()}`;
}

export function buildCatalogIncrementalIdempotencyKey(
  catalogId: string | undefined,
  now = new Date(),
  productIds?: readonly string[]
) {
  if (productIds && productIds.length > 0) {
    const sorted = [...productIds].sort().join(',');
    const hash = crypto.createHash('sha256').update(sorted).digest('hex').slice(0, 12);
    return `catalog-incremental:${clean(catalogId)}:items-${hash}:${utcWindowStart(now, 1).toISOString()}`;
  }
  return `catalog-incremental:${clean(catalogId)}:${utcWindowStart(now, 60).toISOString()}`;
}

export function buildCatalogDeletePlanIdempotencyKey(deletePlanId: string) {
  return `catalog-delete:${clean(deletePlanId, 'missing')}`;
}

export function buildCatalogStatusIdempotencyKey(catalogId: string | undefined, now = new Date()) {
  return `catalog-status:${clean(catalogId)}:${utcWindowStart(now, 5).toISOString()}`;
}

export function buildCatalogReconcileIdempotencyKey(catalogId: string | undefined, now = new Date()) {
  return `catalog-reconcile:${clean(catalogId)}:${now.toISOString().slice(0, 10)}`;
}

export function buildCatalogFullIdempotencyKey(catalogId: string | undefined, now = new Date()) {
  const year = now.getUTCFullYear();
  const first = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((now.getTime() - first.getTime()) / 86_400_000) + first.getUTCDay() + 1) / 7);
  return `catalog-full:${clean(catalogId)}:${year}-W${String(week).padStart(2, '0')}`;
}

export function buildTokenHealthIdempotencyKey(connectionId: string | undefined, now = new Date(), scope = 'all') {
  return `connection-health:${clean(connectionId)}:${clean(scope)}:${now.toISOString().slice(0, 10)}`;
}

export function buildVersionHealthIdempotencyKey(connectionId: string | undefined, now = new Date()) {
  const year = now.getUTCFullYear();
  const first = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((now.getTime() - first.getTime()) / 86_400_000) + first.getUTCDay() + 1) / 7);
  return `connection-version:${clean(connectionId)}:${year}-W${String(week).padStart(2, '0')}`;
}

export function buildCatalogDiagnosticsIdempotencyKey(catalogId: string | undefined, now = new Date()) {
  return `catalog-diagnostics:${clean(catalogId)}:${now.toISOString().slice(0, 10)}`;
}

export function buildLeadFetchIdempotencyKey(leadgenId: string, receiptId?: string) {
  return `lead-fetch:${clean(leadgenId, 'missing')}:${clean(receiptId, 'receipt')}`;
}

export function buildLeadFormSyncIdempotencyKey(formId: string, now = new Date()) {
  return `lead-form-sync:${clean(formId, 'missing')}:${utcWindowStart(now, 60).toISOString()}`;
}

export function buildLeadReceiptRecoveryIdempotencyKey(now = new Date()) {
  return `lead-receipt-recovery:${utcWindowStart(now, 5).toISOString()}`;
}

export function buildLeadSlaAlertIdempotencyKey(now = new Date()) {
  return `lead-sla-alert:${utcWindowStart(now, 5).toISOString()}`;
}

export function buildLeadRetentionIdempotencyKey(now = new Date()) {
  return `lead-retention:${now.toISOString().slice(0, 10)}`;
}

export function buildCapiOutboxIdempotencyKey(outboxId: string, leaseToken?: string) {
  return `capi-outbox:${clean(outboxId, 'missing')}:${clean(leaseToken, 'direct')}`;
}

export function buildReplayIdempotencyKey(originalAuditId: string, replayNonce: string) {
  return `replay:${clean(originalAuditId, 'missing')}:${clean(replayNonce, 'missing')}`;
}

export function sanitizeBullJobId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96);
}

export function buildMetaJobId(queueName: string, idempotencyKey: string) {
  const digest = crypto.createHash('sha256').update(`${queueName}:${idempotencyKey}`).digest('hex').slice(0, 24);
  return sanitizeBullJobId(`${queueName}-${digest}`);
}

export function buildProductSetReconcileIdempotencyKey(now = new Date()) {
  return `product-set-reconcile:${utcWindowStart(now, 360).toISOString()}`;
}

export function buildAdsInsightsIdempotencyKey(level: string, now = new Date()) {
  return `ads-insights:${clean(level.toLowerCase(), 'campaign')}:${utcWindowStart(now, 360).toISOString()}`;
}


export function buildInstagramMessageIdempotencyKey(receiptId: string, eventKey?: string) {
  return `instagram-message:${clean(receiptId, 'missing')}:${clean(eventKey, 'event')}`;
}

export function buildInstagramReceiptRecoveryIdempotencyKey(now = new Date()) {
  return `instagram-receipt-recovery:${utcWindowStart(now, 5).toISOString()}`;
}

export function buildInstagramRetentionIdempotencyKey(now = new Date()) {
  return `instagram-retention:${now.toISOString().slice(0, 10)}`;
}
