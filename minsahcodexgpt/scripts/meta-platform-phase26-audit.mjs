#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });

const reliabilityRoot = 'lib/meta-platform/reliability';
const required = [
  'types.ts', 'scope.ts', 'errors.ts', 'deadline.ts', 'provider-usage.ts', 'retry.ts',
  'circuit-breaker.ts', 'rate-limit.ts', 'admission.ts', 'cache.ts', 'coordinator.ts',
  'health.ts', 'redis-state.ts', 'index.ts',
];
for (const file of required) check(`reliability source exists: ${file}`, exists(`${reliabilityRoot}/${file}`));

const pkg = JSON.parse(read('package.json'));
check('Phase 26 focused test script exists', pkg.scripts?.['test:meta-v6-phase26'] === 'node --conditions=react-server --import tsx --test tests/meta-v6/phase26-reliability-governance.test.ts');
check('Phase 26 architecture audit script exists', pkg.scripts?.['qa:meta-platform-phase26'] === 'node scripts/meta-platform-phase26-audit.mjs');
check('Phase 26 combined gate includes tests audit migrations and inventory', ['test:meta-v6-phase26', 'qa:meta-platform-phase26', 'qa:meta-v6-migrations', 'qa:meta-platform-inventory'].every((value) => (pkg.scripts?.['qa:meta-v6-phase26'] ?? '').includes(value)));
check('predeploy runs Phase 26 after Phase 25', (pkg.scripts?.['qa:predeploy'] ?? '').indexOf('qa:meta-v6-phase26') > (pkg.scripts?.['qa:predeploy'] ?? '').indexOf('qa:meta-v6-phase25'));

const types = read(`${reliabilityRoot}/types.ts`);
check('P0 through P4 priorities are exact and ordered', /\['P0', 'P1', 'P2', 'P3', 'P4'\]/.test(types));
check('circuit states are closed open and half-open', /\['CLOSED', 'OPEN', 'HALF_OPEN'\]/.test(types));
check('reliability scope is environment connection capability operation and asset aware', ['environment', 'connectionKey', 'capability', 'operation', 'assetType', 'assetId'].every((value) => types.includes(`readonly ${value}`)));
check('retry decisions distinguish retry defer fail and reconcile', /'RETRY' \| 'DEFER' \| 'FAIL' \| 'RECONCILE'/.test(types));

const scope = read(`${reliabilityRoot}/scope.ts`);
check('circuit scope key contains environment connection capability asset and operation', ['environment', 'connectionKey', 'capability', 'asset', 'operation'].every((value) => scope.includes(value)));
check('rate limiting creates app capability and asset keys', [':APP', ':CAPABILITY:', ':ASSET:'].every((value) => scope.includes(value)));
check('scope identifiers reject control characters', /\\r\\n\\0/.test(scope));

