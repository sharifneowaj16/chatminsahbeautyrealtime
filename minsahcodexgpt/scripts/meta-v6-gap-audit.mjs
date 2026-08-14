#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const jsonMode = process.argv.includes('--json');

function read(file) {
  const full = path.join(root, file);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}
function exists(file) {
  return fs.existsSync(path.join(root, file));
}
function has(file, ...tokens) {
  const source = read(file);
  return source.length > 0 && tokens.every((token) => source.includes(token));
}
function section(source, startPattern, endPattern = /^\}/m) {
  const start = source.search(startPattern);
  if (start < 0) return '';
  const tail = source.slice(start);
  const end = tail.slice(1).search(endPattern);
  return end < 0 ? tail : tail.slice(0, end + 1);
}
function repoSource(files) {
  return files.map((file) => `\n/* ${file} */\n${read(file)}`).join('\n');
}

const catalog = repoSource([
  'lib/meta-business/catalog.ts',
  'lib/meta/catalog/domain/types.ts',
  'lib/meta/catalog/domain/availability.ts',
  'lib/meta/catalog/domain/sale-period.ts',
  'lib/meta/catalog/adapters/items-batch.ts',
  'lib/meta/catalog/adapters/csv-feed.ts',
  'lib/meta/catalog/mapper.ts',
]);
const schema = read('prisma/schema.prisma');
const variantModel = section(schema, /^model ProductVariant \{/m);
const envExample = read('.env.example');
const metaSdk = read('lib/tracking/meta-business-sdk.ts');
const queue = repoSource(['lib/queue/metaCapiQueue.ts', 'lib/jobs/retry-policy.ts', 'lib/jobs/dead-letter.ts']);
const trackingRawSources = repoSource([
  'lib/tracking/events.ts',
  'app/api/search/clicks/route.ts',
]);

const checks = [
  {
    id: 'A1',
    phase: [2],
    label: '/items_batch uses adapter-specific current write fields',
    ok:
      catalog.includes('quantity_to_sell_on_facebook') &&
      catalog.includes('image_link') &&
      catalog.includes('item_group_id') &&
      catalog.includes('link') &&
      !/\binventory\s*:/.test(catalog.match(/function .*items.*batch[\s\S]*/i)?.[0] ?? catalog),
    evidence: 'Expected quantity_to_sell_on_facebook, link, image_link, item_group_id and formatted price; legacy inventory/url/image_url/group fields must leave the write adapter.',
  },
  {
    id: 'A2',
    phase: [2],
    label: 'Zero-stock backorder maps to available for order',
    ok: catalog.includes('available for order'),
    evidence: "Expected explicit availability value 'available for order'.",
  },
  {
    id: 'A3',
    phase: [2],
    label: 'Future sale is emitted with effective date range',
    ok:
      catalog.includes('sale_price_effective_date') &&
      !catalog.includes('offerStartDate > input.now) return undefined'),
    evidence: 'Expected future sale_price plus sale_price_effective_date; future start must not be discarded.',
  },
  {
    id: 'A4',
    phase: [1, 3],
    label: 'No raw database productId in Meta content_ids',
    ok:
      !/content_ids\s*:\s*\[\s*productId\s*\]/.test(trackingRawSources) &&
      !/content_ids\s*:\s*\[\s*click\.productId\s*\]/.test(trackingRawSources),
    evidence: 'Migrate all item event content_ids through the canonical Meta catalog identity builder.',
  },
  {
    id: 'A5',
    phase: [1],
    label: 'Server/public catalog identity sources are configured and parity-validated',
    ok:
      envExample.includes('META_CATALOG_ID_SOURCE=') &&
      envExample.includes('NEXT_PUBLIC_META_CATALOG_ID_SOURCE=') &&
      exists('lib/tracking/meta-content-id-server.ts') &&
      has('lib/tracking/meta-content-id-server.ts', 'META_CATALOG_ID_SOURCE', 'NEXT_PUBLIC_META_CATALOG_ID_SOURCE'),
    evidence: 'Expected a server-only parity validator and both environment variables.',
  },
  {
    id: 'A6',
    phase: [7, 15],
    label: 'Graph API version policy has an upgrade/expiry gate',
    ok:
      exists('scripts/meta-graph-version-policy-audit.mjs') &&
      (schema.includes('MetaApiVersionPolicy') || exists('config/meta-api-version-policy.json')),
    evidence: 'Expected controlled version policy, warning/block dates and a CI/deploy gate.',
  },
  {
    id: 'A7',
    phase: [2],
    label: 'ProductVariant supports lifecycle, sale, availability and identifiers',
    ok: [
      'isActive',
      'deletedAt',
      'salePrice',
      'offerStartDate',
      'offerEndDate',
      'allowBackorder',
      'availabilityMode',
      'preorderAvailableOn',
      'gtin',
      'mpn',
      'barcode',
      'condition',
    ].every((token) => variantModel.includes(token)),
    evidence: 'ProductVariant must carry independent lifecycle/sale/availability/identifier metadata.',
  },
  {
    id: 'A8',
    phase: [6],
    label: 'Non-essential tracking defaults to false',
    ok: /nonEssentialTrackingAllowed\s+Boolean\s+@default\(false\)/.test(schema),
    evidence: 'Schema default must be false with an explicit historical backfill policy.',
  },
  {
    id: 'A9',
    phase: [4],
    label: 'Meta CAPI uses a database transactional outbox',
    ok:
      schema.includes('model MetaEventOutbox') &&
      schema.includes('enum MetaEventOutboxStatus') &&
      repoSource(['lib/meta/capi/outbox-repository.ts', 'lib/meta/capi/purchase-outbox.ts', 'app/api/payments/verified/route.ts', 'app/api/telegram/order-callback/route.ts']).includes('createMetaPurchaseOutboxInTransaction'),
    evidence: 'Expected outbox insertion in the same DB transaction as the business event.',
  },
  {
    id: 'A10',
    phase: [5],
    label: 'Meta retry schedule covers immediate, 1m, 5m, 15m and 1h',
    ok: ['60_000', '300_000', '900_000', '3_600_000'].every((token) => queue.includes(token)),
    evidence: 'Expected provider-specific durable retry schedule and DLQ classification.',
  },
  {
    id: 'A11',
    phase: [4],
    label: 'Shared CAPI web contract requires all website fields',
    ok:
      /event_source_url:\s*string/.test(metaSdk) &&
      /action_source:\s*['"]website['"]|action_source:\s*string/.test(metaSdk) &&
      !/event_source_url\?:/.test(metaSdk) &&
      !/action_source\?:/.test(metaSdk) &&
      metaSdk.includes('event_time') &&
      metaSdk.includes('event_name') &&
      metaSdk.includes('event_id') &&
      metaSdk.includes('user_data') &&
      metaSdk.includes('custom_data'),
    evidence: 'Required website fields must be mandatory in one canonical adapter contract.',
  },
  {
    id: 'A12',
    phase: [2],
    label: 'Canonical catalog item includes full presentation and merchandising fields',
    ok: [
      'additional_image_link',
      'product_type',
      'custom_label_0',
      'condition',
      'brand',
      'visibility',
    ].every((token) => catalog.includes(token)),
    evidence: 'Expected full canonical presentation fields before adapter serialization.',
  },
  {
    id: 'A13',
    phase: [2, 4, 7, 8, 10, 13],
    label: 'Meta lifecycle statuses use Prisma enums',
    ok: [
      'enum MetaJobStatus',
      'enum MetaCatalogBatchStatus',
      'enum MetaEventOutboxStatus',
      'enum MetaLeadStatus',
      'enum MetaConnectionStatus',
      'enum MetaWebhookProcessingStatus',
    ].every((token) => schema.includes(token)) &&
      (schema.includes('enum MetaApprovalStatus') || schema.includes('enum MetaAdminApprovalStatus')),
    evidence: 'Expected explicit enums for jobs, batches, events, leads, connections, webhooks and approvals.',
  },
  {
    id: 'A14',
    phase: [10],
    label: 'Catalog Diagnostics are persisted and exposed',
    ok:
      schema.includes('model MetaCatalogDiagnostic') &&
      exists('app/api/admin/meta/catalogs/diagnostics/route.ts'),
    evidence: 'Expected per-item diagnostic ingestion, API and admin visibility.',
  },
];

const passed = checks.filter((check) => check.ok);
const failed = checks.filter((check) => !check.ok);
const result = {
  ok: failed.length === 0,
  mode: strict ? 'strict' : 'report',
  passed: passed.length,
  failed: failed.length,
  total: checks.length,
  checks,
};

if (jsonMode) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Meta v6 blocker audit: ${passed.length}/${checks.length} passed`);
  for (const check of checks) {
    const phases = check.phase.map((value) => `P${value}`).join(',');
    console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.id} [${phases}] ${check.label}`);
    if (!check.ok) console.log(`     ${check.evidence}`);
  }
  console.log(strict
    ? '\nStrict gate is enabled: unresolved blockers fail the command.'
    : '\nReport mode: unresolved blockers are shown but do not fail the command.');
}
if (strict && failed.length > 0) process.exit(1);
