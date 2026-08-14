import test from 'node:test';
import assert from 'node:assert/strict';
import { createMetaInvocationContext } from '../../lib/meta-platform/core/context';
import { InMemoryMetaFencedLockManager, metaWorkflowLockScope } from '../../lib/meta-platform/concurrency';
import {
  InMemoryMetaOperationStore,
  MetaOperationService,
  MetaPayloadCodecRegistry,
  createMetaVersionedPayload,
} from '../../lib/meta-platform/operations';
import { buildMetaWorkflowProjection } from '../../lib/meta-platform/projections';
import { MetaReconciliationService, MetaUnknownOutcomeResolverRegistry } from '../../lib/meta-platform/reconciliation';
import {
  MetaControlledReplayError,
  MetaControlledReplayService,
  type MetaReplayApprovalAuthorizer,
} from '../../lib/meta-platform/replay';
import {
  InMemoryMetaWorkflowStore,
  MetaFencingTokenRejectedError,
  MetaOptimisticConcurrencyError,
  MetaWorkflowDefinitionRegistry,
  MetaWorkflowEngine,
  type MetaWorkflowMutationGuard,
} from '../../lib/meta-platform/workflows';

const adminGuard = (reason = 'Phase 27 deterministic test administration.'): MetaWorkflowMutationGuard => ({
  mode: 'ADMINISTRATIVE',
  actorId: 'phase27-test-admin',
  reason,
});

function createEngine() {
  const store = new InMemoryMetaWorkflowStore();
  const locks = new InMemoryMetaFencedLockManager();
  const definitions = new MetaWorkflowDefinitionRegistry();
  const engine = new MetaWorkflowEngine({ store, definitions, lockManager: locks, workerId: 'phase27-test', leaseMs: 5_000 });
  return { store, locks, definitions, engine };
}

function providerCommand(input: {
  purpose: 'EXECUTION' | 'COMPENSATION';
  operationType: string;
  fingerprint: string;
}) {
  return {
    purpose: input.purpose,
    capability: 'ads',
    operationType: input.operationType,
    requestFingerprint: input.fingerprint,
    requestState: { name: input.fingerprint },
    beforeState: { exists: input.purpose === 'COMPENSATION' },
    reconciliation: {
      resolverKey: `${input.operationType}.by-fingerprint`,
      expiresAt: new Date(Date.now() + 60_000),
    },
  } as const;
}

test('partial campaign workflow durably prepares provider writes and compensates completed steps', async () => {
  const { store, definitions, engine } = createEngine();
  let campaignCreates = 0;
  let campaignCompensations = 0;
  let adCreates = 0;

  definitions.register({
    id: 'ads.campaign-publish',
    version: 1,
    steps: [
      {
        key: 'create-campaign',
        prepareExecution() {
          return providerCommand({ purpose: 'EXECUTION', operationType: 'campaign.create', fingerprint: 'campaign-create-1' });
        },
        async execute({ workflow, providerJob }) {
          assert.equal(providerJob?.purpose, 'EXECUTION');
          const reconciliations = await store.listReconciliations(workflow.id);
          assert.equal(reconciliations.some((item) => item.providerJobId === providerJob?.id), true, 'job and reconciliation must exist before provider write');
          campaignCreates += 1;
          return {
            outcome: 'SUCCEEDED',
            beforeState: { exists: false },
            afterState: { providerCampaignId: 'campaign-1', status: 'PAUSED' },
            output: { providerCampaignId: 'campaign-1' },
            providerObjectId: 'campaign-1',
            responseState: { providerCampaignId: 'campaign-1' },
          } as const;
        },
        prepareCompensation() {
          return providerCommand({ purpose: 'COMPENSATION', operationType: 'campaign.archive', fingerprint: 'campaign-archive-1' });
        },
        async compensate({ workflow, providerJob }) {
          assert.equal(providerJob?.purpose, 'COMPENSATION');
          const reconciliations = await store.listReconciliations(workflow.id);
          assert.equal(reconciliations.some((item) => item.providerJobId === providerJob?.id), true);
          campaignCompensations += 1;
          return { outcome: 'SUCCEEDED', afterState: { providerCampaignId: 'campaign-1', status: 'ARCHIVED' } } as const;
        },
      },
      {
        key: 'create-adset',
        async execute() {
          return { outcome: 'FAILED', error: { code: 'META_ADSET_BUDGET_INVALID' } } as const;
        },
      },
      {
        key: 'create-ad',
        async execute() {
          adCreates += 1;
          return { outcome: 'SUCCEEDED' } as const;
        },
      },
    ],
  });

  const workflow = await engine.start({
    operationId: 'operation-campaign-partial',
    definitionId: 'ads.campaign-publish',
    definitionVersion: 1,
    priority: 'P1',
    context: { campaignName: 'Phase 27 launch' },
  });

  assert.equal(workflow.status, 'COMPENSATED');
  assert.equal(campaignCreates, 1);
  assert.equal(campaignCompensations, 1);
  assert.equal(adCreates, 0);
  const steps = await store.listWorkflowSteps(workflow.id);
  assert.deepEqual(steps.map((step) => step.status), ['COMPENSATED', 'FAILED', 'PENDING']);
  const jobs = await store.listProviderJobs(workflow.id);
  assert.deepEqual(jobs.map((job) => job.purpose), ['EXECUTION', 'COMPENSATION']);
  assert.deepEqual(jobs.map((job) => job.status), ['SUCCEEDED', 'SUCCEEDED']);
  assert.equal((await store.listReconciliations(workflow.id)).every((item) => item.status === 'RESOLVED_SUCCEEDED'), true);
});

