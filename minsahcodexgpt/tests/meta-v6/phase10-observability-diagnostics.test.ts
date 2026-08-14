import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { redactObservabilityData } from '@/lib/observability/redaction';
import { createCorrelationId, ensureCorrelationId, normalizeCorrelationId } from '@/lib/observability/correlation';
import { normalizeCatalogDiagnostic } from '@/lib/meta/catalog/diagnostics';
import { buildMetaIncidentDedupeKey } from '@/lib/observability/incidents';
import {
  incrementMetaCounter,
  renderMetaMetricsPrometheus,
  resetMetaMetricsForTests,
  setMetaGauge,
} from '@/lib/observability/metrics';

test('recursive observability redaction removes tokens, PII and raw payloads', () => {
  const result = redactObservabilityData({
    accessToken: 'EA-secret-token',
    email: 'person@example.com',
    phone: '01712345678',
    rawPayload: { customer: 'private' },
    note: 'Bearer abc.def person@example.com 01712345678 access_token=hidden',
    phoneMasked: '*******5678',
  }) as Record<string, unknown>;
  assert.equal(result.accessToken, '[REDACTED]');
  assert.equal(result.email, '[REDACTED]');
  assert.equal(result.phone, '[REDACTED]');
  assert.equal(result.rawPayload, '[REDACTED]');
  assert.equal(result.phoneMasked, '*******5678');
  assert.doesNotMatch(JSON.stringify(result), /EA-secret-token|person@example\.com|01712345678|access_token=hidden|private/);
});

test('correlation IDs are validated and malformed external values are replaced', () => {
  const created = createCorrelationId('meta-job');
  assert.match(created, /^meta-job:[0-9a-f-]{36}$/);
  assert.equal(normalizeCorrelationId(created), created);
  assert.equal(normalizeCorrelationId('bad id'), null);
  assert.equal(ensureCorrelationId('bad id', 'meta-safe').startsWith('meta-safe:'), true);
});

test('Catalog Diagnostics normalizer imports aggregate and sampled item evidence', () => {
  const result = normalizeCatalogDiagnostic({
    type: 'MISSING_IMAGE_LINK', severity: 'high', title: 'Image is missing',
    actionable_description: 'Provide a valid image_link.', number_of_affected_items: 3,
    sample_affected_items: [{ retailer_id: 'sku-1', id: 'provider-1' }, { content_id: 'sku-2' }, { retailer_id: 'sku-1' }],
    access_token: 'secret',
  });
  assert.ok(result);
  assert.equal(result.severity, 'ERROR');
  assert.equal(result.affectedItemCount, 3);
  assert.deepEqual(result.items, [{ retailerId: 'sku-1', providerItemId: 'provider-1' }, { retailerId: 'sku-2' }]);
  assert.equal((result.rawData as Record<string, unknown>).access_token, '[REDACTED]');
  assert.equal(result.diagnosticKey.length, 64);
});

test('incident deduplication is stable within a time window and rotates across windows', () => {
  const base = { incidentType: 'CATALOG_BATCH_STUCK' as const, resourceType: 'META_CATALOG_BATCH', resourceId: 'batch-1', timeWindowMinutes: 60 };
  const first = buildMetaIncidentDedupeKey({ ...base, at: new Date('2026-07-18T01:05:00Z') });
  const sameWindow = buildMetaIncidentDedupeKey({ ...base, at: new Date('2026-07-18T01:55:00Z') });
  const nextWindow = buildMetaIncidentDedupeKey({ ...base, at: new Date('2026-07-18T02:05:00Z') });
  assert.equal(first, sameWindow);
  assert.notEqual(first, nextWindow);
});

test('metrics enforce an exact low-cardinality label contract', () => {
  resetMetaMetricsForTests();
  incrementMetaCounter('meta_capi_events_sent_total', { event_name: 'Purchase', outcome: 'sent' });
  setMetaGauge('meta_queue_backlog_total', { queue: 'meta-leads', status: 'queued' }, 12);
  assert.throws(() => incrementMetaCounter('meta_capi_events_sent_total', { event_name: 'Purchase', outcome: 'sent', retailer_id: 'sku-1' }), /METRIC_LABEL_CONTRACT/);
  assert.throws(() => setMetaGauge('meta_queue_backlog_total', { queue: 'contains spaces', status: 'queued' }, 1), /METRIC_HIGH_CARDINALITY_LABEL/);
  const output = renderMetaMetricsPrometheus();
  assert.match(output, /meta_capi_events_sent_total\{event_name="Purchase",outcome="sent"\} 1/);
  assert.match(output, /meta_queue_backlog_total\{queue="meta-leads",status="queued"\} 12/);
});

