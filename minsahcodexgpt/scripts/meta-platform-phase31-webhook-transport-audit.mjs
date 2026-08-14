#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });
const includesAll = (source, values) => values.every((value) => source.includes(value));

const handler = read('lib/meta-platform/transports/webhook/route-handler.ts');
const parser = read('lib/meta-platform/transports/webhook/parser.ts');
const routing = read('lib/meta-platform/transports/webhook/routing.ts');
const handoff = read('lib/meta-platform/transports/webhook/handoff.ts');
const contract = read('lib/meta-platform/contracts/webhook.ts');
const index = read('lib/meta-platform/transports/webhook/index.ts');
const signature = read('lib/meta-platform/transports/webhook/signature.ts');
const challenge = read('lib/meta-platform/transports/webhook/challenge.ts');
const leadRoute = read('app/api/webhooks/meta/route.ts');
const leadAlias = read('app/api/webhooks/meta/leadgen/route.ts');
const leadAdapter = read('lib/meta/leads/verify.ts');
const leadHandoff = read('lib/meta/leads/handoff.ts');
const leadReceipt = read('lib/meta/leads/receipt.ts');
const instagramRoute = read('app/api/webhooks/meta/instagram/route.ts');
const instagramAdapter = read('lib/meta/instagram/webhook.ts');
const instagramService = read('lib/meta/instagram/service.ts');
const instagramMessages = read('lib/meta/instagram/messages.ts');
const movedFacebookRoute = read('app/api/webhook/facebook/route.ts');
const movedSocialRoute = read('app/api/social/webhook/route.ts');
const packageJson = JSON.parse(read('package.json'));

check('shared route boundary defines bounded raw-body and signature verification', includesAll(handler, [
  'META_WEBHOOK_DEFAULT_MAX_BYTES',
  'META_WEBHOOK_ABSOLUTE_MAX_BYTES',
  'CONTENT_LENGTH_INVALID',
  'PAYLOAD_TOO_LARGE',
  'BODY_READ_FAILED',
  'readAndVerifyMetaWebhookRequest',
  "input.request.headers.get('content-length')",
  'await input.request.text()',
  "Buffer.byteLength(rawBody, 'utf8')",
  'verifyMetaWebhookSignature',
]));
check('declared content length is rejected before body consumption', handler.indexOf('contentLength > maxBytes') < handler.indexOf('await input.request.text()'));
check('signature verification occurs only after actual byte-limit enforcement', handler.indexOf("Buffer.byteLength(rawBody, 'utf8')") < handler.lastIndexOf('verifyMetaWebhookSignature'));
check('challenge query names are extracted only in the shared request boundary', includesAll(handler, [
  'verifyMetaWebhookChallengeRequest',
  "input.searchParams.get('hub.mode')",
  "input.searchParams.get('hub.verify_token')",
  "input.searchParams.get('hub.challenge')",
]));
check('shared route boundary exposes consistent safe public failure messages', includesAll(handler, [
  'metaWebhookRequestFailureMessage',
  'Webhook payload too large',
  'Webhook verification unavailable',
  'Invalid webhook request',
  'Invalid webhook signature',
]));
check('HMAC implementation remains centralized in webhook transport signature module', signature.includes("createHmac('sha256'") && !handler.includes('createHmac(') && !leadRoute.includes('createHmac(') && !instagramRoute.includes('createHmac('));
check('constant-time comparison remains centralized for signatures and challenges', signature.includes('timingSafeEqual') && challenge.includes('timingSafeEqual'));