test('stale optimistic mutation is rejected without overwriting the newer workflow', async () => {
  const store = new InMemoryMetaWorkflowStore();
  const created = await store.createWorkflow({
    operationId: 'operation-version', definitionId: 'catalog.workflow', definitionVersion: 1, priority: 'P2', stepKeys: ['sync'],
  });
  const updated = await store.updateWorkflow({
    workflowId: created.workflow.id, expectedVersion: created.workflow.version, guard: adminGuard(), status: 'RUNNING',
  });
  await assert.rejects(
    () => store.updateWorkflow({
      workflowId: created.workflow.id, expectedVersion: created.workflow.version, guard: adminGuard(), status: 'CANCELLED',
    }),
    (error: unknown) => error instanceof MetaOptimisticConcurrencyError,
  );
  assert.equal((await store.getWorkflow(created.workflow.id))?.version, updated.version);
  assert.equal((await store.getWorkflow(created.workflow.id))?.status, 'RUNNING');
});

test('fencing token remains monotonic after release and stale owners are rejected', async () => {
  const store = new InMemoryMetaWorkflowStore();
  const locks = new InMemoryMetaFencedLockManager();
  const created = await store.createWorkflow({
    operationId: 'operation-fence', definitionId: 'catalog.workflow', definitionVersion: 1, priority: 'P2', stepKeys: ['sync'],
  });
  const scopeKey = metaWorkflowLockScope(created.workflow.id);
  const first = await locks.acquire({ scopeKey, ownerId: 'worker-a', leaseMs: 5_000 });
  assert.ok(first);
  assert.equal(await locks.release({ scopeKey, leaseToken: first.leaseToken }), true);
  const second = await locks.acquire({ scopeKey, ownerId: 'worker-b', leaseMs: 5_000 });
  assert.equal(second?.fencingToken, 2, 'release must not reset the fencing counter');
  await store.observeFencingToken(scopeKey, second!.fencingToken);
  await assert.rejects(
    () => store.updateWorkflow({
      workflowId: created.workflow.id,
      expectedVersion: created.workflow.version,
      guard: { mode: 'FENCED', scopeKey, fencingToken: first.fencingToken },
      status: 'RUNNING',
    }),
    (error: unknown) => error instanceof MetaFencingTokenRejectedError,
  );
});

