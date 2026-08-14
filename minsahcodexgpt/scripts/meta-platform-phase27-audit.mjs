#!/usr/bin/env node
import fs from 'node:fs';

const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });
const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const includesAll = (text, values) => values.every((value) => text.includes(value));

const required = [
  'lib/meta-platform/workflows/types.ts',
  'lib/meta-platform/workflows/store.ts',
  'lib/meta-platform/workflows/transitions.ts',
  'lib/meta-platform/workflows/engine.ts',
  'lib/meta-platform/workflows/in-memory-store.ts',
  'lib/meta-platform/workflows/prisma-store.ts',
  'lib/meta-platform/concurrency/types.ts',
  'lib/meta-platform/concurrency/fenced-lock.ts',
  'lib/meta-platform/concurrency/prisma-fenced-lock.ts',
  'lib/meta-platform/concurrency/lease-heartbeat.ts',
  'lib/meta-platform/reconciliation/service.ts',
  'lib/meta-platform/replay/service.ts',
  'lib/meta-platform/projections/workflow.ts',
  'tests/meta-v6/phase27-workflows-reconciliation-replay.test.ts',
  'prisma/migrations/20260723013000_add_meta_workflow_reconciliation_replay/migration.sql',
  'prisma/migrations/20260723013000_add_meta_workflow_reconciliation_replay/recovery.sql',
  'prisma/migrations/20260723033000_harden_meta_phase27_workflows/migration.sql',
  'prisma/migrations/20260723033000_harden_meta_phase27_workflows/recovery.sql',
  'docs/architecture/meta/ADR-027-workflows-reconciliation-controlled-replay.md',
  'docs/runbooks/meta-unknown-outcome-reconciliation.md',
  'phase-27-evidence.md',
];
for (const file of required) check(`${file} exists`, exists(file));

const types = read('lib/meta-platform/workflows/types.ts');
check('workflow contracts include retryable compensation and unknown outcome states', includesAll(types, [
  "'WAITING_RECONCILIATION'", "'COMPENSATING'", "'COMPENSATION_FAILED_RETRYABLE'", "'UNKNOWN'", "'COMPENSATED'",
]));
check('provider jobs distinguish execution and compensation purpose', includesAll(types, [
  "META_PROVIDER_JOB_PURPOSES", "'EXECUTION'", "'COMPENSATION'", 'purpose: MetaProviderJobPurpose',
]));
check('workflow and mutable records carry optimistic versions', [
  'MetaWorkflowRecord', 'MetaWorkflowStepRecord', 'MetaProviderJobRecord', 'MetaReconciliationRecord',
].every((name) => new RegExp(`interface ${name}[\\s\\S]*?version: number`).test(types)));
check('replay contract records immutable digest, expiry and separate approval evidence', includesAll(types, [
  "'APPROVED'", 'requestDigest: string', 'expiresAt: string', 'approvalRole?: string', 'approvedAt?: string',
]));
check('provider command requires reconciliation metadata before execution', /interface MetaProviderCommand[\s\S]*requestFingerprint: string[\s\S]*reconciliation:/.test(types));

