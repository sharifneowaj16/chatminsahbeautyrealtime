import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  META_JOB_NAMES,
  META_JOB_SCHEMA_VERSION,
  META_QUEUE_NAMES,
  validateMetaJobPayload,
} from '../../lib/jobs/job-types';
import {
  buildCatalogInventoryIdempotencyKey,
  buildCatalogStatusIdempotencyKey,
  buildLeadFetchIdempotencyKey,
  buildMetaJobId,
} from '../../lib/jobs/idempotency';
import {
  classifyMetaProviderError,
  getMetaProviderRetryDelayMs,
  META_PROVIDER_MAX_ATTEMPTS,
  META_PROVIDER_RETRY_SCHEDULE_MS,
} from '../../lib/jobs/retry-policy';
import { computeMetaAdaptiveCooldownMs, parseMetaRateLimitHeaders } from '../../lib/jobs/rate-limit';

const NOW = new Date('2026-07-17T14:30:00.000Z');

function base(idempotencyKey: string) {
  return { schemaVersion: META_JOB_SCHEMA_VERSION, idempotencyKey, requestedAt: NOW.toISOString() };
}

test('provider queues are isolated by responsibility', () => {
  assert.deepEqual(Object.values(META_QUEUE_NAMES), [
    'meta-capi-events',
    'meta-catalog-sync',
    'meta-catalog-status',
    'meta-leads',
    'meta-diagnostics',
    'meta-connection-health',
    'meta-product-sets',
    'meta-ads-insights',
    'meta-instagram',
  ]);
});

test('retry schedule is immediate, 1m, 5m, 15m and 1h', () => {
  assert.equal(META_PROVIDER_MAX_ATTEMPTS, 5);
  assert.deepEqual([...META_PROVIDER_RETRY_SCHEDULE_MS], [0, 60_000, 300_000, 900_000, 3_600_000]);
  assert.equal(getMetaProviderRetryDelayMs(1), 60_000);
  assert.equal(getMetaProviderRetryDelayMs(4), 3_600_000);
});

test('provider errors distinguish rate limit, auth, permanent and transient', () => {
  assert.equal(classifyMetaProviderError(Object.assign(new Error('status 429'), { status: 429 })), 'RATE_LIMIT');
  assert.equal(classifyMetaProviderError({ status: 400, errorCode: 190 }), 'AUTH');
  assert.equal(classifyMetaProviderError({ status: 400, errorCode: 100 }), 'PERMANENT');
  assert.equal(classifyMetaProviderError(new Error('socket reset')), 'TRANSIENT');
});

test('adaptive cooldown honors retry-after and usage headers', () => {
  const headers = parseMetaRateLimitHeaders({
    'retry-after': '90',
    'x-app-usage': JSON.stringify({ call_count: 96 }),
  });
  assert.equal(headers.retryAfterMs, 90_000);
  assert.equal(headers.appUsagePercent, 96);
  assert.equal(computeMetaAdaptiveCooldownMs({ status: 429, headers }), 90_000);
  assert.equal(computeMetaAdaptiveCooldownMs({ headers: { appUsagePercent: 96 } }), 5 * 60_000);
});

test('deterministic schedule keys dedupe within their windows', () => {
  assert.equal(
    buildCatalogInventoryIdempotencyKey('catalog-1', NOW),
    buildCatalogInventoryIdempotencyKey('catalog-1', new Date('2026-07-17T14:44:59.000Z'))
  );
  assert.notEqual(
    buildCatalogStatusIdempotencyKey('catalog-1', NOW),
    buildCatalogStatusIdempotencyKey('catalog-1', new Date('2026-07-17T14:35:00.000Z'))
  );
  assert.equal(buildLeadFetchIdempotencyKey('lead-1', 'receipt-1'), 'lead-fetch:lead-1:receipt-1');
});

