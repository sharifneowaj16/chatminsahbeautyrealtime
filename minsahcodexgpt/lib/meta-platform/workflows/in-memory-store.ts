import { randomUUID } from 'node:crypto';
import { assertMetaVersionedPayload } from '../operations/payload';
import { META_OPERATION_PRIORITIES } from '../reliability/types';
import {
  MetaFencingTokenRejectedError,
  MetaOptimisticConcurrencyError,
  type CommitMetaWorkflowProviderOutcomeInput,
  type MetaWorkflowMutationGuard,
  type MetaWorkflowStore,
} from './store';
import {
  assertMetaProviderJobStatusTransition,
  assertMetaReconciliationStatusTransition,
  assertMetaWorkflowStatusTransition,
  assertMetaWorkflowStepStatusTransition,
} from './transitions';
import type {
  CreateMetaProviderJobInput,
  CreateMetaReconciliationInput,
  CreateMetaWorkflowInput,
  MetaProviderJobRecord,
  MetaReconciliationRecord,
  MetaReplayRecord,
  MetaWorkflowRecord,
  MetaWorkflowStepRecord,
} from './types';

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;

function identifier(value: string, code: string, max = 200): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max || !IDENTIFIER.test(normalized)) throw new TypeError(code);
  return normalized;
}

function safeRecord(value: Readonly<Record<string, unknown>> | undefined | null, code: string): Readonly<Record<string, unknown>> | undefined {
  if (value == null) return undefined;
  assertMetaVersionedPayload({ type: 'workflow.state', schemaVersion: 1, data: value });
  try {
    return Object.freeze(structuredClone(value));
  } catch {
    throw new TypeError(code);
  }
}

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(structuredClone(value));
}

function stable(value: unknown): string {
  const normalize = (item: unknown): unknown => Array.isArray(item)
    ? item.map(normalize)
    : item && typeof item === 'object'
      ? Object.fromEntries(Object.entries(item as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalize(child)]))
      : item;
  return JSON.stringify(normalize(value));
}

function administrativeGuard(guard: Extract<MetaWorkflowMutationGuard, { readonly mode: 'ADMINISTRATIVE' }>): void {
  identifier(guard.actorId, 'META_ADMINISTRATIVE_MUTATION_ACTOR_INVALID', 160);
  const reason = guard.reason.trim();
  if (reason.length < 10 || reason.length > 500) throw new TypeError('META_ADMINISTRATIVE_MUTATION_REASON_INVALID');
}

export class InMemoryMetaWorkflowStore implements MetaWorkflowStore {
  private readonly workflows = new Map<string, MetaWorkflowRecord>();
  private readonly workflowByOperation = new Map<string, string>();
  private readonly steps = new Map<string, MetaWorkflowStepRecord>();
  private readonly providerJobs = new Map<string, MetaProviderJobRecord>();
  private readonly reconciliations = new Map<string, MetaReconciliationRecord>();
  private readonly replays = new Map<string, MetaReplayRecord>();
  private readonly replayByIdempotency = new Map<string, string>();
  private readonly fencingTokens = new Map<string, number>();

