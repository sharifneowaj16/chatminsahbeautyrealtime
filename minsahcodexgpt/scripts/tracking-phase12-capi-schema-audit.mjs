#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const issues = [];

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    issues.push(`Missing required file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function expect(name, condition, details = '') {
  checks.push({ name, ok: Boolean(condition), details });
  if (!condition) issues.push(`${name}${details ? ` — ${details}` : ''}`);
}

function count(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

const packageJson = JSON.parse(read('package.json') || '{}');
const sdkDependency = packageJson.dependencies?.['facebook-nodejs-business-sdk'];
expect(
  'Official Meta Node.js Business SDK dependency is installed',
  typeof sdkDependency === 'string' && sdkDependency.includes('24.0.1'),
  String(sdkDependency ?? 'missing')
);
expect(
  'package.json exposes dedicated Business SDK QA',
  packageJson.scripts?.['qa:meta-business-sdk'] ===
    'node scripts/tracking-phase12-capi-schema-audit.mjs'
);

const adapter = read('lib/tracking/meta-business-sdk.ts');
expect('Central Meta Business SDK adapter exists', adapter.length > 0);
expect(
  'Business SDK adapter delegates package loading to the unified transport runtime',
  adapter.includes("@/lib/meta-platform/transports/business-sdk/runtime") &&
    !adapter.includes("from 'facebook-nodejs-business-sdk'")
);
const runtimeBoundary = read('lib/meta-platform/transports/business-sdk/runtime.ts');
expect(
  'Unified SDK transport owns the namespace import without a synthetic default',
  runtimeBoundary.includes("import * as businessSdkNamespace from 'facebook-nodejs-business-sdk'") &&
    !runtimeBoundary.includes("import businessSdkNamespace from 'facebook-nodejs-business-sdk'")
);
for (const token of [
  'getMetaBusinessSdkRuntime',
  'Content',
  'CustomData',
  'EventRequest',
  'ServerEvent',
  'UserData',
  'runtime.EventRequest',
  '.setPartnerAgent(',
  '.setHttpService(',
  'eventRequest.execute()',
  'META_CAPI_TIMEOUT_MS',
  'META_GRAPH_API_VERSION',
]) {
  expect(`Business SDK adapter contains ${token}`, adapter.includes(token));
}
expect(
  'SDK adapter preserves pre-hashed queue matching data without raw PII persistence',
  adapter.includes('setEmails(emails)') &&
    adapter.includes('setPhones(phones)') &&
    adapter.includes('setExternalIds(externalIds)')
);
expect(
  'SDK adapter preserves extended catalog/variant content properties',
  adapter.includes('Preserve existing catalog/variant metadata') &&
    adapter.includes('content.normalize = () =>')
);
expect(
  'SDK adapter retains request timeout/abort protection',
  adapter.includes('new AbortController()') && adapter.includes('controller.abort()')
);

const metaSchema = read('lib/tracking/meta-schema.ts');
expect('Central Meta schema helper exists', metaSchema.length > 0);
expect(
  'Meta Graph default version delegates to central registry',
  metaSchema.includes("@/lib/meta-platform/versioning/registry") &&
    metaSchema.includes('export { DEFAULT_META_GRAPH_API_VERSION, normalizeMetaGraphApiVersion }')
);
for (const token of [
  "export const TRACKING_SCHEMA_VERSION = 'mb_tracking_v1'",
  'normalizeMetaGraphApiVersion',
  'export const META_GRAPH_API_VERSION',
  'getMetaPixelId',
  'getMetaCapiAccessToken',
  'getMetaTestEventCode',
  'withMetaSchemaVersion',
  'withMetaCapiPayloadSchemaVersion',
  'withMetaSafePayloadSchema',
]) {
  expect(`meta-schema exports/contains ${token}`, metaSchema.includes(token));
}
expect(
  'Legacy direct CAPI URL builder is removed',
  !metaSchema.includes('buildMetaCapiEventsUrl')
);

const publicCapiRoute = read('app/api/facebook-capi/route.ts');
expect(
  'Public CAPI endpoint still blocks Purchase',
  publicCapiRoute.includes("payload.eventName === 'Purchase'") &&
    publicCapiRoute.includes('PURCHASE_NOT_ALLOWED_ON_PUBLIC_CAPI')
);
expect(
  'Public route persists SDK payloads through the transactional outbox',
  publicCapiRoute.includes('persistMetaCoreEventOutbox({') &&
    publicCapiRoute.includes('requestMetaOutboxDispatch(') &&
    publicCapiRoute.includes('Event persisted')
);
expect(
  'Public route exposes server SDK runtime mode without exposing credentials',
  publicCapiRoute.includes("mode: 'transactional-outbox-phase28-cutover'") &&
    publicCapiRoute.includes('META_BUSINESS_SDK_VERSION') &&
    publicCapiRoute.includes('verified-by-worker-runtime-contract')
);
expect(
  'Public route still records schema and safe matching summaries',
  publicCapiRoute.includes('withMetaSchemaVersion(') &&
    publicCapiRoute.includes('withMetaSafePayloadSchema({')
);

const queue = read('lib/queue/metaCapiQueue.ts');
expect(
  'Queue uses sdkPayload and remains compatible with already queued capiPayload jobs',
  queue.includes('sdkPayload?: Record<string, unknown>') &&
    queue.includes('capiPayload?: Record<string, unknown>')
);

const coreSender = read('lib/tracking/meta-capi-core-event.ts');
expect(
  'Core events are delivered through the Phase 28 Business SDK cutover facade',
  coreSender.includes('sendMetaCapiWithPhase28Cutover({') &&
    coreSender.includes('jobData.sdkPayload ?? jobData.capiPayload')
);
expect(
  'Core sender applies schema version at send time',
  coreSender.includes('withMetaCapiPayloadSchemaVersion(')
);
expect(
  'Core sender has no raw Graph CAPI fetch or URL construction',
  !coreSender.includes('fetch(') &&
    !coreSender.includes('graph.facebook.com') &&
    !coreSender.includes('buildMetaCapiEventsUrl')
);

const purchaseSender = read('lib/tracking/meta-capi-cod-purchase.ts');
expect(
  'COD and online Purchase use the Business SDK delivery helper',
  purchaseSender.includes('deliverPurchaseWithBusinessSdk') &&
    count(purchaseSender, /return deliverPurchaseWithBusinessSdk\(/g) === 2
);
expect(
  'Purchase sender has no raw Graph CAPI fetch or URL construction',
  !purchaseSender.includes('fetch(') &&
    !purchaseSender.includes('graph.facebook.com') &&
    !purchaseSender.includes('buildMetaCapiEventsUrl')
);
expect(
  'COD and online Purchase custom_data both include schema version',
  count(purchaseSender, /custom_data:\s*withMetaSchemaVersion\(/g) >= 2
);
expect(
  'Purchase event IDs remain Purchase-{orderId}',
  purchaseSender.includes('buildMetaPurchaseEventId(orderId)')
);
expect(
  'COD still requires phoneConfirmedAt',
  purchaseSender.includes('phoneConfirmedAt missing for COD Purchase')
);
expect(
  'Online Purchase still requires verified completed payment',
  purchaseSender.includes('signatureVerified: true') &&
    purchaseSender.includes('amountMatched: true') &&
    purchaseSender.includes('currencyMatched: true')
);
expect(
  'Purchase delivery retains database claim/idempotency',
  purchaseSender.includes('claimMetaPurchaseSend') &&
    purchaseSender.includes('markMetaPurchaseSent') &&
    purchaseSender.includes('releaseMetaPurchaseClaim')
);

const browserPixel = read('lib/tracking/pixels/FacebookPixel.tsx');
const paymentComplete = read('app/checkout/payment-complete/page.tsx');
const onlinePurchaseRoute = read('app/api/tracking/meta/online-purchase/route.ts');
expect(
  'Browser Pixel still sends eventID for Browser/Server deduplication',
  browserPixel.includes("eventName: 'PageView'") &&
    browserPixel.includes('dispatchMetaBrowserEvent(pageViewEvent)') &&
    read('lib/meta/browser/client.ts').includes('{ eventID: event.eventId }')
);
expect(
  'Browser Purchase still uses Purchase-{orderId}',
  onlinePurchaseRoute.includes('eventId: `Purchase-${order.id}`') &&
    paymentComplete.includes('payload.eventId') &&
    paymentComplete.includes("eventName: 'Purchase'") &&
    paymentComplete.includes('{ sendCapi: false }')
);

const directCapiFiles = [];
for (const relativeDir of ['app', 'lib']) {
  const absoluteDir = path.join(root, relativeDir);
  const stack = [absoluteDir];
  while (stack.length) {
    const current = stack.pop();
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(current)) stack.push(path.join(current, child));
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(current)) continue;
    const relative = path.relative(root, current);
    if (relative === 'lib/tracking/meta-business-sdk.ts') continue;
    const text = fs.readFileSync(current, 'utf8');
    if (/graph\.facebook\.com\/[^\s"'`]+\/events/.test(text)) directCapiFiles.push(relative);
  }
}
expect(
  'No server CAPI endpoint bypasses the Business SDK adapter',
  directCapiFiles.length === 0,
  directCapiFiles.join(', ')
);

expect(
  'Business SDK migration production notes exist',
  fs.existsSync(path.join(root, 'docs/production/meta-business-sdk-migration.md')) &&
    fs.existsSync(path.join(root, 'META_BUSINESS_SDK_MIGRATION.md'))
);
expect(
  'Phase 12 production notes exist',
  fs.existsSync(path.join(root, 'docs/production/phase-12-meta-capi-robustness-schema-version.md'))
);

const passed = checks.filter((check) => check.ok).length;
const failed = checks.length - passed;
const result = { ok: failed === 0, passed, failed, issueCount: issues.length, issues };

if (failed > 0) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