check('normalized webhook contract carries explicit event kind and routing target', includesAll(contract, [
  'META_WEBHOOK_EVENT_KINDS',
  'META_WEBHOOK_ROUTING_TARGETS',
  'eventKind: MetaWebhookEventKind',
  'routingTarget: MetaWebhookRoutingTarget',
]));
check('shared envelope parser enforces bounded entries and event counts without slicing', includesAll(parser, [
  'META_WEBHOOK_MAX_ENTRIES = 100',
  'META_WEBHOOK_MAX_EVENTS_PER_GROUP = 500',
  'META_WEBHOOK_MAX_EVENTS_TOTAL = 1_000',
  'META_WEBHOOK_ENTRY_LIMIT_EXCEEDED',
  'META_WEBHOOK_EVENT_GROUP_LIMIT_EXCEEDED',
  'META_WEBHOOK_EVENT_LIMIT_EXCEEDED',
]) && !parser.includes('.slice(0, META_WEBHOOK_MAX'));
check('shared envelope parser validates object, entry, group and event shapes fail closed', includesAll(parser, [
  'META_WEBHOOK_OBJECT_INVALID',
  'META_WEBHOOK_ENTRY_INVALID',
  'META_WEBHOOK_${input.group.toUpperCase()}_INVALID',
  "group: 'changes'",
  "group: 'messaging'",
  "group: 'standby'",
  'META_WEBHOOK_EVENT_INVALID',
]));
check('shared parsing is cryptographically bound to the verified payload digest', includesAll(parser, [
  'expectedPayloadDigest',
  'META_WEBHOOK_PAYLOAD_DIGEST_MISMATCH',
  'digestMetaWebhookPayload(bytes)',
]));
check('shared parser normalizes provider object, field and timestamps before routing', includesAll(parser, [
  'objectType = boundedString',
  '.toLowerCase()',
  'eventValue?.timestamp',
  'eventValue?.created_time',
  'routeMetaWebhookEvent',
]));
check('shared router deterministically separates Lead Ads, Instagram, Facebook Page and unsupported events', includesAll(routing, [
  "routingTarget: 'LEAD_ADS'",
  "routingTarget: 'INSTAGRAM'",
  "routingTarget: 'FACEBOOK_PAGE'",
  "routingTarget: 'UNSUPPORTED'",
  "eventKind: 'LEADGEN'",
  "eventKind: 'MESSAGE'",
  "field === 'comments' ? 'COMMENT' : 'CHANGE'",
]));
check('shared parser exposes parse-normalize and immutable target selection helpers', includesAll(parser, [
  'parseAndNormalizeMetaWebhookNotifications',
  'selectMetaWebhookNotifications',
  'Object.freeze(input.notifications.filter',
]));
check('shared receipt handoff defines explicit accepted, duplicate, deferred, rejected and ignored dispositions', includesAll(handoff, [
  'META_WEBHOOK_HANDOFF_MAX_ITEMS = 1_000',
  'META_WEBHOOK_HANDOFF_DISPOSITIONS',
  "'ACCEPTED'",
  "'DUPLICATE'",
  "'DEFERRED'",
  "'REJECTED'",
  "'IGNORED'",
  "MetaWebhookHandoffOutcome = MetaWebhookHandoffDisposition | 'MIXED'",
]));
check('shared receipt handoff requires durable receipt identity for every non-ignored disposition', includesAll(handoff, [
  "['ACCEPTED', 'DUPLICATE', 'DEFERRED', 'REJECTED'].includes",
  'META_WEBHOOK_HANDOFF_RECEIPT_REQUIRED',
  'META_WEBHOOK_HANDOFF_IGNORED_RECEIPT_FORBIDDEN',
  'META_WEBHOOK_HANDOFF_RECORD_FIELD_INVALID',
  'META_WEBHOOK_HANDOFF_SUMMARY_INVALID',
  'META_WEBHOOK_HANDOFF_ITEM_LIMIT_EXCEEDED',
]));
check('shared receipt handoff deduplicates repeated event keys within one provider delivery', includesAll(handoff, [
  'const seen = new Map',
  'DUPLICATE_IN_DELIVERY',
  'seen.set(eventKey, record)',
]));
check('shared receipt handoff exposes consistent success, transport rejection, envelope rejection and store-unavailable response shapes', includesAll(handoff, [
  'metaWebhookHandoffResponse',
  'metaWebhookRequestFailureResponse',
  'metaWebhookEnvelopeFailureResponse',
  'metaWebhookHandoffUnavailableResponse',
  "code: 'META_WEBHOOK_HANDOFF_UNAVAILABLE'",
  "outcome: 'DEFERRED'",
]));
check('webhook transport public index exports request, parser, routing, handoff and contract boundaries', includesAll(index, [
  'readAndVerifyMetaWebhookRequest',
  'verifyMetaWebhookChallengeRequest',
  'metaWebhookRequestFailureMessage',
  'parseAndNormalizeMetaWebhookNotifications',
  'selectMetaWebhookNotifications',
  'routeMetaWebhookEvent',
  'handoffMetaWebhookItems',
  'summarizeMetaWebhookHandoff',
  'metaWebhookHandoffResponse',
  'META_WEBHOOK_EVENT_KINDS',
  'META_WEBHOOK_ROUTING_TARGETS',
]));