test('provider command preparation is idempotent by purpose and fingerprint', async () => {
  const store = new InMemoryMetaWorkflowStore();
  const created = await store.createWorkflow({
    operationId: 'operation-command-idempotency', definitionId: 'ads.workflow', definitionVersion: 1, priority: 'P1', stepKeys: ['create'],
  });
  const step = created.steps[0];
  const input = {
    guard: adminGuard(),
    job: {
      workflowId: created.workflow.id,
      stepId: step.id,
      purpose: 'EXECUTION' as const,
      capability: 'ads',
      operationType: 'campaign.create',
      requestFingerprint: 'same-fingerprint',
      status: 'RUNNING' as const,
      requestState: { name: 'Campaign' },
    },
    reconciliation: {
      operationId: created.workflow.operationId,
      workflowId: created.workflow.id,
      stepId: step.id,
      capability: 'ads',
      operationType: 'campaign.create',
      resolverKey: 'campaign.create.by-fingerprint',
      expiresAt: new Date(Date.now() + 60_000),
    },
  };
  const first = await store.prepareProviderCommand(input);
  const second = await store.prepareProviderCommand(input);
  assert.equal(second.job.id, first.job.id);
  assert.equal(second.reconciliation.id, first.reconciliation.id);

  const compensation = await store.prepareProviderCommand({
    ...input,
    job: { ...input.job, purpose: 'COMPENSATION', operationType: 'campaign.archive' },
    reconciliation: { ...input.reconciliation, operationType: 'campaign.archive', resolverKey: 'campaign.archive.by-fingerprint' },
  });
  assert.notEqual(compensation.job.id, first.job.id, 'execution and compensation are distinct durable commands');
});

test('hard interruption after durable preparation enters reconciliation without duplicate provider write', async () => {
  const { store, locks, definitions, engine } = createEngine();
  let providerWrites = 0;
  definitions.register({
    id: 'ads.interrupted', version: 1,
    steps: [{
      key: 'create',
      prepareExecution() { return providerCommand({ purpose: 'EXECUTION', operationType: 'campaign.create', fingerprint: 'interrupted-1' }); },
      async execute() { providerWrites += 1; return { outcome: 'SUCCEEDED' } as const; },
    }],
  });
  const created = await store.createWorkflow({
    operationId: 'operation-interrupted', definitionId: 'ads.interrupted', definitionVersion: 1, priority: 'P1', stepKeys: ['create'],
  });
  const scopeKey = metaWorkflowLockScope(created.workflow.id);
  const lease = await locks.acquire({ scopeKey, ownerId: 'crashed-worker', leaseMs: 5_000 });
  assert.ok(lease);
  await store.observeFencingToken(scopeKey, lease.fencingToken);
  const guard: MetaWorkflowMutationGuard = { mode: 'FENCED', scopeKey, fencingToken: lease.fencingToken };
  const runningWorkflow = await store.updateWorkflow({
    workflowId: created.workflow.id, expectedVersion: created.workflow.version, guard, status: 'RUNNING', markStarted: true,
  });
  const runningStep = await store.updateStep({
    stepId: created.steps[0].id, expectedVersion: created.steps[0].version, guard, status: 'RUNNING', incrementAttempt: true, markStarted: true,
  });
  await store.prepareProviderCommand({
    guard,
    job: {
      workflowId: runningWorkflow.id, stepId: runningStep.id, purpose: 'EXECUTION', capability: 'ads', operationType: 'campaign.create',
      requestFingerprint: 'interrupted-1', status: 'RUNNING', requestState: { name: 'Campaign' },
    },
    reconciliation: {
      operationId: runningWorkflow.operationId, workflowId: runningWorkflow.id, stepId: runningStep.id,
      capability: 'ads', operationType: 'campaign.create', resolverKey: 'campaign.create.by-fingerprint', expiresAt: new Date(Date.now() + 60_000),
    },
  });
  await locks.release({ scopeKey, leaseToken: lease.leaseToken });

  const recovered = await engine.resume(created.workflow.id);
  assert.equal(recovered.status, 'WAITING_RECONCILIATION');
  assert.equal(providerWrites, 0, 'resume must not blindly repeat a provider command whose outcome may be unknown');
  assert.equal((await store.listWorkflowSteps(recovered.id))[0].status, 'UNKNOWN');
  assert.equal((await store.listProviderJobs(recovered.id))[0].status, 'UNKNOWN');
});