test('schema and migration persist diagnostics, incidents and trace identifiers', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const migration = fs.readFileSync('prisma/migrations/20260718020000_meta_v6_phase10_observability/migration.sql', 'utf8');
  for (const token of ['model MetaCatalogDiagnostic', 'model MetaCatalogDiagnosticItem', 'model MetaIncident', 'enum MetaIncidentStatus', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED']) assert.match(schema, new RegExp(token));
  assert.match(schema, /model MetaEventOutbox[\s\S]*correlationId\s+String/);
  assert.match(schema, /model MetaWebhookReceipt[\s\S]*correlationId\s+String\?/);
  assert.match(migration, /CREATE TABLE "MetaCatalogDiagnostic"/);
  assert.match(migration, /CREATE TABLE "MetaIncident"/);
  assert.match(migration, /MetaEventOutbox_correlationId_idx/);
});

test('diagnostics worker imports provider diagnostics and evaluates alerts', () => {
  const source = fs.readFileSync('workers/meta-diagnostics.worker.ts', 'utf8');
  assert.match(source, /importMetaCatalogDiagnostics/);
  assert.match(source, /evaluateMetaOperationalAlerts/);
  assert.match(source, /correlationId/);
});

test('protected observability APIs shape diagnostics and restrict raw metrics', () => {
  const diagnostics = fs.readFileSync('app/api/admin/meta/diagnostics/route.ts', 'utf8');
  const incidents = fs.readFileSync('app/api/admin/meta/incidents/route.ts', 'utf8');
  const health = fs.readFileSync('app/api/admin/meta/health/route.ts', 'utf8');
  const metrics = fs.readFileSync('app/api/admin/meta/metrics/route.ts', 'utf8');
  const trace = fs.readFileSync('app/api/admin/meta/correlations/[correlationId]/route.ts', 'utf8');
  for (const source of [diagnostics, incidents, health, trace]) assert.match(source, /requireAdminPermission/);
  assert.match(metrics, /META_OPS_AUDIT/);
  assert.doesNotMatch(diagnostics, /rawData:\s*true/);
  assert.match(trace, /getMetaCorrelationTimeline/);
});

test('incident engine contains stuck batch, silence, spike, backlog and mass-delete rules', () => {
  const source = fs.readFileSync('lib/observability/incidents.ts', 'utf8');
  for (const token of ['CATALOG_BATCH_STUCK', 'CATALOG_FAILURE_SPIKE', 'PURCHASE_SILENCE', 'WEBHOOK_SILENCE', 'QUEUE_BACKLOG', 'MASS_DELETE_CANDIDATE', 'cooldownUntil']) assert.match(source, new RegExp(token));
  assert.match(source, /recentCatalog >= 10 && failedCatalog \/ recentCatalog >= 0\.2/);
  assert.match(source, /Math\.max\(20, Math\.ceil\(totalCatalog \* 0\.25\)\)/);
});

test('CAPI and lead webhook flows propagate one correlation ID into durable jobs', () => {
  const outbox = fs.readFileSync('lib/meta/capi/outbox-repository.ts', 'utf8');
  const dispatcher = fs.readFileSync('lib/meta/capi/dispatcher.ts', 'utf8');
  const receipt = fs.readFileSync('lib/meta/leads/receipt.ts', 'utf8');
  const webhook = fs.readFileSync('app/api/webhooks/meta/route.ts', 'utf8');
  const queues = fs.readFileSync('lib/jobs/queues.ts', 'utf8');
  assert.match(outbox, /ensureCorrelationId\(input\.correlationId, 'meta-event'\)/);
  assert.match(dispatcher, /correlationId: record\.correlationId/);
  assert.match(receipt, /meta-webhook:/);
  assert.match(webhook, /correlationId: stored\.receipt\.correlationId/);
  assert.match(queues, /correlationId \?\? createCorrelationId\('meta-job'\)/);
});

test('correlation timeline excludes raw payload columns and covers all operational domains', () => {
  const source = fs.readFileSync('lib/observability/tracing.ts', 'utf8');
  for (const token of ['MetaAdminAudit', 'MetaJobAudit', 'MetaEventOutbox', 'MetaWebhookReceipt', 'MetaCatalogBatch', 'MetaCatalogDiagnostic', 'MetaIncident']) assert.match(source, new RegExp(token));
  assert.doesNotMatch(source, /SELECT[^`]*(payload|lastError|errorData)/i);
  assert.match(source, /redactObservabilityData/);
});

test('admin UI exposes diagnostics, incidents and correlation timeline controls', () => {
  const page = fs.readFileSync('app/admin/meta/page.tsx', 'utf8');
  for (const label of ['Diagnostics', 'Incidents', 'Trace', 'Import diagnostics', 'Acknowledge', 'Resolve', 'Correlation timeline']) assert.match(page, new RegExp(label));
  assert.match(page, /api\/admin\/meta\/correlations/);
});