  async createWorkflow(input: CreateMetaWorkflowInput) {
    const existingId = this.workflowByOperation.get(input.operationId);
    if (existingId) {
      const workflow = this.workflows.get(existingId)!;
      const matches = workflow.definitionId === input.definitionId.trim()
        && workflow.definitionVersion === input.definitionVersion
        && workflow.priority === input.priority
        && stable(workflow.context) === stable(input.context ?? {});
      if (!matches) throw new TypeError('META_WORKFLOW_OPERATION_CONFLICT');
      return { created: false, workflow: freeze(workflow), steps: await this.listWorkflowSteps(existingId) };
    }
    if (!META_OPERATION_PRIORITIES.includes(input.priority)) throw new TypeError('META_WORKFLOW_PRIORITY_INVALID');
    if (!Number.isInteger(input.definitionVersion) || input.definitionVersion < 1) throw new TypeError('META_WORKFLOW_DEFINITION_VERSION_INVALID');
    const stepKeys = input.stepKeys.map((key) => identifier(key, 'META_WORKFLOW_STEP_KEY_INVALID', 120));
    if (!stepKeys.length || new Set(stepKeys).size !== stepKeys.length) throw new TypeError('META_WORKFLOW_STEPS_INVALID');
    const now = new Date().toISOString();
    const workflow: MetaWorkflowRecord = {
      id: randomUUID(),
      operationId: identifier(input.operationId, 'META_WORKFLOW_OPERATION_ID_INVALID'),
      definitionId: identifier(input.definitionId, 'META_WORKFLOW_DEFINITION_ID_INVALID', 160),
      definitionVersion: input.definitionVersion,
      status: 'PENDING',
      currentStepKey: stepKeys[0],
      priority: input.priority,
      context: safeRecord(input.context ?? {}, 'META_WORKFLOW_CONTEXT_INVALID') ?? Object.freeze({}),
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.workflows.set(workflow.id, workflow);
    this.workflowByOperation.set(workflow.operationId, workflow.id);
    stepKeys.forEach((stepKey, ordinal) => {
      const step: MetaWorkflowStepRecord = {
        id: randomUUID(), workflowId: workflow.id, stepKey, ordinal, status: 'PENDING', attempt: 0, version: 1, createdAt: now, updatedAt: now,
      };
      this.steps.set(step.id, step);
    });
    return { created: true, workflow: freeze(workflow), steps: await this.listWorkflowSteps(workflow.id) };
  }

  async getWorkflow(workflowId: string) {
    const value = this.workflows.get(workflowId);
    return value ? freeze(value) : null;
  }

  async getWorkflowByOperation(operationId: string) {
    const id = this.workflowByOperation.get(operationId);
    return id ? this.getWorkflow(id) : null;
  }

  async listWorkflowSteps(workflowId: string) {
    return Object.freeze([...this.steps.values()].filter((step) => step.workflowId === workflowId).sort((a, b) => a.ordinal - b.ordinal).map((step) => freeze(step)));
  }

  async updateWorkflow(input: Parameters<MetaWorkflowStore['updateWorkflow']>[0]) {
    const workflow = this.workflows.get(input.workflowId);
    if (!workflow) throw new Error('META_WORKFLOW_NOT_FOUND');
    this.checkVersion('MetaWorkflow', workflow.id, input.expectedVersion, workflow.version);
    this.checkGuard(input.guard);
    if (input.status) assertMetaWorkflowStatusTransition(workflow.status, input.status);
    const now = new Date().toISOString();
    const updated: MetaWorkflowRecord = {
      ...workflow,
      ...(input.status ? { status: input.status } : {}),
      ...(input.currentStepKey === null ? { currentStepKey: undefined } : input.currentStepKey ? { currentStepKey: identifier(input.currentStepKey, 'META_WORKFLOW_STEP_KEY_INVALID', 120) } : {}),
      ...(input.context ? { context: safeRecord(input.context, 'META_WORKFLOW_CONTEXT_INVALID')! } : {}),
      ...(input.lastError === null ? { lastError: undefined } : input.lastError ? { lastError: safeRecord(input.lastError, 'META_WORKFLOW_ERROR_INVALID') } : {}),
      ...(input.markStarted && !workflow.startedAt ? { startedAt: now } : {}),
      ...(input.markCompleted ? { completedAt: now } : {}),
      version: workflow.version + 1,
      updatedAt: now,
    };
    this.workflows.set(updated.id, updated);
    return freeze(updated);
  }

  async updateStep(input: Parameters<MetaWorkflowStore['updateStep']>[0]) {
    const step = this.steps.get(input.stepId);
    if (!step) throw new Error('META_WORKFLOW_STEP_NOT_FOUND');
    this.checkVersion('MetaWorkflowStep', step.id, input.expectedVersion, step.version);
    this.checkGuard(input.guard);
    if (input.status) assertMetaWorkflowStepStatusTransition(step.status, input.status);
    const now = new Date().toISOString();
    const updated: MetaWorkflowStepRecord = {
      ...step,
      ...(input.status ? { status: input.status } : {}),
      ...(input.input === null ? { input: undefined } : input.input ? { input: safeRecord(input.input, 'META_WORKFLOW_STEP_INPUT_INVALID') } : {}),
      ...(input.output === null ? { output: undefined } : input.output ? { output: safeRecord(input.output, 'META_WORKFLOW_STEP_OUTPUT_INVALID') } : {}),
      ...(input.beforeState === null ? { beforeState: undefined } : input.beforeState ? { beforeState: safeRecord(input.beforeState, 'META_WORKFLOW_BEFORE_STATE_INVALID') } : {}),
      ...(input.afterState === null ? { afterState: undefined } : input.afterState ? { afterState: safeRecord(input.afterState, 'META_WORKFLOW_AFTER_STATE_INVALID') } : {}),
      ...(input.lastError === null ? { lastError: undefined } : input.lastError ? { lastError: safeRecord(input.lastError, 'META_WORKFLOW_STEP_ERROR_INVALID') } : {}),
      ...(input.incrementAttempt ? { attempt: step.attempt + 1 } : {}),
      ...(input.markStarted && !step.startedAt ? { startedAt: now } : {}),
      ...(input.markCompleted ? { completedAt: now } : {}),
      version: step.version + 1,
      updatedAt: now,
    };
    this.steps.set(updated.id, updated);
    return freeze(updated);
  }

  async prepareProviderCommand(input: Parameters<MetaWorkflowStore['prepareProviderCommand']>[0]) {
    this.checkGuard(input.guard);
    const existingJob = [...this.providerJobs.values()].find((job) => job.stepId === input.job.stepId
      && job.purpose === input.job.purpose && job.requestFingerprint === input.job.requestFingerprint.trim());
    const job = await this.createProviderJob({ ...input.job, guard: input.guard });
    try {
      const reconciliation = await this.createReconciliation({ ...input.reconciliation, providerJobId: job.id, guard: input.guard });
      return Object.freeze({ job, reconciliation });
    } catch (error) {
      if (!existingJob) this.providerJobs.delete(job.id);
      throw error;
    }
  }

  async createProviderJob(input: Parameters<MetaWorkflowStore['createProviderJob']>[0]) {
    this.checkGuard(input.guard);
    const workflow = this.workflows.get(input.workflowId);
    const step = this.steps.get(input.stepId);
    if (!workflow || !step || step.workflowId !== workflow.id) throw new Error('META_PROVIDER_JOB_SCOPE_INVALID');
    const immutable = {
      workflowId: workflow.id,
      stepId: step.id,
      purpose: input.purpose,
      capability: identifier(input.capability, 'META_PROVIDER_JOB_CAPABILITY_INVALID', 120),
      operationType: identifier(input.operationType, 'META_PROVIDER_JOB_OPERATION_TYPE_INVALID', 160),
      requestFingerprint: identifier(input.requestFingerprint, 'META_PROVIDER_JOB_FINGERPRINT_INVALID', 128),
      providerJobType: input.providerJobType ? identifier(input.providerJobType, 'META_PROVIDER_JOB_TYPE_INVALID', 120) : undefined,
      requestState: safeRecord(input.requestState, 'META_PROVIDER_REQUEST_STATE_INVALID'),
      beforeState: safeRecord(input.beforeState, 'META_PROVIDER_BEFORE_STATE_INVALID'),
    };
    const existing = [...this.providerJobs.values()].find((job) => job.stepId === step.id && job.purpose === immutable.purpose && job.requestFingerprint === immutable.requestFingerprint);
    if (existing) {
      const matches = existing.workflowId === immutable.workflowId
        && existing.purpose === immutable.purpose
        && existing.capability === immutable.capability
        && existing.operationType === immutable.operationType
        && (existing.providerJobType ?? undefined) === immutable.providerJobType
        && stable(existing.requestState) === stable(immutable.requestState)
        && stable(existing.beforeState) === stable(immutable.beforeState);
      if (!matches) throw new TypeError('META_PROVIDER_JOB_IDEMPOTENCY_CONFLICT');
      return freeze(existing);
    }
    const now = new Date().toISOString();
    const record: MetaProviderJobRecord = {
      id: randomUUID(),
      ...immutable,
      status: input.status,
      ...(input.providerJobId ? { providerJobId: identifier(input.providerJobId, 'META_PROVIDER_JOB_ID_INVALID', 255) } : {}),
      ...(input.providerObjectId ? { providerObjectId: identifier(input.providerObjectId, 'META_PROVIDER_OBJECT_ID_INVALID', 255) } : {}),
      ...(input.responseState ? { responseState: safeRecord(input.responseState, 'META_PROVIDER_RESPONSE_STATE_INVALID') } : {}),
      ...(input.afterState ? { afterState: safeRecord(input.afterState, 'META_PROVIDER_AFTER_STATE_INVALID') } : {}),
      ...(input.status === 'UNKNOWN' ? { unknownSince: (input.unknownSince ?? new Date()).toISOString() } : {}),
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.providerJobs.set(record.id, record);
    return freeze(record);
  }

  async getProviderJob(providerJobId: string) {
    const value = this.providerJobs.get(providerJobId);
    return value ? freeze(value) : null;
  }

  async listProviderJobs(workflowId: string) {
    return Object.freeze([...this.providerJobs.values()].filter((job) => job.workflowId === workflowId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((job) => freeze(job)));
  }

  async updateProviderJob(input: Parameters<MetaWorkflowStore['updateProviderJob']>[0]) {
    const job = this.providerJobs.get(input.providerJobId);
    if (!job) throw new Error('META_PROVIDER_JOB_NOT_FOUND');
    this.checkVersion('MetaProviderJob', job.id, input.expectedVersion, job.version);
    this.checkGuard(input.guard);
    if (input.status) assertMetaProviderJobStatusTransition(job.status, input.status);
    const now = new Date().toISOString();
    const updated: MetaProviderJobRecord = {
      ...job,
      ...(input.status ? { status: input.status } : {}),
      ...(input.providerJobIdValue === null ? { providerJobId: undefined } : input.providerJobIdValue ? { providerJobId: identifier(input.providerJobIdValue, 'META_PROVIDER_JOB_ID_INVALID', 255) } : {}),
      ...(input.providerObjectId === null ? { providerObjectId: undefined } : input.providerObjectId ? { providerObjectId: identifier(input.providerObjectId, 'META_PROVIDER_OBJECT_ID_INVALID', 255) } : {}),
      ...(input.responseState === null ? { responseState: undefined } : input.responseState ? { responseState: safeRecord(input.responseState, 'META_PROVIDER_RESPONSE_STATE_INVALID') } : {}),
      ...(input.afterState === null ? { afterState: undefined } : input.afterState ? { afterState: safeRecord(input.afterState, 'META_PROVIDER_AFTER_STATE_INVALID') } : {}),
      ...(input.unknownSince === null ? { unknownSince: undefined } : input.unknownSince ? { unknownSince: input.unknownSince.toISOString() } : {}),
      ...(input.lastCheckedAt ? { lastCheckedAt: input.lastCheckedAt.toISOString() } : {}),
      version: job.version + 1,
      updatedAt: now,
    };
    this.providerJobs.set(updated.id, updated);
    return freeze(updated);
  }

  async createReconciliation(input: Parameters<MetaWorkflowStore['createReconciliation']>[0]) {
    this.checkGuard(input.guard);
    const providerJob = this.providerJobs.get(input.providerJobId);
    if (!providerJob || providerJob.workflowId !== input.workflowId || providerJob.stepId !== input.stepId) throw new Error('META_RECONCILIATION_SCOPE_INVALID');
    const now = new Date();
    if (input.expiresAt.getTime() <= now.getTime()) throw new TypeError('META_RECONCILIATION_EXPIRY_INVALID');
    const immutable = {
      operationId: identifier(input.operationId, 'META_RECONCILIATION_OPERATION_ID_INVALID'),
      workflowId: input.workflowId,
      stepId: input.stepId,
      providerJobId: input.providerJobId,
      capability: identifier(input.capability, 'META_RECONCILIATION_CAPABILITY_INVALID', 120),
      operationType: identifier(input.operationType, 'META_RECONCILIATION_OPERATION_TYPE_INVALID', 160),
      resolverKey: identifier(input.resolverKey, 'META_RECONCILIATION_RESOLVER_INVALID', 200),
      expiresAt: input.expiresAt.toISOString(),
    };
    const existing = [...this.reconciliations.values()].find((item) => item.providerJobId === immutable.providerJobId);
    if (existing) {
      const matches = existing.operationId === immutable.operationId
        && existing.workflowId === immutable.workflowId
        && existing.stepId === immutable.stepId
        && existing.capability === immutable.capability
        && existing.operationType === immutable.operationType
        && existing.resolverKey === immutable.resolverKey
        && existing.expiresAt === immutable.expiresAt;
      if (!matches) throw new TypeError('META_RECONCILIATION_IDEMPOTENCY_CONFLICT');
      return freeze(existing);
    }
    const record: MetaReconciliationRecord = {
      id: randomUUID(),
      ...immutable,
      status: 'PENDING', attempts: 0, nextCheckAt: (input.nextCheckAt ?? now).toISOString(), version: 1,
      createdAt: now.toISOString(), updatedAt: now.toISOString(),
    };
    this.reconciliations.set(record.id, record);
    return freeze(record);
  }

  async getReconciliation(reconciliationId: string) {
    const value = this.reconciliations.get(reconciliationId);
    return value ? freeze(value) : null;
  }

  async listReconciliations(workflowId: string) {
    return Object.freeze([...this.reconciliations.values()].filter((item) => item.workflowId === workflowId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((item) => freeze(item)));
  }

  async listDueReconciliations(input: { readonly now?: Date; readonly limit?: number } = {}) {
    const now = input.now ?? new Date();
    const limit = Math.min(500, Math.max(1, input.limit ?? 50));
    return Object.freeze([...this.reconciliations.values()]
      .filter((item) => ['PENDING', 'RUNNING'].includes(item.status) && new Date(item.nextCheckAt).getTime() <= now.getTime())
      .sort((a, b) => a.nextCheckAt.localeCompare(b.nextCheckAt)).slice(0, limit).map((item) => freeze(item)));
  }

  async updateReconciliation(input: Parameters<MetaWorkflowStore['updateReconciliation']>[0]) {
    const current = this.reconciliations.get(input.reconciliationId);
    if (!current) throw new Error('META_RECONCILIATION_NOT_FOUND');
    this.checkVersion('MetaReconciliation', current.id, input.expectedVersion, current.version);
    this.checkGuard(input.guard);
    if (input.status) assertMetaReconciliationStatusTransition(current.status, input.status);
    const now = new Date().toISOString();
    const updated: MetaReconciliationRecord = {
      ...current,
      ...(input.status ? { status: input.status } : {}),
      ...(input.nextCheckAt ? { nextCheckAt: input.nextCheckAt.toISOString() } : {}),
      ...(input.evidence === null ? { evidence: undefined } : input.evidence ? { evidence: safeRecord(input.evidence, 'META_RECONCILIATION_EVIDENCE_INVALID') } : {}),
      ...(input.resolution === null ? { resolution: undefined } : input.resolution ? { resolution: safeRecord(input.resolution, 'META_RECONCILIATION_RESOLUTION_INVALID') } : {}),
      ...(input.lastError === null ? { lastError: undefined } : input.lastError ? { lastError: safeRecord(input.lastError, 'META_RECONCILIATION_ERROR_INVALID') } : {}),
      ...(input.incrementAttempts ? { attempts: current.attempts + 1 } : {}),
      version: current.version + 1,
      updatedAt: now,
    };
    this.reconciliations.set(updated.id, updated);
    return freeze(updated);
  }

  async commitProviderOutcome(input: CommitMetaWorkflowProviderOutcomeInput) {
    this.checkGuard(input.guard);
    const workflow = this.workflows.get(input.workflow.id);
    const step = this.steps.get(input.step.id);
    const providerJob = this.providerJobs.get(input.providerJob.id);
    const reconciliation = this.reconciliations.get(input.reconciliation.id);
    if (!workflow || !step || !providerJob || !reconciliation) throw new Error('META_PROVIDER_OUTCOME_SCOPE_MISSING');
    if (step.workflowId !== workflow.id || providerJob.workflowId !== workflow.id || providerJob.stepId !== step.id
      || reconciliation.workflowId !== workflow.id || reconciliation.stepId !== step.id || reconciliation.providerJobId !== providerJob.id) {
      throw new Error('META_PROVIDER_OUTCOME_SCOPE_INVALID');
    }
    this.checkVersion('MetaWorkflow', workflow.id, input.workflow.expectedVersion, workflow.version);
    this.checkVersion('MetaWorkflowStep', step.id, input.step.expectedVersion, step.version);
    this.checkVersion('MetaProviderJob', providerJob.id, input.providerJob.expectedVersion, providerJob.version);
    this.checkVersion('MetaReconciliation', reconciliation.id, input.reconciliation.expectedVersion, reconciliation.version);
    assertMetaWorkflowStatusTransition(workflow.status, input.workflow.status);
    assertMetaWorkflowStepStatusTransition(step.status, input.step.status);
    assertMetaProviderJobStatusTransition(providerJob.status, input.providerJob.status);
    assertMetaReconciliationStatusTransition(reconciliation.status, input.reconciliation.status);

    const now = new Date().toISOString();
    const updatedWorkflow: MetaWorkflowRecord = {
      ...workflow,
      status: input.workflow.status,
      ...(input.workflow.currentStepKey === null ? { currentStepKey: undefined } : input.workflow.currentStepKey ? { currentStepKey: input.workflow.currentStepKey } : {}),
      ...(input.workflow.lastError === null ? { lastError: undefined } : input.workflow.lastError ? { lastError: safeRecord(input.workflow.lastError, 'META_WORKFLOW_ERROR_INVALID') } : {}),
      ...(input.workflow.markCompleted ? { completedAt: now } : {}),
      version: workflow.version + 1,
      updatedAt: now,
    };
    const updatedStep: MetaWorkflowStepRecord = {
      ...step,
      status: input.step.status,
      ...(input.step.output === null ? { output: undefined } : input.step.output ? { output: safeRecord(input.step.output, 'META_WORKFLOW_STEP_OUTPUT_INVALID') } : {}),
      ...(input.step.beforeState === null ? { beforeState: undefined } : input.step.beforeState ? { beforeState: safeRecord(input.step.beforeState, 'META_WORKFLOW_BEFORE_STATE_INVALID') } : {}),
      ...(input.step.afterState === null ? { afterState: undefined } : input.step.afterState ? { afterState: safeRecord(input.step.afterState, 'META_WORKFLOW_AFTER_STATE_INVALID') } : {}),
      ...(input.step.lastError === null ? { lastError: undefined } : input.step.lastError ? { lastError: safeRecord(input.step.lastError, 'META_WORKFLOW_STEP_ERROR_INVALID') } : {}),
      ...(input.step.markCompleted ? { completedAt: now } : {}),
      version: step.version + 1,
      updatedAt: now,
    };
    const updatedJob: MetaProviderJobRecord = {
      ...providerJob,
      status: input.providerJob.status,
      ...(input.providerJob.providerJobId === null ? { providerJobId: undefined } : input.providerJob.providerJobId ? { providerJobId: identifier(input.providerJob.providerJobId, 'META_PROVIDER_JOB_ID_INVALID', 255) } : {}),
      ...(input.providerJob.providerObjectId === null ? { providerObjectId: undefined } : input.providerJob.providerObjectId ? { providerObjectId: identifier(input.providerJob.providerObjectId, 'META_PROVIDER_OBJECT_ID_INVALID', 255) } : {}),
      ...(input.providerJob.responseState === null ? { responseState: undefined } : input.providerJob.responseState ? { responseState: safeRecord(input.providerJob.responseState, 'META_PROVIDER_RESPONSE_STATE_INVALID') } : {}),
      ...(input.providerJob.afterState === null ? { afterState: undefined } : input.providerJob.afterState ? { afterState: safeRecord(input.providerJob.afterState, 'META_PROVIDER_AFTER_STATE_INVALID') } : {}),
      ...(input.providerJob.unknownSince === null ? { unknownSince: undefined } : input.providerJob.unknownSince ? { unknownSince: input.providerJob.unknownSince.toISOString() } : {}),
      ...(input.providerJob.lastCheckedAt ? { lastCheckedAt: input.providerJob.lastCheckedAt.toISOString() } : {}),
      version: providerJob.version + 1,
      updatedAt: now,
    };
    const updatedReconciliation: MetaReconciliationRecord = {
      ...reconciliation,
      status: input.reconciliation.status,
      ...(input.reconciliation.nextCheckAt ? { nextCheckAt: input.reconciliation.nextCheckAt.toISOString() } : {}),
      ...(input.reconciliation.evidence === null ? { evidence: undefined } : input.reconciliation.evidence ? { evidence: safeRecord(input.reconciliation.evidence, 'META_RECONCILIATION_EVIDENCE_INVALID') } : {}),
      ...(input.reconciliation.resolution === null ? { resolution: undefined } : input.reconciliation.resolution ? { resolution: safeRecord(input.reconciliation.resolution, 'META_RECONCILIATION_RESOLUTION_INVALID') } : {}),
      ...(input.reconciliation.lastError === null ? { lastError: undefined } : input.reconciliation.lastError ? { lastError: safeRecord(input.reconciliation.lastError, 'META_RECONCILIATION_ERROR_INVALID') } : {}),
      version: reconciliation.version + 1,
      updatedAt: now,
    };
    this.workflows.set(updatedWorkflow.id, updatedWorkflow);
    this.steps.set(updatedStep.id, updatedStep);
    this.providerJobs.set(updatedJob.id, updatedJob);
    this.reconciliations.set(updatedReconciliation.id, updatedReconciliation);
    return Object.freeze({
      workflow: freeze(updatedWorkflow), step: freeze(updatedStep), providerJob: freeze(updatedJob), reconciliation: freeze(updatedReconciliation),
    });
  }

  async createReplay(input: Parameters<MetaWorkflowStore['createReplay']>[0]) {
    const key = identifier(input.idempotencyKey, 'META_REPLAY_IDEMPOTENCY_KEY_INVALID', 200);
    const sourceOperationId = identifier(input.sourceOperationId, 'META_REPLAY_SOURCE_OPERATION_INVALID');
    const requestedBy = identifier(input.requestedBy, 'META_REPLAY_REQUESTER_INVALID', 160);
    const requestDigest = identifier(input.requestDigest, 'META_REPLAY_REQUEST_DIGEST_INVALID', 128);
    const reason = input.reason.trim();
    if (reason.length < 10 || reason.length > 1_000) throw new TypeError('META_REPLAY_REASON_INVALID');
    if (input.expiresAt.getTime() <= Date.now()) throw new TypeError('META_REPLAY_EXPIRY_INVALID');
    const existingId = this.replayByIdempotency.get(key);
    if (existingId) {
      const existing = this.replays.get(existingId)!;
      if (existing.sourceOperationId !== sourceOperationId || existing.requestedBy !== requestedBy
        || existing.reason !== reason || existing.requestDigest !== requestDigest || existing.expiresAt !== input.expiresAt.toISOString()) {
        throw new TypeError('META_REPLAY_IDEMPOTENCY_CONFLICT');
      }
      return freeze(existing);
    }
    const now = new Date().toISOString();
    const record: MetaReplayRecord = {
      id: randomUUID(), sourceOperationId, requestedBy, reason, idempotencyKey: key, requestDigest,
      expiresAt: input.expiresAt.toISOString(), status: 'REQUESTED', createdAt: now, updatedAt: now,
    };
    this.replays.set(record.id, record);
    this.replayByIdempotency.set(key, record.id);
    return freeze(record);
  }

  async approveReplay(input: Parameters<MetaWorkflowStore['approveReplay']>[0]) {
    const current = this.replays.get(input.replayId);
    if (!current) throw new Error('META_REPLAY_NOT_FOUND');
    const approvedBy = identifier(input.approvedBy, 'META_REPLAY_APPROVER_INVALID', 160);
    const approvalRole = identifier(input.approvalRole, 'META_REPLAY_APPROVAL_ROLE_INVALID', 120);
    if (current.status === 'APPROVED') {
      if (current.approvedBy !== approvedBy || current.approvalRole !== approvalRole) throw new TypeError('META_REPLAY_APPROVAL_CONFLICT');
      return freeze(current);
    }
    if (current.status !== 'REQUESTED') throw new TypeError('META_REPLAY_NOT_APPROVABLE');
    if (approvedBy === current.requestedBy) throw new TypeError('META_REPLAY_TWO_PERSON_APPROVAL_REQUIRED');
    const updated: MetaReplayRecord = {
      ...current,
      approvedBy,
      approvalRole,
      approvedAt: input.approvedAt.toISOString(),
      status: 'APPROVED',
      updatedAt: new Date().toISOString(),
    };
    this.replays.set(updated.id, updated);
    return freeze(updated);
  }

  async completeReplay(input: Parameters<MetaWorkflowStore['completeReplay']>[0]) {
    const current = this.replays.get(input.replayId);
    if (!current) throw new Error('META_REPLAY_NOT_FOUND');
    const hasOperation = Boolean(input.replayOperationId);
    const hasRejection = Boolean(input.rejectionCode);
    if (hasOperation === hasRejection) throw new TypeError('META_REPLAY_COMPLETION_INVALID');
    if (current.status === 'CREATED') {
      if (current.replayOperationId !== input.replayOperationId) throw new TypeError('META_REPLAY_COMPLETION_CONFLICT');
      return freeze(current);
    }
    if (current.status === 'REJECTED') {
      if (current.rejectionCode !== input.rejectionCode) throw new TypeError('META_REPLAY_COMPLETION_CONFLICT');
      return freeze(current);
    }
    if (hasOperation && current.status !== 'APPROVED') throw new TypeError('META_REPLAY_NOT_APPROVED');
    const updated: MetaReplayRecord = {
      ...current,
      ...(input.replayOperationId ? { replayOperationId: identifier(input.replayOperationId, 'META_REPLAY_OPERATION_INVALID') } : {}),
      ...(input.rejectionCode ? { rejectionCode: identifier(input.rejectionCode, 'META_REPLAY_REJECTION_INVALID', 160) } : {}),
      status: input.replayOperationId ? 'CREATED' : 'REJECTED',
      updatedAt: new Date().toISOString(),
    };
    this.replays.set(updated.id, updated);
    return freeze(updated);
  }

  async getReplayByIdempotencyKey(idempotencyKey: string) {
    const id = this.replayByIdempotency.get(idempotencyKey.trim());
    return id ? freeze(this.replays.get(id)!) : null;
  }

  async listReplays(sourceOperationId: string) {
    return Object.freeze([...this.replays.values()].filter((item) => item.sourceOperationId === sourceOperationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((item) => freeze(item)));
  }

  async assertFencingToken(scopeKey: string, fencingToken: number): Promise<void> {
    const normalized = identifier(scopeKey, 'META_FENCING_SCOPE_INVALID', 255);
    const currentToken = this.fencingTokens.get(normalized) ?? 0;
    if (!Number.isSafeInteger(fencingToken) || currentToken < 1 || fencingToken !== currentToken) {
      throw new MetaFencingTokenRejectedError({ scopeKey: normalized, suppliedToken: fencingToken, currentToken });
    }
  }

  async observeFencingToken(scopeKey: string, fencingToken: number): Promise<void> {
    const normalized = identifier(scopeKey, 'META_FENCING_SCOPE_INVALID', 255);
    if (!Number.isSafeInteger(fencingToken) || fencingToken < 1) throw new TypeError('META_FENCING_TOKEN_INVALID');
    const current = this.fencingTokens.get(normalized) ?? 0;
    if (fencingToken < current) throw new MetaFencingTokenRejectedError({ scopeKey: normalized, suppliedToken: fencingToken, currentToken: current });
    this.fencingTokens.set(normalized, fencingToken);
  }

  private checkVersion(entity: string, id: string, expectedVersion: number, actualVersion: number): void {
    if (expectedVersion !== actualVersion) throw new MetaOptimisticConcurrencyError({ entity, id, expectedVersion, actualVersion });
  }

  private checkGuard(guard: MetaWorkflowMutationGuard): void {
    if (guard.mode === 'ADMINISTRATIVE') {
      administrativeGuard(guard);
      return;
    }
    const normalized = identifier(guard.scopeKey, 'META_FENCING_SCOPE_INVALID', 255);
    const currentToken = this.fencingTokens.get(normalized) ?? 0;
    if (!Number.isSafeInteger(guard.fencingToken) || currentToken < 1 || guard.fencingToken !== currentToken) {
      throw new MetaFencingTokenRejectedError({ scopeKey: normalized, suppliedToken: guard.fencingToken, currentToken });
    }
  }
}