test('terminal reconciliation repairs split state atomically and resumes the workflow', async () => {
  const { store, locks, definitions, engine } = createEngine();
  let providerWrites = 0;
  let publishCalls = 0;
  definitions.register({
    id: 'ads.unknown-outcome', version: 1,
    steps: [
      {
        key: 'create-adset',
        prepareExecution() { return providerCommand({ purpose: 'EXECUTION', operationType: 'adset.create', fingerprint: 'adset-request-1' }); },
        async execute() {
          providerWrites += 1;
          return { outcome: 'UNKNOWN', error: { code: 'META_PROVIDER_RESPONSE_LOST', requestMayHaveSucceeded: true } } as const;
        },
      },
      { key: 'publish', async execute() { publishCalls += 1; return { outcome: 'SUCCEEDED' } as const; } },
    ],
  });
  const waiting = await engine.start({
    operationId: 'operation-lost-response', definitionId: 'ads.unknown-outcome', definitionVersion: 1, priority: 'P1',
  });
  const reconciliation = (await store.listReconciliations(waiting.id))[0];
  const terminalReceipt = await store.updateReconciliation({
    reconciliationId: reconciliation.id,
    expectedVersion: reconciliation.version,
    guard: adminGuard('Simulate a terminal provider receipt before projection repair.'),
    status: 'RESOLVED_SUCCEEDED',
    evidence: { matchedBy: 'requestFingerprint' },
    resolution: { outcome: 'SUCCEEDED', providerObjectId: 'adset-123' },
  });
  assert.equal((await store.getWorkflow(waiting.id))?.status, 'WAITING_RECONCILIATION');

  const service = new MetaReconciliationService({
    store,
    resolvers: new MetaUnknownOutcomeResolverRegistry(),
    lockManager: locks,
    engine,
    workerId: 'reconciler',
  });
  const repaired = await service.reconcile(terminalReceipt.id);
  assert.equal(repaired.status, 'RESOLVED_SUCCEEDED');
  assert.equal((await store.getWorkflow(waiting.id))?.status, 'SUCCEEDED');
  assert.equal(providerWrites, 1);
  assert.equal(publishCalls, 1);
  assert.equal((await store.listProviderJobs(waiting.id))[0].status, 'SUCCEEDED');
});

test('unknown compensation is reconciled and never blindly repeated', async () => {
  const { store, locks, definitions, engine } = createEngine();
  let compensationWrites = 0;
  definitions.register({
    id: 'ads.compensation-unknown', version: 1,
    steps: [
      {
        key: 'create-campaign',
        prepareExecution() { return providerCommand({ purpose: 'EXECUTION', operationType: 'campaign.create', fingerprint: 'comp-create-1' }); },
        async execute() { return { outcome: 'SUCCEEDED', providerObjectId: 'campaign-9' } as const; },
        prepareCompensation() { return providerCommand({ purpose: 'COMPENSATION', operationType: 'campaign.archive', fingerprint: 'comp-archive-1' }); },
        async compensate() {
          compensationWrites += 1;
          return { outcome: 'UNKNOWN', error: { code: 'META_ARCHIVE_RESPONSE_LOST', requestMayHaveSucceeded: true } } as const;
        },
      },
      { key: 'fail-next', async execute() { return { outcome: 'FAILED', error: { code: 'META_NEXT_STEP_FAILED' } } as const; } },
    ],
  });
  const waiting = await engine.start({
    operationId: 'operation-compensation-unknown', definitionId: 'ads.compensation-unknown', definitionVersion: 1, priority: 'P1',
  });
  assert.equal(waiting.status, 'WAITING_RECONCILIATION');
  const compensationJob = (await store.listProviderJobs(waiting.id)).find((job) => job.purpose === 'COMPENSATION');
  assert.ok(compensationJob);
  const reconciliation = (await store.listReconciliations(waiting.id)).find((item) => item.providerJobId === compensationJob.id);
  assert.ok(reconciliation);

  const resolvers = new MetaUnknownOutcomeResolverRegistry().register({
    capability: compensationJob.capability,
    operationType: compensationJob.operationType,
    resolverKey: reconciliation.resolverKey,
    resolver: { async resolve() { return { outcome: 'SUCCEEDED', evidence: { archived: true }, afterState: { status: 'ARCHIVED' } } as const; } },
  });
  const service = new MetaReconciliationService({ store, resolvers, lockManager: locks, engine, workerId: 'comp-reconciler' });
  await service.reconcile(reconciliation.id);
  assert.equal((await store.getWorkflow(waiting.id))?.status, 'COMPENSATED');
  assert.equal(compensationWrites, 1);
});