check('Lead Ads adapter consumes only routed normalized leadgen events', includesAll(leadAdapter, [
  'normalizeMetaLeadWebhookNotifications',
  "event.routingTarget !== 'LEAD_ADS'",
  "event.eventKind !== 'LEADGEN'",
  'event.payload.value',
  'event.payloadDigest',
]));
check('Lead Ads route parses once then delegates only to normalized receipt handoff', includesAll(leadRoute, [
  'readAndVerifyMetaWebhookRequest',
  'parseAndNormalizeMetaWebhookNotifications',
  'expectedPayloadDigest: transport.payloadDigest',
  'handoffMetaLeadWebhookNotifications',
  'events: parsed.notifications',
  'rawPayload: parsed.envelope',
  'metaWebhookHandoffResponse(summary)',
]) && !leadRoute.includes('JSON.parse(') && !leadRoute.includes('parseMetaLeadWebhookPayload') && !leadRoute.includes('enqueueMetaLeadFetchJob') && !leadRoute.includes('createVerifiedMetaWebhookReceipt'));
check('Lead Ads route verifies transport before parsing and parsing before receipt handoff', leadRoute.indexOf('if (!transport.ok)') < leadRoute.lastIndexOf('parseAndNormalizeMetaWebhookNotifications') && leadRoute.lastIndexOf('parseAndNormalizeMetaWebhookNotifications') < leadRoute.indexOf('await handoffMetaLeadWebhookNotifications'));
const leadEnqueueCall = leadHandoff.includes('await enqueueMetaLeadProcessingJob')
  ? 'await enqueueMetaLeadProcessingJob'
  : 'await enqueueMetaLeadFetchJob';
check('Lead Ads handoff persists rejected and accepted events before queue operations', includesAll(leadHandoff, [
  'normalizeMetaLeadWebhookNotifications',
  'recordRejectedMetaWebhook',
  'createVerifiedMetaWebhookReceipt',
  leadEnqueueCall,
  "disposition: 'REJECTED'",
  "disposition: 'DEFERRED'",
  "code: 'QUEUE_HANDOFF_FAILED'",
]) && leadHandoff.indexOf('await createVerifiedMetaWebhookReceipt') < leadHandoff.indexOf(leadEnqueueCall));
check('Lead Ads handoff skips terminal queued or processed receipts and honors queue idempotency duplicates', includesAll(leadHandoff, [
  "['QUEUED', 'PROCESSED'].includes",
  "disposition: 'DUPLICATE'",
  'QUEUE_IDEMPOTENCY_DUPLICATE',
]) && (leadHandoff.includes('queued.deduplicated') || leadHandoff.includes('queued.result.deduplicated')));
check('rejected Lead Ads receipts return the durable existing receipt identity on conflict', includesAll(leadReceipt, [
  'ON CONFLICT ("eventKey") DO UPDATE',
  'RETURNING "id","eventKey","correlationId"',
  'created: rows[0]?.id === id',
]));

check('Instagram adapter consumes only routed normalized Instagram events', includesAll(instagramAdapter, [
  'normalizeInstagramWebhookEvents',
  "event.routingTarget !== 'INSTAGRAM'",
  "event.eventKind === 'MESSAGE'",
  "event.eventKind === 'COMMENT'",
  'event.occurredAt',
  'event.payloadDigest',
]));
check('Instagram route uses shared verified parsing, normalized adapter and handoff response', includesAll(instagramRoute, [
  'readAndVerifyMetaWebhookRequest',
  'parseAndNormalizeMetaWebhookNotifications',
  'expectedPayloadDigest: transport.payloadDigest',
  'normalizeInstagramWebhookEvents(parsed.notifications)',
  'receiveInstagramWebhookEvents',
  'metaWebhookHandoffResponse(summary)',
]) && !instagramRoute.includes('JSON.parse(') && !instagramRoute.includes('normalizeInstagramWebhookPayload'));
check('Instagram route verifies transport before parsing and parsing before persistence handoff', instagramRoute.indexOf('if (!transport.ok)') < instagramRoute.lastIndexOf('parseAndNormalizeMetaWebhookNotifications') && instagramRoute.lastIndexOf('parseAndNormalizeMetaWebhookNotifications') < instagramRoute.indexOf('await receiveInstagramWebhookEvents'));
check('Instagram adapter no longer invents timestamps or hides duplicate event keys before shared handoff', !instagramAdapter.includes('return new Date()') && !instagramAdapter.includes('Date.now()') && !instagramAdapter.includes('new Map(normalized.map'));
const instagramReceiptPersistence = instagramMessages.slice(
  instagramMessages.indexOf('persistInstagramWebhookReceipt'),
  instagramMessages.indexOf('async function persistAttachment'),
);
check('Instagram receipt persistence is canonical-first, immutable on duplicate delivery and handles create races', includesAll(instagramReceiptPersistence, [
  'createOrGetMetaSocialWebhookReceipt',
  'findUnique({ where: { eventKey: event.eventKey } })',
  'metaInstagramWebhookReceipt.create',
  'linkMetaSocialWebhookLegacyReceipt',
  'receipt: existing, created: false, canonicalReceipt',
  'receipt: raced, created: false, canonicalReceipt',
]) && instagramReceiptPersistence.indexOf('await createOrGetMetaSocialWebhookReceipt') < instagramReceiptPersistence.indexOf('await db.metaInstagramWebhookReceipt.findUnique') && !instagramReceiptPersistence.includes('upsert('));
check('Instagram receipt handoff skips terminal receipts and converts durable enqueue failures to deferred', includesAll(instagramService, [
  'handoffMetaWebhookItems',
  "['QUEUED', 'PROCESSING', 'PROCESSED', 'IGNORED'].includes",
  "disposition: 'DUPLICATE'",
  "disposition: 'DEFERRED'",
  "code: 'QUEUE_HANDOFF_FAILED'",
  'summarizeMetaWebhookHandoff',
]));