const deadline = read(`${reliabilityRoot}/deadline.ts`);
check('operation TTL defaults to 24 hours and is bounded to 30 days', /24 \* 60 \* 60/.test(deadline) && /30 \* 24 \* 60 \* 60/.test(deadline));
check('deadline budget computes remaining time and bounded timeout', /remainingMs/.test(deadline) && /boundedTimeout/.test(deadline));
check('deadline runner combines external abort and timeout', /AbortController/.test(deadline) && /addEventListener\('abort'/.test(deadline));
check('deadline expiry is a non-retryable timeout error', /META_OPERATION_DEADLINE_EXPIRED/.test(deadline) && /retryable: false/.test(deadline));

const providerUsage = read(`${reliabilityRoot}/provider-usage.ts`);
check('provider usage parses Retry-After seconds and HTTP date', /Number\(value\)/.test(providerUsage) && /new Date\(value\)/.test(providerUsage));
check('provider usage parses app page and ad-account usage', ['x-app-usage', 'x-page-usage', 'x-ad-account-usage'].every((value) => providerUsage.includes(value)));
check('business use case estimated regain time is parsed', /estimated_time_to_regain_access/.test(providerUsage));
check('provider usage can be recovered from normalized safe error details', /metaProviderUsageFromError/.test(providerUsage));

const retry = read(`${reliabilityRoot}/retry.ts`);
check('retry policy has priority-specific attempt budgets', ['P0: 12', 'P1: 10', 'P2: 8', 'P3: 6', 'P4: 4'].every((value) => retry.includes(value)));
check('retry policy has exponential backoff and jitter', /2 \*\*/.test(retry) && /this\.random/.test(retry));
check('provider retry-after overrides local jitter', /providerDelay \?\? jitter/.test(retry));
check('unsafe unknown non-idempotent writes require reconciliation', /META_OPERATION_UNKNOWN_OUTCOME/.test(retry) && /UNSAFE_WRITE_UNKNOWN_OUTCOME/.test(retry));
check('attempt exhaustion becomes terminal', /META_OPERATION_RETRY_EXHAUSTED/.test(retry));
check('retry is blocked when next attempt exceeds expiry', /next safe retry would occur after the operation expiry/.test(retry));
check('authentication and other non-retryable errors fail', /if \(!error\.retryable\)/.test(retry));

const circuit = read(`${reliabilityRoot}/circuit-breaker.ts`);
check('circuit state is abstracted behind a distributed store contract', /interface MetaCircuitStateStore/.test(circuit));
check('circuit opens after configurable consecutive failures', /failureThreshold/.test(circuit) && /consecutiveFailures/.test(circuit));
check('open circuit fails before provider execution', /META_CIRCUIT_OPEN/.test(circuit) && /throw new MetaReliabilityDecisionError/.test(circuit));
check('half-open probe uses a lease token and expiry', /probeLeaseToken/.test(circuit) && /probeLeaseExpiresAt/.test(circuit));
check('half-open success closes and resets failures', /recordSuccess/.test(circuit) && /consecutiveFailures: 0/.test(circuit));
check('rate limiting can force-open a circuit', /rateLimited/.test(circuit) && /forceOpen/.test(circuit));

const redis = read(`${reliabilityRoot}/redis-state.ts`);
check('Redis reliability adapter is server-only', /^import 'server-only';/m.test(redis));
check('Redis half-open probe acquisition is atomic Lua', /CIRCUIT_ACQUIRE/.test(redis) && /redis\.call\('HSET'/.test(redis) && /eval\(CIRCUIT_ACQUIRE/.test(redis));
check('Redis circuit success and failure are token fenced', /CIRCUIT_SUCCESS/.test(redis) && /CIRCUIT_FAILURE/.test(redis) && /probeToken/.test(redis));
check('Redis rate token bucket is atomic Lua', /RATE_CONSUME/.test(redis) && /tokens >= cost/.test(redis));
check('Redis reliability keys are versioned and namespaced', /meta:reliability:v1/.test(redis));
check('Redis state has bounded TTL cleanup', /PEXPIRE|pexpire/.test(redis));

const rate = read(`${reliabilityRoot}/rate-limit.ts`);
check('rate limiter uses a distributed state interface', /interface MetaRateLimitStateStore/.test(rate));
check('token bucket refills by elapsed time', /elapsedSeconds/.test(rate) && /refillPerSecond/.test(rate));
check('all app capability and asset budgets must pass', /for \(const key of metaRateLimitScopeKeys/.test(rate));
check('provider high-watermark creates distributed cooldown', /providerHighWatermarkPercent/.test(rate) && /blockUntil/.test(rate));
check('rate-limited requests return durable defer decisions', /META_RATE_LIMIT_DEFERRED/.test(rate) && /action: 'DEFER'/.test(rate));

const admission = read(`${reliabilityRoot}/admission.ts`);
check('queue admission has explicit P0-P4 capacity ratios', ['P0: 1.10', 'P1: 1.00', 'P2: 0.90', 'P3: 0.80', 'P4: 0.70'].every((value) => admission.includes(value)));
check('critical priority may use reserved capacity', /PRIORITY_RESERVED/.test(admission));
check('lower priority saturation returns queue backpressure', /META_QUEUE_BACKPRESSURE/.test(admission));
check('backpressure decision includes retry time and queue depth', /retryAt/.test(admission) && /queueDepth/.test(admission));
check('expired queued work is not admitted', /DEADLINE_EXPIRED/.test(admission));

const cache = read(`${reliabilityRoot}/cache.ts`);
check('read cache separates fresh and stale deadlines', /freshUntil/.test(cache) && /staleUntil/.test(cache));
check('fresh cache avoids provider load', /source: 'CACHE'/.test(cache));
check('provider failure may return bounded stale fallback', /STALE_FALLBACK/.test(cache));
check('stale fallback is not used after stale expiry', /new Date\(cached\.staleUntil\).*now/.test(cache));

const coordinator = read(`${reliabilityRoot}/coordinator.ts`);
check('coordinator checks deadline rate limit and circuit before provider call', coordinator.indexOf('budget.assertRemaining') < coordinator.indexOf('rateLimiter.acquire') && coordinator.indexOf('rateLimiter.acquire') < coordinator.indexOf('circuit.acquire') && coordinator.indexOf('circuit.acquire') < coordinator.indexOf('input.operation'));
check('coordinator records circuit success and failure', /recordSuccess/.test(coordinator) && /recordFailure/.test(coordinator));
check('coordinator observes provider usage headers', /observeProviderUsage/.test(coordinator));
check('only immediate retry sleeps in-process; defer is thrown to durable layer', /decision\.action !== 'RETRY'/.test(coordinator) && /sleepImpl/.test(coordinator));

const operationsTypes = read('lib/meta-platform/operations/types.ts');
check('operation records carry priority expiry and next attempt projection', ['priority: MetaOperationPriority', 'expiresAt: string', 'nextAttemptAt?: string'].every((value) => operationsTypes.includes(value)));
check('outbox records carry priority', /interface MetaOutboxMessageRecord[\s\S]*priority: MetaOperationPriority/.test(operationsTypes));
check('dispatch payload carries priority and expiry', /interface MetaOperationDispatchPayload[\s\S]*priority: MetaOperationPriority[\s\S]*expiresAt: string/.test(operationsTypes));
check('defer expiry and backpressure events exist', ['EXECUTION_DEFERRED', 'OPERATION_EXPIRED', 'QUEUE_BACKPRESSURE'].every((value) => operationsTypes.includes(value)));

const transitions = read('lib/meta-platform/operations/transitions.ts');
check('retryable failure may re-enter dispatch', /RETRYABLE_FAILURE: \['DISPATCHING'/.test(transitions));
check('accepted and queued operations may terminally expire', /ACCEPTED: \[[^\]]*PERMANENT_FAILURE/.test(transitions) && /QUEUED: \[[^\]]*PERMANENT_FAILURE/.test(transitions));

const store = read('lib/meta-platform/operations/in-memory-store.ts');
check('in-memory store normalizes priority and bounded expiry', /normalizePriority/.test(store) && /normalizeMetaOperationExpiry/.test(store));
check('outbox claiming is priority ordered', /PRIORITY_RANK\[left\.priority\]/.test(store));
check('expired operations dead-letter before claim', /OPERATION_EXPIRED/.test(store) && /message\.state = 'DEAD_LETTER'/.test(store));
check('durable execution defer reopens the outbox', /async deferExecution/.test(store) && /message\.state = 'RETRY_SCHEDULED'/.test(store));
check('durable defer clears published and execution leases', /message\.publishedAt = undefined/.test(store) && /operation\.executionLeaseToken = undefined/.test(store));
check('non-retryable outbox errors dead-letter immediately', /!input\.error\.retryable \|\| message\.attempts/.test(store));

const prismaStore = read('lib/meta-platform/operations/prisma-store.ts');
check('Prisma store persists priority and expiry in one transaction', /"priority"/.test(prismaStore) && /"expiresAt"/.test(prismaStore) && /commitWithOperation/.test(prismaStore));
check('Prisma outbox claim orders by enum priority and uses SKIP LOCKED', /ORDER BY message\."priority" ASC/.test(prismaStore) && /FOR UPDATE OF message SKIP LOCKED/.test(prismaStore));
check('Prisma claim expires stale operations before selecting work', /expiredRows/.test(prismaStore) && /OPERATION_EXPIRED/.test(prismaStore));
check('Prisma durable defer updates operation and outbox transactionally', /async deferExecution/.test(prismaStore) && /RETRY_SCHEDULED/.test(prismaStore) && /nextAttemptAt/.test(prismaStore));
check('Prisma non-retryable release dead-letters immediately', /CASE WHEN \$5 = false/.test(prismaStore));

const dispatcher = read('lib/meta-platform/operations/dispatcher.ts');
check('dispatcher applies queue admission before publish', dispatcher.indexOf('admission.assertAdmitted') < dispatcher.indexOf('publisher.publish'));
check('backpressure releases durable outbox', /backpressured/.test(dispatcher) && /releaseOutbox/.test(dispatcher));
check('publisher outage uses central retry classifier', /new MetaRetryPolicy/.test(dispatcher) && /maxAttempts: message.maxAttempts/.test(dispatcher));
check('dispatch payload propagates priority and expiry', /priority: operation\.priority/.test(dispatcher) && /expiresAt: operation\.expiresAt/.test(dispatcher));

const execution = read('lib/meta-platform/operations/execution.ts');
check('handler declares idempotency and unknown-outcome metadata', /readonly idempotent\?/.test(execution) && /requestMayHaveSucceeded/.test(execution));
check('worker failure uses central retry policy', /MetaRetryPolicy/.test(execution) && /priority: claim\.operation\.priority/.test(execution));
check('retry and defer decisions persist through store deferExecution', /store\.deferExecution/.test(execution));
check('reconciliation and terminal decisions do not blindly retry', /decision\.action === 'RETRY' \|\| decision\.action === 'DEFER'/.test(execution) && /store\.failExecution/.test(execution));

const publisher = read('lib/meta-platform/operations/bullmq-publisher.ts');
check('BullMQ maps P0-P4 to native priority', /BULLMQ_PRIORITY/.test(publisher) && /priority: BULLMQ_PRIORITY/.test(publisher));
check('BullMQ attempts remain one because PostgreSQL owns retry', /attempts: 1/.test(publisher));

const graphClient = read('lib/meta-platform/transports/graph-http/client.ts');
const graphNormalization = read('lib/meta-platform/transports/graph-http/normalization.ts');
check('Graph transport retains retry and usage headers safely', ['retry-after', 'x-app-usage', 'x-page-usage', 'x-ad-account-usage'].every((value) => graphClient.includes(value)));
check('Graph errors expose normalized provider usage safe details', /parseMetaProviderUsageHeaders/.test(graphNormalization) && /retryAfterMs/.test(graphNormalization));

const schema = read('prisma/schema.prisma');
check('Prisma schema has MetaOperationPriority enum', /enum MetaOperationPriority[\s\S]*P0[\s\S]*P4/.test(schema));
check('Prisma operation has immutable priority expiry and next attempt', /model MetaOperation[\s\S]*priority\s+MetaOperationPriority[\s\S]*expiresAt\s+DateTime[\s\S]*nextAttemptAt\s+DateTime\?/.test(schema));
check('Prisma outbox has priority due index', /MetaOutboxMessage_priority_due_idx/.test(schema));
check('Prisma operation has expiry and priority due indexes', /MetaOperation_expiry_idx/.test(schema) && /MetaOperation_status_priority_due_idx/.test(schema));

const migrationRoot = 'prisma/migrations/20260722233000_add_meta_reliability_governance';
check('Phase 26 forward and recovery migrations exist', exists(`${migrationRoot}/migration.sql`) && exists(`${migrationRoot}/recovery.sql`));
const migration = read(`${migrationRoot}/migration.sql`);
const recovery = read(`${migrationRoot}/recovery.sql`);
check('migration adds priority enum and expiry fields', /CREATE TYPE "MetaOperationPriority"/.test(migration) && /ADD COLUMN "expiresAt"/.test(migration));
check('migration backfills existing expiry before not-null', /UPDATE "MetaOperation"[\s\S]*24 hours/.test(migration) && /ALTER COLUMN "expiresAt" SET NOT NULL/.test(migration));
check('migration protects priority and expiry as immutable', /NEW\."priority" IS DISTINCT/.test(migration) && /NEW\."expiresAt" IS DISTINCT/.test(migration));
check('migration protects outbox priority as immutable', /meta_outbox_protect_immutable_fields/.test(migration) && /NEW\."priority" IS DISTINCT/.test(migration));
check('recovery explicitly drops indexes columns and priority type', ['DROP INDEX', 'DROP COLUMN', 'DROP TYPE'].every((value) => recovery.includes(value)));
check('recovery requires forward fix after rollout', /forward-fix migration/.test(recovery));

const tests = read('tests/meta-v6/phase26-reliability-governance.test.ts');
for (const phrase of ['retry-after', 'exactly one distributed half-open probe', 'provider cooldown', 'critical priority', 'stale cache', 'P0 before P4', 'backpressure', 'durable defer', 'dead-lettered']) {
  check(`focused tests cover ${phrase}`, tests.includes(phrase));
}

const publicEntry = read('lib/meta-platform/index.ts');
const serverEntry = read('lib/meta-platform/server.ts');
check('public entry exposes provider-neutral reliability data contracts only', /MetaReliabilityScope/.test(publicEntry) && /MetaRetryDecision/.test(publicEntry) && /META_OPERATION_PRIORITIES/.test(publicEntry) && !/MetaReliabilityCoordinator|MetaRetryPolicy|MetaCircuitBreakerRegistry/.test(publicEntry));
check('client-safe public entry does not expose Redis implementation', !/RedisMetaReliabilityStateStore/.test(publicEntry));
check('server entry loads Redis reliability implementation lazily', /import\('\.\/reliability\/redis-state'\)/.test(serverEntry));
check('Phase 26 status is not falsely complete', /Phase 26[\s\S]{0,400}READY_FOR_GENERATION/.test(read('phases.md')) && !/Phase 26[\s\S]{0,300}`COMPLETE`/.test(read('phases.md')));
check('Phase 27 is source-ready without a false completion claim', /Phase 27[\s\S]{0,500}(?:READY_FOR_GENERATION|CODE_COMPLETE)/.test(read('phases.md')) && !/Phase 27[\s\S]{0,300}`COMPLETE`/.test(read('phases.md')));

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nPhase 26 reliability governance audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