test('hard interruption during provider compensation enters reconciliation without false compensation', async () => {
  const { store, locks, definitions, engine } = createEngine();
  let compensationWrites = 0;
  definitions.register({
    id: 'ads.compensation-interrupted', version: 1,
    steps: [
      {
        key: 'create-campaign',
        async execute() { return { outcome: 'SUCCEEDED' } as const; },
        async compensate() { compensationWrites += 1; return { outcome: 'SUCCEEDED' } as const; },
      },
      { key: 'fail-next', async execute() { return { outcome: 'FAILED', error: { code: 'META_NEXT_STEP_FAILED' } } as const; } },
    ],
  });
  const created = await store.createWorkflow({
    operationId: 'operation-compensation-interrupted', definitionId: 'ads.compensation-interrupted', definitionVersion: 1,
    priority: 'P1', stepKeys: ['create-campaign', 'fail-next'],
  });
  const scopeKey = metaWorkflowLockScope(created.workflow.id);
  const lease = await locks.acquire({ scopeKey, ownerId: 'crashed-compensator', leaseMs: 5_000 });
  assert.ok(lease);
  await store.observeFencingToken(scopeKey, lease.fencingToken);
  const guard: MetaWorkflowMutationGuard = { mode: 'FENCED', scopeKey, fencingToken: lease.fencingToken };
  let workflow = await store.updateWorkflow({
    workflowId: created.workflow.id, expectedVersion: created.workflow.version, guard, status: 'RUNNING', markStarted: true,
  });
  let first = await store.updateStep({
    stepId: created.steps[0].id, expectedVersion: created.steps[0].version, guard, status: 'RUNNING', incrementAttempt: true, markStarted: true,
  });
  first = await store.updateStep({ stepId: first.id, expectedVersion: first.version, guard, status: 'SUCCEEDED', markCompleted: true });
  let failed = await store.updateStep({
    stepId: created.steps[1].id, expectedVersion: created.steps[1].version, guard, status: 'RUNNING', incrementAttempt: true, markStarted: true,
  });
  failed = await store.updateStep({
    stepId: failed.id, expectedVersion: failed.version, guard, status: 'FAILED', markCompleted: true,
    lastError: { code: 'META_NEXT_STEP_FAILED' },
  });
  workflow = await store.updateWorkflow({
    workflowId: workflow.id, expectedVersion: workflow.version, guard, status: 'COMPENSATING',
    currentStepKey: failed.stepKey, lastError: failed.lastError,
  });
  first = await store.updateStep({ stepId: first.id, expectedVersion: first.version, guard, status: 'COMPENSATING' });
  await store.prepareProviderCommand({
    guard,
    job: {
      workflowId: workflow.id, stepId: first.id, purpose: 'COMPENSATION', capability: 'ads', operationType: 'campaign.archive',
      requestFingerprint: 'compensation-interrupted-1', status: 'RUNNING', requestState: { campaignId: 'campaign-1' },
    },
    reconciliation: {
      operationId: workflow.operationId, workflowId: workflow.id, stepId: first.id, capability: 'ads', operationType: 'campaign.archive',
      resolverKey: 'campaign.archive.by-fingerprint', expiresAt: new Date(Date.now() + 60_000),
    },
  });
  await locks.release({ scopeKey, leaseToken: lease.leaseToken });

  const recovered = await engine.resume(workflow.id);
  assert.equal(recovered.status, 'WAITING_RECONCILIATION');
  assert.equal(compensationWrites, 0, 'resume must not repeat a compensation command whose response was lost');
  assert.equal((await store.listWorkflowSteps(workflow.id))[0].status, 'UNKNOWN');
  const compensationJob = (await store.listProviderJobs(workflow.id)).find((job) => job.purpose === 'COMPENSATION');
  assert.equal(compensationJob?.status, 'UNKNOWN');
});