check('both active routes use the same public rejection, envelope, accepted and unavailable response builders', includesAll(leadRoute, [
  'metaWebhookRequestFailureResponse',
  'metaWebhookEnvelopeFailureResponse',
  'metaWebhookHandoffResponse',
  'metaWebhookHandoffUnavailableResponse',
]) && includesAll(instagramRoute, [
  'metaWebhookRequestFailureResponse',
  'metaWebhookEnvelopeFailureResponse',
  'metaWebhookHandoffResponse',
  'metaWebhookHandoffUnavailableResponse',
]));

check('Leadgen compatibility route keeps direct static runtime configuration', includesAll(leadAlias, [
  "export const dynamic = 'force-dynamic'",
  "export const runtime = 'nodejs'",
  "export { GET, POST } from '../route'",
]));
const facebookRouteIsLegacyTombstone = includesAll(movedFacebookRoute, ['DISABLED', 'status: 410']) && !movedFacebookRoute.includes('request.text()');
const facebookRouteIsSignedPlatformHandoff = includesAll(movedFacebookRoute, [
  'verifyInternalRealtimeBridgeRequest',
  'getMetaFacebookRealtimeCutoverStatus',
  'verifyMetaWebhookSignature',
  'requestFacebookInboxSyncProduction',
  "error: 'FACEBOOK_LEGACY_AUTHORITY_ACTIVE'",
]) && !movedFacebookRoute.includes('processIncomingInboxMessage');
check('Facebook webhook endpoint is either a non-processing tombstone or the signed platform handoff', (facebookRouteIsLegacyTombstone || facebookRouteIsSignedPlatformHandoff) && includesAll(movedSocialRoute, ['DISABLED', 'status: 410']) && !movedSocialRoute.includes('request.text()'));
check('active webhook routes do not import legacy local verification wrappers', !leadRoute.includes("@/lib/meta/leads/signature") && !leadRoute.includes('verifyMetaWebhookChallenge }') && !instagramRoute.includes("@/lib/meta/instagram/verify"));
check('focused Phase 31 webhook runtime and static audit scripts are registered', packageJson.scripts['test:meta-v6-phase31-webhooks']?.includes('phase31-meta-social-crm-webhook-transport.test.mjs') && packageJson.scripts['qa:meta-platform-phase31-webhooks'] === 'node scripts/meta-platform-phase31-webhook-transport-audit.mjs');
const webhookAggregate = packageJson.scripts['qa:phase31-meta-webhooks'];
const webhookWrapper = read('scripts/meta-v6-phase31-webhook-audit.mjs');
const phase31AuditContract = read('scripts/meta-v6-phase31-audit-contract.mjs');
check('Phase 31 webhook aggregate gate uses the deterministic static wrapper with runtime, audit and inventory commands', webhookAggregate === 'node scripts/meta-v6-phase31-webhook-audit.mjs' && webhookWrapper.includes("runPhase31StaticAuditCli('webhooks')") && includesAll(phase31AuditContract, [
  "'test:meta-v6-phase31-webhooks'",
  "'qa:meta-platform-phase31-webhooks'",
  "'qa:meta-platform-inventory'",
]));

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}`);
const passed = checks.filter((item) => item.ok).length;
console.log(`\nPhase 31 webhook transport audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
