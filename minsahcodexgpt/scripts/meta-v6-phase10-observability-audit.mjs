#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
const has = (file, ...tokens) => { const source = read(file); return Boolean(source) && tokens.every((token) => source.includes(token)); };
const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260718020000_meta_v6_phase10_observability/migration.sql');
const trace = read('lib/observability/tracing.ts');
const diagnosticsRoute = read('app/api/admin/meta/diagnostics/route.ts');

const checks = [
  ['P10-01', 'Diagnostic severity enum', schema.includes('enum MetaCatalogDiagnosticSeverity') && schema.includes('CRITICAL')],
  ['P10-02', 'Diagnostic lifecycle enum', has('prisma/schema.prisma', 'enum MetaCatalogDiagnosticStatus', 'ACTIVE', 'RESOLVED')],
  ['P10-03', 'Aggregate diagnostic model', has('prisma/schema.prisma', 'model MetaCatalogDiagnostic', 'diagnosticKey', 'affectedItemCount', 'correlationId')],
  ['P10-04', 'Per-item diagnostic model', has('prisma/schema.prisma', 'model MetaCatalogDiagnosticItem', 'retailerId', 'providerItemId')],
  ['P10-05', 'Incident lifecycle enum', has('prisma/schema.prisma', 'enum MetaIncidentStatus', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED')],
  ['P10-06', 'Incident persistence', has('prisma/schema.prisma', 'model MetaIncident', 'dedupeKey', 'cooldownUntil', 'occurrenceCount')],
  ['P10-07', 'Forward migration', migration.includes('CREATE TABLE "MetaCatalogDiagnostic"') && migration.includes('CREATE TABLE "MetaIncident"')],
  ['P10-08', 'CAPI correlation persistence', /model MetaEventOutbox[\s\S]*correlationId\s+String/.test(schema) && migration.includes('MetaEventOutbox_correlationId_idx')],
  ['P10-09', 'Queue correlation persistence', /model MetaJobAudit[\s\S]*correlationId\s+String\?/.test(schema)],
  ['P10-10', 'Webhook correlation persistence', /model MetaWebhookReceipt[\s\S]*correlationId\s+String\?/.test(schema)],
  ['P10-11', 'Catalog batch correlation persistence', /model MetaCatalogBatch[\s\S]*correlationId\s+String\?/.test(schema)],
  ['P10-12', 'Recursive redaction', has('lib/observability/redaction.ts', 'REDACTED_EMAIL', 'REDACTED_PHONE', 'rawpayload')],
  ['P10-13', 'Safe correlation validator', has('lib/observability/correlation.ts', 'SAFE_ID', 'normalizeCorrelationId', 'ensureCorrelationId')],
  ['P10-14', 'Structured Meta logger', has('lib/observability/logger.ts', 'writeMetaLog', 'correlationId', 'sanitizeValue')],
  ['P10-15', 'Low-cardinality metrics contract', has('lib/observability/metrics.ts', 'METRIC_LABEL_CONTRACT', 'METRIC_HIGH_CARDINALITY_LABEL', 'BANNED_LABEL_KEYS')],
  ['P10-16', 'Required metric families', has('lib/observability/metrics.ts', 'meta_catalog_diagnostics_errors_total', 'meta_capi_events_failed_total', 'meta_queue_backlog_total', 'meta_token_check_failed_total')],
  ['P10-17', 'Provider diagnostics fetcher', has('lib/meta-platform/domains/catalog/service.ts', '/diagnostics', 'sample_affected_items', 'number_of_affected_items') && has('lib/meta/catalog/diagnostics.ts', 'fetchCatalogDiagnosticsThroughMetaPlatform')],
  ['P10-18', 'Diagnostic normalizer', has('lib/meta/catalog/diagnostics.ts', 'normalizeCatalogDiagnostic', 'diagnosticKey', 'uniqueItems')],
  ['P10-19', 'Diagnostic persistence and stale resolution', has('lib/meta/catalog/diagnostics.ts', 'metaCatalogDiagnostic.upsert', 'metaCatalogDiagnosticItem.upsert', "status: 'RESOLVED'")],
  ['P10-20', 'Diagnostic incident creation', has('lib/meta/catalog/diagnostics.ts', 'openOrRefreshMetaIncident', 'CATALOG_DIAGNOSTIC')],
  ['P10-21', 'Diagnostic worker', has('workers/meta-diagnostics.worker.ts', 'importMetaCatalogDiagnostics', 'evaluateMetaOperationalAlerts')],
  ['P10-22', 'Incident dedupe buckets', has('lib/observability/incidents.ts', 'buildMetaIncidentDedupeKey', 'timeWindowMinutes', 'sha256')],
  ['P10-23', 'Incident cooldown', has('lib/observability/incidents.ts', 'cooldownUntil', 'cooldownMinutes', 'occurrenceCount')],
  ['P10-24', 'Stuck batch alert', has('lib/observability/incidents.ts', 'CATALOG_BATCH_STUCK', '30 * 60_000')],
  ['P10-25', 'Failure spike alert', has('lib/observability/incidents.ts', 'CATALOG_FAILURE_SPIKE', 'failedCatalog / recentCatalog >= 0.2')],
  ['P10-26', 'Silence alerts', has('lib/observability/incidents.ts', 'PURCHASE_SILENCE', 'WEBHOOK_SILENCE')],
  ['P10-27', 'Queue and mass-delete alerts', has('lib/observability/incidents.ts', 'QUEUE_BACKLOG', 'MASS_DELETE_CANDIDATE', 'massDeleteThreshold')],
  ['P10-28', 'Protected diagnostics API', diagnosticsRoute.includes('META_OPS_VIEW') && diagnosticsRoute.includes('requireSuperAdmin') && !/rawData:\s*true/.test(diagnosticsRoute)],
  ['P10-29', 'Protected incident lifecycle API', has('app/api/admin/meta/incidents/[incidentId]/route.ts', 'META_OPS_OPERATE', 'META_INCIDENT_ACKNOWLEDGE', 'META_INCIDENT_RESOLVE')],
  ['P10-30', 'Protected aggregate health', has('app/api/admin/meta/health/route.ts', 'META_OPS_VIEW', 'getMetaAggregateHealth')],
  ['P10-31', 'Restricted metrics endpoint', has('app/api/admin/meta/metrics/route.ts', 'META_OPS_AUDIT', 'renderMetaMetricsPrometheus')],
  ['P10-32', 'Unified correlation timeline', ['MetaAdminAudit', 'MetaJobAudit', 'MetaEventOutbox', 'MetaWebhookReceipt', 'MetaCatalogBatch', 'MetaCatalogDiagnostic', 'MetaIncident'].every((token) => trace.includes(token))],
  ['P10-33', 'Timeline excludes raw payload columns', !/SELECT[^`]*(payload|lastError|errorData)/i.test(trace) && trace.includes('redactObservabilityData')],
  ['P10-34', 'Protected correlation API', has('app/api/admin/meta/correlations/[correlationId]/route.ts', 'META_OPS_VIEW', 'getMetaCorrelationTimeline')],
  ['P10-35', 'CAPI correlation propagation', has('lib/meta/capi/dispatcher.ts', 'correlationId: record.correlationId') && has('lib/queue/metaCapiOutboxQueue.ts', 'correlationId')],
  ['P10-36', 'Webhook correlation propagation', has('lib/meta/leads/receipt.ts', 'meta-webhook:', 'correlationId') && has('app/api/webhooks/meta/route.ts', 'correlationId: stored.receipt.correlationId')],
  ['P10-37', 'Operations Center diagnostics UI', has('app/admin/meta/page.tsx', 'Catalog Diagnostics', 'Import diagnostics', 'affected retailer IDs')],
  ['P10-38', 'Operations Center incident UI', has('app/admin/meta/page.tsx', 'Incident inbox', 'Acknowledge', 'Resolve')],
  ['P10-39', 'Operations Center trace UI', has('app/admin/meta/page.tsx', 'Correlation timeline', 'api/admin/meta/correlations')],
  ['P10-40', 'Semantic test suite', has('tests/meta-v6/phase10-observability-diagnostics.test.ts', 'incident deduplication', 'low-cardinality label contract', 'correlation timeline')],
];
const failures = checks.filter(([, , ok]) => !ok);
for (const [id, label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${label}`);
console.log(`\nPhase 10 static audit: ${checks.length - failures.length}/${checks.length} passed`);
if (failures.length) process.exit(1);