test('active reconciliation claim lease prevents duplicate resolver execution', async () => {
  const store = new InMemoryMetaWorkflowStore();
  const locks = new InMemoryMetaFencedLockManager();
  const created = await store.createWorkflow({
    operationId: 'operation-reconciliation-lease', definitionId: 'ads.workflow', definitionVersion: 1, priority: 'P1', stepKeys: ['create'],
  });
  const job = await store.createProviderJob({
    workflowId: created.workflow.id, stepId: created.steps[0].id, purpose: 'EXECUTION', capability: 'ads', operationType: 'campaign.create',
    requestFingerprint: 'lease-fingerprint', status: 'UNKNOWN', guard: adminGuard(),
  });
  const reconciliation = await store.createReconciliation({
    operationId: created.workflow.operationId, workflowId: created.workflow.id, stepId: created.steps[0].id, providerJobId: job.id,
    capability: 'ads', operationType: 'campaign.create', resolverKey: 'campaign.lookup', expiresAt: new Date(Date.now() + 60_000), guard: adminGuard(),
  });
  const future = new Date(Date.now() + 30_000);
  const claimed = await store.updateReconciliation({
    reconciliationId: reconciliation.id, expectedVersion: reconciliation.version, guard: adminGuard(), status: 'RUNNING', nextCheckAt: future, incrementAttempts: true,
  });
  let resolverCalls = 0;
  const resolvers = new MetaUnknownOutcomeResolverRegistry().register({
    capability: 'ads', operationType: 'campaign.create', resolverKey: 'campaign.lookup',
    resolver: { async resolve() { resolverCalls += 1; return { outcome: 'NEEDS_REVIEW', evidence: {}, reason: 'unexpected' } as const; } },
  });
  const service = new MetaReconciliationService({ store, resolvers, lockManager: locks });
  const result = await service.reconcile(claimed.id, new Date());
  assert.equal(result.status, 'RUNNING');
  assert.equal(resolverCalls, 0);
});

function operationRegistry() {
  return new MetaPayloadCodecRegistry().register({
    type: 'ads.campaign', schemaVersion: 1,
    decode(data) {
      if (!data || typeof data !== 'object') throw new Error('payload required');
      return data;
    },
  });
}

async function createFailedOperation(store: InMemoryMetaOperationStore, suffix: string) {
  const service = new MetaOperationService({ store, payloadRegistry: operationRegistry() });
  const committed = await service.commit({
    environment: 'STAGING', connectionKey: 'primary', capability: 'ads', operationType: 'ads.campaign',
    idempotencyKey: `source:${suffix}`, assetType: 'AD_ACCOUNT', assetId: 'act-1', credentialRole: 'BUSINESS_SYSTEM_USER',
    invocation: createMetaInvocationContext({ correlationId: `phase27-${suffix}`, actor: { type: 'ADMIN', reference: 'requester-1' } }),
    payload: createMetaVersionedPayload({ type: 'ads.campaign', schemaVersion: 1, data: { name: 'Replay campaign' } }),
  });
  const claimed = await store.claimDueOutbox();
  await store.markOutboxPublished({ messageId: committed.outbox.id, leaseToken: claimed.leaseToken });
  const execution = await store.beginExecution({ operationId: committed.operation.id });
  assert.ok(execution.leaseToken);
  await store.failExecution({
    operationId: committed.operation.id,
    leaseToken: execution.leaseToken,
    error: { code: 'META_PROVIDER_REJECTED', message: 'Provider rejected request.', retryable: false },
  });
  return { service, operation: (await store.getOperation(committed.operation.id))! };
}

const allowReplayApprover: MetaReplayApprovalAuthorizer = {
  async authorize({ role }) { return role === 'META_REPLAY_APPROVER'; },
};

