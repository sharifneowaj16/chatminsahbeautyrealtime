#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });

const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260717020000_meta_v6_phase4_capi_outbox/migration.sql');
const repository = read('lib/meta/capi/outbox-repository.ts');
const sender = read('lib/meta/capi/sender.ts');
const retry = read('lib/meta/capi/retry.ts');
const dispatcher = read('lib/meta/capi/dispatcher.ts');
const sdk = read('lib/tracking/meta-business-sdk.ts');
const payment = read('app/api/payments/verified/route.ts');
const telegram = read('app/api/telegram/order-callback/route.ts');
const admin = read('app/api/admin/orders/[id]/route.ts');
const browser = read('app/api/facebook-capi/route.ts');
const eventMonitor = read('app/api/admin/meta/events/route.ts');

check('MetaEventOutboxStatus enum', schema.includes('enum MetaEventOutboxStatus'));
check('MetaEventOutbox model', schema.includes('model MetaEventOutbox'));
check('status history model', schema.includes('model MetaEventOutboxStatusEvent'));
check('provider event_name event_id unique key', schema.includes('@@unique([provider, eventName, eventId])'));
check('status + nextAttemptAt index', schema.includes('@@index([status, nextAttemptAt])'));
check('migration creates enum', migration.includes('CREATE TYPE "MetaEventOutboxStatus"'));
check('migration creates outbox table', migration.includes('CREATE TABLE "MetaEventOutbox"'));
check('migration creates DB unique index', migration.includes('MetaEventOutbox_provider_eventName_eventId_key'));
check('repository conflict dedup', repository.includes('ON CONFLICT ("provider", "eventName", "eventId") DO NOTHING'));
check('repository SKIP LOCKED leasing', repository.includes('FOR UPDATE SKIP LOCKED'));
check('repository lease expiry recovery', repository.includes('"leaseExpiresAt" IS NULL OR "leaseExpiresAt" < NOW()'));
check('repository permanent and retry states', repository.includes('FAILED_PERMANENT') && repository.includes('RETRY_SCHEDULED'));
check('online payment atomic outbox', payment.includes('$transaction(async (tx)') && payment.includes('createMetaPurchaseOutboxInTransaction'));
check('Telegram COD atomic outbox', telegram.includes('$transaction(async (tx)') && telegram.includes('createMetaPurchaseOutboxInTransaction'));
check('admin COD atomic outbox', admin.includes('$transaction(async (tx)') && admin.includes('createMetaPurchaseOutboxInTransaction'));
check('business paths no direct Meta queue', !payment.includes('enqueueMetaCapiPurchase') && !telegram.includes('enqueueMetaCapiPurchase') && !admin.includes('enqueueMetaCapiPurchase'));
check('public core event persisted before queue', browser.includes('persistMetaCoreEventOutbox') && browser.includes('requestMetaOutboxDispatch'));
check('production test_event_code blocked', browser.includes("process.env.NODE_ENV !== 'production' && FACEBOOK_TEST_EVENT_CODE"));
check('website SDK action_source required', sdk.includes("action_source: 'website'"));
check('website SDK event_source_url required', sdk.includes('event_source_url: string;') && !sdk.includes('event_source_url?:'));
check('website SDK custom_data required', sdk.includes('custom_data: Record<string, unknown>;'));
check('dedicated dispatcher worker', exists('workers/meta-outbox-dispatcher.worker.ts') && dispatcher.includes('leaseDueMetaEventOutbox'));
check('dedicated sender worker', exists('workers/meta-capi-sender.worker.ts') && sender.includes('markMetaOutboxProcessing'));
check('bounded retry schedule and exhaustion', retry.includes('META_PROVIDER_MAX_ATTEMPTS') && sender.includes('META_DELIVERY_RETRY_EXHAUSTED') && read('lib/jobs/retry-policy.ts').includes('3_600_000'));
check('age and URL validator', exists('lib/meta/capi/validator.ts') && read('lib/meta/capi/validator.ts').includes('META_EVENT_MAX_AGE_SECONDS'));
check('SUPER_ADMIN event monitor exposes safe outbox state', eventMonitor.includes('requireSuperAdmin') && eventMonitor.includes('safePayload') && !eventMonitor.includes('payload: record.payload'));
check('manual replay preserves outbox event identity', eventMonitor.includes('requeueMetaOutboxById') && eventMonitor.includes('requestMetaOutboxDispatch'));

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}`);
console.log(`\nMeta v6 Phase 4 audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