const store = read('lib/meta-platform/workflows/store.ts');
check('store mutations require an explicit fenced or administrative guard', includesAll(store, [
  "mode: 'FENCED'", "mode: 'ADMINISTRATIVE'", 'guard: MetaWorkflowMutationGuard',
]));
check('store exposes transaction-bound provider command preparation', /prepareProviderCommand\([\s\S]*job:[\s\S]*reconciliation:/.test(store));
check('store exposes atomic four-record provider outcome commit', /commitProviderOutcome\([\s\S]*workflow:[\s\S]*step:[\s\S]*providerJob:[\s\S]*reconciliation:/.test(store));
check('store exposes separate replay request, approval and completion transitions', includesAll(store, ['createReplay', 'approveReplay', 'completeReplay']));
check('typed optimistic and fencing failures are present', includesAll(store, ['META_OPTIMISTIC_CONCURRENCY_CONFLICT', 'META_FENCING_TOKEN_REJECTED']));

const transitions = read('lib/meta-platform/workflows/transitions.ts');
check('transition policy permits compensation recovery but forbids terminal reopening', includesAll(transitions, [
  "COMPENSATING: ['WAITING_RECONCILIATION'", "COMPENSATION_FAILED_RETRYABLE: ['COMPENSATING'", 'SUCCEEDED: []', 'COMPENSATED: []',
]));

const engine = read('lib/meta-platform/workflows/engine.ts');
check('engine acquires and heartbeats a fenced workflow lease', includesAll(engine, [
  'lockManager.acquire', 'observeFencingToken', 'runWithMetaLeaseHeartbeat', 'assertLeaseActive',
]));
check('provider job and reconciliation are prepared before any external execution callback',
  engine.indexOf('prepared = await this.prepareProviderExecution(workflow, step, command, guard)') < engine.indexOf('outcome = await stepDefinition.execute(')
  && /prepareProviderExecution[\s\S]*this\.store\.prepareProviderCommand/.test(engine));
check('terminal command identity cannot be blindly reused', engine.includes('META_PROVIDER_COMMAND_IDENTITY_ALREADY_TERMINAL'));
check('interrupted execution and compensation both move to reconciliation', includesAll(engine, [
  "recoverInterruptedProviderCommand(workflow, step, guard, 'EXECUTION')",
  "recoverInterruptedProviderCommand(workflow, candidate, guard, 'COMPENSATION')",
  'META_PROVIDER_COMPENSATION_INTERRUPTED',
]));
check('unknown provider outcome is committed atomically', /commitPreparedOutcome[\s\S]*commitProviderOutcome/.test(engine) && engine.includes("status: 'WAITING_RECONCILIATION'"));
check('compensation runs in reverse order and has retryable state', /sort\(\(a, b\) => b\.ordinal - a\.ordinal\)/.test(engine) && engine.includes('COMPENSATION_FAILED_RETRYABLE'));
check('engine never accepts UNKNOWN without a durable provider command', includesAll(engine, [
  'META_WORKFLOW_UNKNOWN_REQUIRES_PREPARED_PROVIDER_COMMAND', 'META_COMPENSATION_UNKNOWN_REQUIRES_PREPARED_PROVIDER_COMMAND',
]));

const memoryStore = read('lib/meta-platform/workflows/in-memory-store.ts');
check('in-memory store keeps provider preparation atomic on reconciliation failure',
  /prepareProviderCommand[\s\S]*catch \(error\)[\s\S]*providerJobs\.delete/.test(memoryStore));
check('in-memory provider command idempotency includes purpose and fingerprint',
  /job\.purpose === input\.job\.purpose/.test(memoryStore) && /existing\.purpose === immutable\.purpose/.test(memoryStore));
check('in-memory terminal outcome updates all four records before return', /commitProviderOutcome[\s\S]*updatedWorkflow[\s\S]*updatedStep[\s\S]*updatedJob[\s\S]*updatedReconciliation/.test(memoryStore));
check('in-memory replay approval is immutable and two-person', includesAll(memoryStore, [
  'META_REPLAY_APPROVAL_CONFLICT', 'META_REPLAY_TWO_PERSON_APPROVAL_REQUIRED', 'META_REPLAY_COMPLETION_INVALID',
]));

const lock = read('lib/meta-platform/concurrency/fenced-lock.ts');
check('in-memory fencing counter survives release', /this\.counters\.set/.test(lock) && !/this\.counters\.delete/.test(lock));
check('in-memory lease renewal requires the matching active token', /active\.leaseToken !== input\.leaseToken/.test(lock));
const prismaLock = read('lib/meta-platform/concurrency/prisma-fenced-lock.ts');
check('PostgreSQL acquisition uses database time and atomically increments the scope counter', includesAll(prismaLock, [
  'ON CONFLICT ("scopeKey") DO UPDATE', '"fencingToken" = "MetaWorkflowLock"."fencingToken" + 1', 'NOW()',
]));
check('PostgreSQL release expires the lease without deleting the fencing row',
  /UPDATE "MetaWorkflowLock"[\s\S]*"expiresAt" = NOW\(\)/.test(prismaLock) && !/DELETE FROM "MetaWorkflowLock"/.test(prismaLock));
const heartbeat = read('lib/meta-platform/concurrency/lease-heartbeat.ts');
check('lease heartbeat aborts work and fails closed when renewal is lost', includesAll(heartbeat, [
  'AbortController', 'manager.renew', 'MetaFencedLeaseLostError', 'assertActive',
]));

const prismaStore = read('lib/meta-platform/workflows/prisma-store.ts');
check('Prisma provider preparation executes job and reconciliation in one transaction',
  /prepareProviderCommand[\s\S]*this\.transaction[\s\S]*createProviderJob[\s\S]*createReconciliation/.test(prismaStore));
check('Prisma finalization executes workflow, step, job and reconciliation mutations in one transaction',
  /commitProviderOutcome[\s\S]*this\.transaction[\s\S]*updateProviderJob[\s\S]*updateStep[\s\S]*updateReconciliation[\s\S]*updateWorkflow/.test(prismaStore));
check('Prisma provider command uniqueness includes purpose', prismaStore.includes('ON CONFLICT ("stepId", "purpose", "requestFingerprint") DO NOTHING'));
check('Prisma mutation predicates validate an unexpired exact fencing token',
  prismaStore.includes('EXISTS (SELECT 1 FROM "MetaWorkflowLock"') && prismaStore.includes('"expiresAt" > NOW()'));
check('Prisma replay approval and completion fail closed on conflicts', includesAll(prismaStore, [
  'META_REPLAY_APPROVAL_CONFLICT', 'META_REPLAY_COMPLETION_INVALID', 'META_REPLAY_COMPLETION_CONFLICT',
]));

const reconciliation = read('lib/meta-platform/reconciliation/service.ts');
check('reconciliation uses an independent fenced lease with heartbeat', includesAll(reconciliation, [
  'metaReconciliationLockScope', 'runWithMetaLeaseHeartbeat', 'assertActive',
]));
check('reconciliation terminal outcome uses the atomic provider outcome commit', reconciliation.includes('commitProviderOutcome'));
check('terminal receipt repair resumes the workflow projection', includesAll(reconciliation, ['repairTerminalInvariant', 'engine.resume']));
check('unknown outcome expiry and review are fail closed', includesAll(reconciliation, ['META_RECONCILIATION_EXPIRED', "'NEEDS_REVIEW'", "'EXPIRED'"]));

const replay = read('lib/meta-platform/replay/service.ts');
check('controlled replay is a three-stage request, approve and execute flow', includesAll(replay, ['async request(', 'async approve(', 'async execute(']));
check('replay approval uses injected fail-closed RBAC and forbids self approval', includesAll(replay, [
  'MetaReplayApprovalAuthorizer', 'APPROVE_META_REPLAY', 'META_REPLAY_APPROVER_UNAUTHORIZED', 'META_REPLAY_TWO_PERSON_APPROVAL_REQUIRED',
]));
check('replay digest includes source, idempotency key, requester, reason and exact expiry', /createReplayRequestDigest[\s\S]*sourceOperationId[\s\S]*idempotencyKey[\s\S]*requestedBy[\s\S]*reason[\s\S]*expiresAt/.test(replay));
check('digest is revalidated before approval, execution and idempotent created return',
  (replay.match(/META_REPLAY_REQUEST_DIGEST_MISMATCH/g) ?? []).length >= 2
  && replay.indexOf('replay.requestDigest !== input.expectedRequestDigest.trim()') < replay.indexOf("replay.status === 'CREATED'"));
check('replay creates a new linked operation with the stored exact expiry', includesAll(replay, [
  'replayOfOperationId: source.id', 'expiresAt,', 'deadlineAt: expiresAt',
]));
check('replay blocks unresolved/expired unknown outcomes', includesAll(replay, [
  'META_REPLAY_UNKNOWN_OUTCOME_UNRESOLVED', "item.status !== 'RESOLVED_FAILED'",
]));

const schema = read('prisma/schema.prisma');
for (const model of ['MetaWorkflow', 'MetaWorkflowStep', 'MetaProviderJob', 'MetaReconciliation', 'MetaReplay', 'MetaWorkflowLock']) {
  check(`Prisma schema has ${model}`, new RegExp(`model ${model} \\{`).test(schema));
}
check('Prisma provider command identity includes purpose', includesAll(schema, [
  'enum MetaProviderJobPurpose', 'purpose            MetaProviderJobPurpose', '@@unique([stepId, purpose, requestFingerprint]',
]));
check('Prisma schema contains separate replay approval evidence', includesAll(schema, [
  'APPROVED', 'approvalRole', 'requestDigest', 'expiresAt', 'approvedAt',
]));

const correction = read('prisma/migrations/20260723033000_harden_meta_phase27_workflows/migration.sql');
const recovery = read('prisma/migrations/20260723033000_harden_meta_phase27_workflows/recovery.sql');
check('forward correction migration adds compensation, purpose and approval governance', includesAll(correction, [
  "ADD VALUE IF NOT EXISTS 'COMPENSATION_FAILED_RETRYABLE'", 'CREATE TYPE "MetaProviderJobPurpose"',
  'MetaProviderJob_step_purpose_fingerprint_key', 'MetaReplay_approval_complete', 'MetaReplay approval requires an independent',
]));
check('correction recovery is explicit about retained PostgreSQL enum values',
  recovery.includes('PostgreSQL enum values are intentionally retained') && recovery.includes('forward-fix'));

const publicEntry = read('lib/meta-platform/index.ts');
const capabilityTypes = read('lib/meta-platform/types.ts');
const registry = read('lib/meta-platform/capabilities/registry.ts');
const permissionMatrix = read('config/meta-platform-permission-matrix.json');
check('public entry exports pure workflow contracts without runtime lock implementation',
  publicEntry.includes('META_PROVIDER_JOB_PURPOSES') && publicEntry.includes("from './concurrency/types'") && !publicEntry.includes("from './concurrency'"));
check('meta-workflows capability is registered and permission-governed', includesAll(capabilityTypes + registry + permissionMatrix, [
  'meta-workflows', 'META_PLATFORM_WORKFLOWS',
]));

const tests = read('tests/meta-v6/phase27-workflows-reconciliation-replay.test.ts');
for (const phrase of [
  'durably prepares provider writes',
  'fencing token remains monotonic',
  'hard interruption after durable preparation',
  'terminal reconciliation repairs split state atomically',
  'unknown compensation is reconciled',
  'hard interruption during provider compensation',
  'separate authorized approval',
  'fails closed on self approval',
  'blocks unresolved and expired unknown outcomes',
]) check(`focused tests cover ${phrase}`, tests.includes(phrase));

const rules = read('rules.md');
const packageJson = read('package.json');
const ci = read('.github/workflows/meta-v6-release.yml');
check('schema changes require a new migration SQL and recovery/forward-fix evidence', includesAll(rules, [
  'schema.prisma', 'migration.sql', 'recovery.sql', 'historical migration',
]));
check('schema/migration pairing has an executable audit command', packageJson.includes('qa:prisma-schema-migration-pair') && exists('scripts/prisma-schema-migration-pair-audit.mjs'));
const cumulativeMetaPlatformGate = [...ci.matchAll(/qa:meta-platform-phases19-(\d+)/g)]
  .some((match) => Number(match[1]) >= 28);
check('CI enforces the schema/migration pair and cumulative Phase 19-28+ audits',
  ci.includes('qa:prisma-schema-migration-pair') && cumulativeMetaPlatformGate);
check('Phase 27 is code complete rather than falsely runtime complete',
  /Phase 27[\s\S]{0,500}\*\*Status:\*\* `CODE_COMPLETE`/.test(read('phases.md'))
  && /Status:[^\n]*CODE_COMPLETE/.test(read('phase-27-evidence.md')));
check('Phase 28 source may proceed while production cutover remains blocked on Phase 27 runtime prerequisites', /Phase 28[\s\S]{0,900}\*\*Status:\*\* `CODE_COMPLETE`[\s\S]{0,500}Production cutover remains blocked/.test(read('phases.md')));

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nPhase 27 workflows/reconciliation/replay audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