test('controlled replay uses separate authorized approval, immutable digest and exact expiry', async () => {
  const operationStore = new InMemoryMetaOperationStore();
  const workflowStore = new InMemoryMetaWorkflowStore();
  const { service: operationService, operation: source } = await createFailedOperation(operationStore, 'safe');
  let now = new Date();
  const replay = new MetaControlledReplayService({
    operationStore, operationService, workflowStore, approvalAuthorizer: allowReplayApprover, clock: () => new Date(now),
  });
  const expiresAt = new Date(now.getTime() + 60_000);
  const request = await replay.request({
    sourceOperationId: source.id,
    idempotencyKey: 'replay:source-safe:1',
    requestedBy: 'admin-requester',
    reason: 'Provider validation was corrected and the payload is approved for one controlled replay.',
    expiresAt,
  });
  assert.equal(request.status, 'REQUESTED');
  assert.equal(request.expiresAt, expiresAt.toISOString());
  await assert.rejects(
    () => replay.execute({ idempotencyKey: request.idempotencyKey, expectedRequestDigest: request.requestDigest }),
    (error: unknown) => error instanceof MetaControlledReplayError && error.code === 'META_REPLAY_NOT_APPROVED',
  );
  const approved = await replay.approve({
    idempotencyKey: request.idempotencyKey,
    approvedBy: 'admin-approver',
    approvalRole: 'META_REPLAY_APPROVER',
    expectedRequestDigest: request.requestDigest,
  });
  assert.equal(approved.status, 'APPROVED');
  const first = await replay.execute({ idempotencyKey: request.idempotencyKey, expectedRequestDigest: request.requestDigest });
  const second = await replay.execute({ idempotencyKey: request.idempotencyKey, expectedRequestDigest: request.requestDigest });
  assert.notEqual(first.operation.id, source.id);
  assert.equal(first.operation.replayOfOperationId, source.id);
  assert.equal(first.operation.expiresAt, request.expiresAt);
  assert.equal(first.audit.status, 'CREATED');
  assert.equal(second.operation.id, first.operation.id);

  now = new Date(expiresAt.getTime() + 1);
  assert.equal((await workflowStore.getReplayByIdempotencyKey(request.idempotencyKey))?.status, 'CREATED');
});

test('controlled replay fails closed on self approval, RBAC, digest mismatch and expiry', async () => {
  const operationStore = new InMemoryMetaOperationStore();
  const workflowStore = new InMemoryMetaWorkflowStore();
  const { service: operationService, operation: source } = await createFailedOperation(operationStore, 'approval-guards');
  let now = new Date();
  const replay = new MetaControlledReplayService({
    operationStore, operationService, workflowStore, approvalAuthorizer: allowReplayApprover, clock: () => new Date(now),
  });
  const request = await replay.request({
    sourceOperationId: source.id, idempotencyKey: 'replay:approval-guards:1', requestedBy: 'admin-one',
    reason: 'Independent approval and immutable request evidence are required for this replay.',
    expiresAt: new Date(now.getTime() + 5_000),
  });
  await assert.rejects(
    () => replay.approve({ idempotencyKey: request.idempotencyKey, approvedBy: 'admin-one', approvalRole: 'META_REPLAY_APPROVER', expectedRequestDigest: request.requestDigest }),
    (error: unknown) => error instanceof MetaControlledReplayError && error.code === 'META_REPLAY_TWO_PERSON_APPROVAL_REQUIRED',
  );
  await assert.rejects(
    () => replay.approve({ idempotencyKey: request.idempotencyKey, approvedBy: 'admin-two', approvalRole: 'VIEWER', expectedRequestDigest: request.requestDigest }),
    (error: unknown) => error instanceof MetaControlledReplayError && error.code === 'META_REPLAY_APPROVER_UNAUTHORIZED',
  );
  await assert.rejects(
    () => replay.approve({ idempotencyKey: request.idempotencyKey, approvedBy: 'admin-two', approvalRole: 'META_REPLAY_APPROVER', expectedRequestDigest: 'wrong-digest' }),
    (error: unknown) => error instanceof MetaControlledReplayError && error.code === 'META_REPLAY_REQUEST_DIGEST_MISMATCH',
  );
  await replay.approve({
    idempotencyKey: request.idempotencyKey, approvedBy: 'admin-two', approvalRole: 'META_REPLAY_APPROVER', expectedRequestDigest: request.requestDigest,
  });
  now = new Date(new Date(request.expiresAt).getTime() + 1);
  await assert.rejects(
    () => replay.execute({ idempotencyKey: request.idempotencyKey, expectedRequestDigest: request.requestDigest }),
    (error: unknown) => error instanceof MetaControlledReplayError && error.code === 'META_REPLAY_EXPIRED',
  );
  assert.equal((await workflowStore.getReplayByIdempotencyKey(request.idempotencyKey))?.status, 'REJECTED');
});