test('BullMQ job IDs are deterministic and colon-free', () => {
  const left = buildMetaJobId('meta-catalog-sync', 'catalog-inventory:1:window');
  const right = buildMetaJobId('meta-catalog-sync', 'catalog-inventory:1:window');
  assert.equal(left, right);
  assert.doesNotMatch(left, /:/);
});

test('payload validator rejects secret-bearing or mismatched jobs', () => {
  const secret = validateMetaJobPayload({
    queueName: META_QUEUE_NAMES.LEADS,
    jobName: META_JOB_NAMES.LEAD_FETCH,
    payload: { ...base('lead-fetch:1'), type: 'lead_fetch', leadgenId: '1', accessToken: 'secret' },
  });
  assert.equal(secret.valid, false);
  assert.equal(secret.issues.some((issue) => issue.code === 'SECRET_IN_JOB_PAYLOAD'), true);

  const mismatch = validateMetaJobPayload({
    queueName: META_QUEUE_NAMES.CATALOG_SYNC,
    jobName: META_JOB_NAMES.LEAD_FETCH,
    payload: { ...base('lead-fetch:1'), type: 'lead_fetch', leadgenId: '1' },
  });
  assert.equal(mismatch.issues.some((issue) => issue.code === 'QUEUE_JOB_MISMATCH'), true);
});

test('valid catalog and lead payloads pass schema validation', () => {
  assert.equal(validateMetaJobPayload({
    queueName: META_QUEUE_NAMES.CATALOG_SYNC,
    jobName: META_JOB_NAMES.CATALOG_SYNC,
    payload: { ...base('catalog:1'), type: 'catalog_sync', catalogId: '1', mode: 'incremental' },
  }).valid, true);
  assert.equal(validateMetaJobPayload({
    queueName: META_QUEUE_NAMES.LEADS,
    jobName: META_JOB_NAMES.LEAD_FETCH,
    payload: { ...base('lead:1'), type: 'lead_fetch', receiptId: 'receipt-1', leadgenId: '1', pageId: 'p1' },
  }).valid, true);
});

test('Prisma job audit provides status enum, idempotency uniqueness and DLQ fields', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const migration = fs.readFileSync('prisma/migrations/20260717030000_meta_v6_phase5_durable_jobs/migration.sql', 'utf8');
  assert.match(schema, /enum MetaJobStatus/);
  assert.match(schema, /model MetaJobAudit/);
  assert.match(schema, /idempotencyKey\s+String\s+@unique/);
  assert.match(schema, /DEAD_LETTER/);
  assert.match(migration, /MetaJobAudit_idempotencyKey_key/);
});

test('request paths enqueue durable work instead of executing Graph calls inline', () => {
  const files = [
    'app/api/admin/meta/catalogs/sync/route.ts',
    'app/api/internal/meta/catalog-sync/route.ts',
    'app/api/internal/meta/catalog-batch-status/route.ts',
    'app/api/webhooks/meta/route.ts',
  ];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /enqueueMeta/);
    assert.doesNotMatch(source, /syncCatalogProducts|pollPendingCatalogBatches|fetchLeadById/);
  }
  const compatibilityAlias = fs.readFileSync('app/api/webhooks/meta/leadgen/route.ts', 'utf8');
  assert.match(compatibilityAlias, /export const dynamic = 'force-dynamic'/);
  assert.match(compatibilityAlias, /export const runtime = 'nodejs'/);
  assert.match(compatibilityAlias, /export \{ GET, POST \} from '\.\.\/route'/);
  assert.doesNotMatch(compatibilityAlias, /export \{ dynamic, runtime/);
});

test('GA4 and TikTok use queues separate from Meta', () => {
  const queue = fs.readFileSync('lib/queue/metaCapiQueue.ts', 'utf8');
  assert.match(queue, /analytics-ga4-events/);
  assert.match(queue, /tiktok-events/);
  assert.match(queue, /ga4EventsQueue\.add/);
  assert.match(queue, /tiktokEventsQueue\.add/);
});