test('controlled replay blocks unresolved and expired unknown outcomes', async () => {
  const operationStore = new InMemoryMetaOperationStore();
  const workflowStore = new InMemoryMetaWorkflowStore();
  const { service: operationService, operation: source } = await createFailedOperation(operationStore, 'unknown-blocked');
  const created = await workflowStore.createWorkflow({
    operationId: source.id, definitionId: 'ads.unknown', definitionVersion: 1, priority: 'P1', stepKeys: ['create'],
  });
  const job = await workflowStore.createProviderJob({
    workflowId: created.workflow.id, stepId: created.steps[0].id, purpose: 'EXECUTION', capability: 'ads', operationType: 'ads.campaign',
    requestFingerprint: 'unknown-replay-fingerprint', status: 'UNKNOWN', guard: adminGuard(),
  });
  const reconciliation = await workflowStore.createReconciliation({
    operationId: source.id, workflowId: created.workflow.id, stepId: created.steps[0].id, providerJobId: job.id,
    capability: 'ads', operationType: 'ads.campaign', resolverKey: 'ads.campaign.lookup', expiresAt: new Date(Date.now() + 60_000), guard: adminGuard(),
  });
  const replay = new MetaControlledReplayService({
    operationStore, operationService, workflowStore, approvalAuthorizer: allowReplayApprover,
  });
  await assert.rejects(
    () => replay.request({
      sourceOperationId: source.id, idempotencyKey: 'replay:unknown-blocked:1', requestedBy: 'admin-one',
      reason: 'This replay must remain blocked while the provider outcome is still unknown.',
    }),
    (error: unknown) => error instanceof MetaControlledReplayError && error.code === 'META_REPLAY_UNKNOWN_OUTCOME_UNRESOLVED',
  );
  await workflowStore.updateReconciliation({
    reconciliationId: reconciliation.id, expectedVersion: reconciliation.version, guard: adminGuard(), status: 'EXPIRED',
    lastError: { code: 'META_RECONCILIATION_EXPIRED' },
  });
  await assert.rejects(
    () => replay.request({
      sourceOperationId: source.id, idempotencyKey: 'replay:expired-unknown-blocked:1', requestedBy: 'admin-one',
      reason: 'Expiry does not prove provider failure, so controlled replay remains blocked.',
    }),
    (error: unknown) => error instanceof MetaControlledReplayError && error.code === 'META_REPLAY_UNKNOWN_OUTCOME_UNRESOLVED',
  );
});

test('workflow projection is rebuilt from durable workflow, jobs and reconciliation state', async () => {
  const { store, definitions, engine } = createEngine();
  definitions.register({
    id: 'ads.projection', version: 1,
    steps: [{
      key: 'create',
      prepareExecution() { return providerCommand({ purpose: 'EXECUTION', operationType: 'campaign.create', fingerprint: 'projection-1' }); },
      async execute() { return { outcome: 'UNKNOWN', error: { code: 'META_UNKNOWN' } } as const; },
    }],
  });
  const workflow = await engine.start({ operationId: 'operation-projection', definitionId: 'ads.projection', definitionVersion: 1, priority: 'P2' });
  const projection = await buildMetaWorkflowProjection({ workflowId: workflow.id, operationStatus: 'RUNNING', store });
  assert.equal(projection.workflowStatus, 'WAITING_RECONCILIATION');
  assert.equal(projection.unknownSteps, 1);
  assert.equal(projection.pendingReconciliations, 1);
  assert.equal(projection.providerJobs.UNKNOWN, 1);
  assert.equal(projection.replayable, false);
});
