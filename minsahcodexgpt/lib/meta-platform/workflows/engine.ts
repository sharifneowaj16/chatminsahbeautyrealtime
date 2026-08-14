import {
  MetaFencedLeaseLostError,
  metaWorkflowLockScope,
  runWithMetaLeaseHeartbeat,
  type MetaFencedLockManager,
} from '../concurrency';
import type { MetaWorkflowMutationGuard, MetaWorkflowStore } from './store';
import type {
  MetaProviderCommand,
  MetaProviderJobRecord,
  MetaReconciliationRecord,
  MetaWorkflowDefinition,
  MetaWorkflowRecord,
  MetaWorkflowStepDefinition,
  MetaWorkflowStepOutcome,
  MetaWorkflowStepRecord,
} from './types';

const DEFINITION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;

export class MetaWorkflowDefinitionRegistry {
  private readonly definitions = new Map<string, MetaWorkflowDefinition>();

  register<TContext extends Record<string, unknown>>(definition: MetaWorkflowDefinition<TContext>): this {
    const id = definition.id.trim();
    if (!DEFINITION_PATTERN.test(id) || !Number.isInteger(definition.version) || definition.version < 1 || definition.steps.length < 1) {
      throw new TypeError('META_WORKFLOW_DEFINITION_INVALID');
    }
    const keys = definition.steps.map((step) => step.key.trim());
    if (keys.some((key) => !DEFINITION_PATTERN.test(key)) || new Set(keys).size !== keys.length) {
      throw new TypeError('META_WORKFLOW_STEP_DEFINITION_INVALID');
    }
    const registryKey = `${id}@${definition.version}`;
    if (this.definitions.has(registryKey)) throw new TypeError('META_WORKFLOW_DEFINITION_DUPLICATE');
    this.definitions.set(registryKey, Object.freeze({ ...definition, id, steps: Object.freeze([...definition.steps]) }) as MetaWorkflowDefinition);
    return this;
  }

  get(id: string, version: number): MetaWorkflowDefinition | undefined {
    return this.definitions.get(`${id.trim()}@${version}`);
  }
}

export interface MetaWorkflowEngineOptions {
  readonly store: MetaWorkflowStore;
  readonly definitions: MetaWorkflowDefinitionRegistry;
  readonly lockManager: MetaFencedLockManager;
  readonly workerId?: string;
  readonly leaseMs?: number;
}

interface PreparedProviderExecution {
  readonly job: MetaProviderJobRecord;
  readonly reconciliation: MetaReconciliationRecord;
}

export class MetaWorkflowEngine {
  private readonly store: MetaWorkflowStore;
  private readonly definitions: MetaWorkflowDefinitionRegistry;
  private readonly lockManager: MetaFencedLockManager;
  private readonly workerId: string;
  private readonly leaseMs: number;

  constructor(options: MetaWorkflowEngineOptions) {
    this.store = options.store;
    this.definitions = options.definitions;
    this.lockManager = options.lockManager;
    this.workerId = options.workerId?.trim() || 'workflow-worker';
    this.leaseMs = Math.max(1_000, options.leaseMs ?? 60_000);
  }

  async start(input: {
    readonly operationId: string;
    readonly definitionId: string;
    readonly definitionVersion: number;
    readonly priority: import('../reliability/types').MetaOperationPriority;
    readonly context?: Readonly<Record<string, unknown>>;
  }): Promise<MetaWorkflowRecord> {
    const definition = this.requireDefinition(input.definitionId, input.definitionVersion);
    const created = await this.store.createWorkflow({
      operationId: input.operationId,
      definitionId: definition.id,
      definitionVersion: definition.version,
      priority: input.priority,
      context: input.context,
      stepKeys: definition.steps.map((step) => step.key),
    });
    return this.resume(created.workflow.id);
  }

  async resume(workflowId: string): Promise<MetaWorkflowRecord> {
    const scopeKey = metaWorkflowLockScope(workflowId);
    const lease = await this.lockManager.acquire({ scopeKey, ownerId: this.workerId, leaseMs: this.leaseMs });
    if (!lease) return this.requireWorkflow(workflowId);
    await this.store.observeFencingToken(scopeKey, lease.fencingToken);
    const guard: Extract<MetaWorkflowMutationGuard, { readonly mode: 'FENCED' }> = {
      mode: 'FENCED', scopeKey, fencingToken: lease.fencingToken,
    };
    try {
      return await runWithMetaLeaseHeartbeat({
        manager: this.lockManager,
        lease,
        leaseMs: this.leaseMs,
        task: async ({ signal, assertActive }) => {
          const result = await this.resumeLocked(workflowId, guard, signal, assertActive);
          assertActive();
          return result;
        },
      });
    } finally {
      await this.lockManager.release({ scopeKey, leaseToken: lease.leaseToken });
    }
  }

  private async resumeLocked(
    workflowId: string,
    guard: Extract<MetaWorkflowMutationGuard, { readonly mode: 'FENCED' }>,
    signal: AbortSignal,
    assertLeaseActive: () => void,
  ): Promise<MetaWorkflowRecord> {
    let workflow = await this.requireWorkflow(workflowId);
    if (['SUCCEEDED', 'FAILED', 'COMPENSATED', 'CANCELLED'].includes(workflow.status)) return workflow;
    const definition = this.requireDefinition(workflow.definitionId, workflow.definitionVersion);
    if (workflow.status === 'WAITING_RECONCILIATION') return workflow;
    if (workflow.status === 'COMPENSATING' || workflow.status === 'COMPENSATION_FAILED_RETRYABLE') {
      const failedStep = (await this.store.listWorkflowSteps(workflow.id)).find((step) => step.status === 'FAILED');
      if (!failedStep) throw new Error('META_WORKFLOW_FAILED_STEP_MISSING');
      return this.compensate(workflow, definition, failedStep, guard, signal, assertLeaseActive);
    }
    if (workflow.status === 'PENDING') {
      workflow = await this.store.updateWorkflow({
        workflowId: workflow.id, expectedVersion: workflow.version, guard, status: 'RUNNING', markStarted: true,
      });
    }

    for (const stepDefinition of definition.steps) {
      assertLeaseActive();
      const steps = await this.store.listWorkflowSteps(workflow.id);
      let step = this.requireStep(steps, stepDefinition.key);
      if (['SUCCEEDED', 'COMPENSATED', 'SKIPPED'].includes(step.status)) continue;
      if (step.status === 'UNKNOWN') {
        return this.store.updateWorkflow({
          workflowId: workflow.id, expectedVersion: workflow.version, guard,
          status: 'WAITING_RECONCILIATION', currentStepKey: step.stepKey,
        });
      }
      if (step.status === 'RUNNING') {
        const recovered = await this.recoverInterruptedProviderCommand(workflow, step, guard, 'EXECUTION');
        if (recovered) return recovered;
        const failedStep = await this.store.updateStep({
          stepId: step.id, expectedVersion: step.version, guard, status: 'FAILED', markCompleted: true,
          lastError: { code: 'META_WORKFLOW_LOCAL_STEP_INTERRUPTED', retryable: false },
        });
        workflow = await this.requireWorkflow(workflow.id);
        return this.compensate(workflow, definition, failedStep, guard, signal, assertLeaseActive);
      }
      if (step.status === 'FAILED') return this.compensate(workflow, definition, step, guard, signal, assertLeaseActive);

      workflow = await this.store.updateWorkflow({
        workflowId: workflow.id, expectedVersion: workflow.version, guard,
        status: 'RUNNING', currentStepKey: step.stepKey,
      });
      step = await this.store.updateStep({
        stepId: step.id, expectedVersion: step.version, guard, status: 'RUNNING', incrementAttempt: true, markStarted: true,
      });
      const priorSteps = (await this.store.listWorkflowSteps(workflow.id)).filter((candidate) => candidate.ordinal < step.ordinal);
      let prepared: PreparedProviderExecution | undefined;
      try {
        if (stepDefinition.prepareExecution) {
          const command = await stepDefinition.prepareExecution({ workflow, step, context: workflow.context, priorSteps });
          if (command.purpose !== 'EXECUTION') throw new TypeError('META_EXECUTION_COMMAND_PURPOSE_INVALID');
          prepared = await this.prepareProviderExecution(workflow, step, command, guard);
        }
      } catch (error) {
        const failedStep = await this.store.updateStep({
          stepId: step.id, expectedVersion: step.version, guard, status: 'FAILED', markCompleted: true,
          lastError: { code: 'META_WORKFLOW_STEP_PREPARATION_FAILED', message: safeMessage(error) },
        });
        workflow = await this.requireWorkflow(workflow.id);
        return this.compensate(workflow, definition, failedStep, guard, signal, assertLeaseActive);
      }

      let outcome: MetaWorkflowStepOutcome;
      try {
        outcome = await stepDefinition.execute({ workflow, step, context: workflow.context, priorSteps, providerJob: prepared?.job, signal });
        assertLeaseActive();
      } catch (error) {
        if (error instanceof MetaFencedLeaseLostError || signal.aborted) throw error;
        outcome = prepared
          ? { outcome: 'UNKNOWN', error: { code: 'META_PROVIDER_OUTCOME_UNKNOWN', message: safeMessage(error), requestMayHaveSucceeded: true } }
          : { outcome: 'FAILED', error: { code: 'META_WORKFLOW_STEP_THROWN', message: safeMessage(error) } };
      }

      if (prepared) {
        const committed = await this.commitPreparedOutcome({ workflow, step, prepared, outcome, guard, purpose: 'EXECUTION' });
        workflow = committed.workflow;
        if (outcome.outcome === 'SUCCEEDED') continue;
        if (outcome.outcome === 'UNKNOWN') return workflow;
        return this.compensate(workflow, definition, committed.step, guard, signal, assertLeaseActive);
      }

      if (outcome.outcome === 'SUCCEEDED') {
        await this.store.updateStep({
          stepId: step.id, expectedVersion: step.version, guard, status: 'SUCCEEDED', output: outcome.output,
          beforeState: outcome.beforeState, afterState: outcome.afterState, lastError: null, markCompleted: true,
        });
        workflow = await this.requireWorkflow(workflow.id);
        continue;
      }
      if (outcome.outcome === 'UNKNOWN') {
        throw new TypeError('META_WORKFLOW_UNKNOWN_REQUIRES_PREPARED_PROVIDER_COMMAND');
      }
      const failedStep = await this.store.updateStep({
        stepId: step.id, expectedVersion: step.version, guard, status: 'FAILED', lastError: outcome.error, markCompleted: true,
      });
      workflow = await this.requireWorkflow(workflow.id);
      return this.compensate(workflow, definition, failedStep, guard, signal, assertLeaseActive);
    }

    workflow = await this.requireWorkflow(workflow.id);
    return this.store.updateWorkflow({
      workflowId: workflow.id, expectedVersion: workflow.version, guard,
      status: 'SUCCEEDED', currentStepKey: null, lastError: null, markCompleted: true,
    });
  }

  private async prepareProviderExecution(
    workflow: MetaWorkflowRecord,
    step: MetaWorkflowStepRecord,
    command: MetaProviderCommand,
    guard: MetaWorkflowMutationGuard,
  ): Promise<PreparedProviderExecution> {
    if (command.reconciliation.expiresAt.getTime() <= Date.now()) throw new TypeError('META_PROVIDER_COMMAND_RECONCILIATION_EXPIRY_INVALID');
    const prepared = await this.store.prepareProviderCommand({
      guard,
      job: {
        workflowId: workflow.id, stepId: step.id, purpose: command.purpose,
        capability: command.capability, operationType: command.operationType,
        requestFingerprint: command.requestFingerprint, providerJobType: command.providerJobType,
        requestState: command.requestState, beforeState: command.beforeState, status: 'RUNNING',
      },
      reconciliation: {
        operationId: workflow.operationId, workflowId: workflow.id, stepId: step.id,
        capability: command.capability, operationType: command.operationType, resolverKey: command.reconciliation.resolverKey,
        nextCheckAt: command.reconciliation.nextCheckAt ?? new Date(Date.now() + this.leaseMs),
        expiresAt: command.reconciliation.expiresAt,
      },
    });
    if (!['PENDING', 'SUBMITTED', 'RUNNING'].includes(prepared.job.status)
      || !['PENDING', 'RUNNING'].includes(prepared.reconciliation.status)) {
      throw new TypeError('META_PROVIDER_COMMAND_IDENTITY_ALREADY_TERMINAL');
    }
    return prepared;
  }

  private async recoverInterruptedProviderCommand(
    workflow: MetaWorkflowRecord,
    step: MetaWorkflowStepRecord,
    guard: Extract<MetaWorkflowMutationGuard, { readonly mode: 'FENCED' }>,
    purpose: 'EXECUTION' | 'COMPENSATION',
  ): Promise<MetaWorkflowRecord | null> {
    const jobs = (await this.store.listProviderJobs(workflow.id))
      .filter((job) => job.stepId === step.id && job.purpose === purpose && ['PENDING', 'SUBMITTED', 'RUNNING', 'UNKNOWN'].includes(job.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const job = jobs[0];
    if (!job) return null;
    const reconciliation = (await this.store.listReconciliations(workflow.id)).find((item) => item.providerJobId === job.id);
    if (!reconciliation) throw new Error('META_INTERRUPTED_PROVIDER_RECONCILIATION_MISSING');
    const code = purpose === 'EXECUTION' ? 'META_PROVIDER_EXECUTION_INTERRUPTED' : 'META_PROVIDER_COMPENSATION_INTERRUPTED';
    const committed = await this.store.commitProviderOutcome({
      guard,
      workflow: { id: workflow.id, expectedVersion: workflow.version, status: 'WAITING_RECONCILIATION', currentStepKey: step.stepKey, lastError: { code } },
      step: { id: step.id, expectedVersion: step.version, status: 'UNKNOWN', lastError: { code, requestMayHaveSucceeded: true } },
      providerJob: {
        id: job.id, expectedVersion: job.version, status: 'UNKNOWN',
        ...(job.unknownSince ? {} : { unknownSince: new Date() }),
      },
      reconciliation: { id: reconciliation.id, expectedVersion: reconciliation.version, status: 'PENDING', nextCheckAt: new Date(), lastError: { code } },
    });
    return committed.workflow;
  }

  private async commitPreparedOutcome(input: {
    readonly workflow: MetaWorkflowRecord;
    readonly step: MetaWorkflowStepRecord;
    readonly prepared: PreparedProviderExecution;
    readonly outcome: MetaWorkflowStepOutcome;
    readonly guard: Extract<MetaWorkflowMutationGuard, { readonly mode: 'FENCED' }>;
    readonly purpose: 'EXECUTION' | 'COMPENSATION';
  }) {
    const { outcome, prepared } = input;
    if (outcome.outcome === 'SUCCEEDED') {
      return this.store.commitProviderOutcome({
        guard: input.guard,
        workflow: {
          id: input.workflow.id, expectedVersion: input.workflow.version,
          status: input.purpose === 'EXECUTION' ? 'RUNNING' : 'COMPENSATING', lastError: null,
        },
        step: {
          id: input.step.id, expectedVersion: input.step.version,
          status: input.purpose === 'EXECUTION' ? 'SUCCEEDED' : 'COMPENSATED',
          output: outcome.output, beforeState: outcome.beforeState ?? prepared.job.beforeState,
          afterState: outcome.afterState, lastError: null, markCompleted: true,
        },
        providerJob: {
          id: prepared.job.id, expectedVersion: prepared.job.version, status: 'SUCCEEDED',
          providerJobId: outcome.providerJobId, providerObjectId: outcome.providerObjectId,
          responseState: outcome.responseState ?? outcome.output, afterState: outcome.afterState, lastCheckedAt: new Date(),
        },
        reconciliation: {
          id: prepared.reconciliation.id, expectedVersion: prepared.reconciliation.version, status: 'RESOLVED_SUCCEEDED',
          evidence: outcome.responseState ?? outcome.output ?? {},
          resolution: {
            outcome: 'SUCCEEDED', source: 'DIRECT_RESPONSE', purpose: input.purpose,
            ...(outcome.providerObjectId ? { providerObjectId: outcome.providerObjectId } : {}),
          },
          lastError: null,
        },
      });
    }
    if (outcome.outcome === 'UNKNOWN') {
      return this.store.commitProviderOutcome({
        guard: input.guard,
        workflow: { id: input.workflow.id, expectedVersion: input.workflow.version, status: 'WAITING_RECONCILIATION', currentStepKey: input.step.stepKey, lastError: outcome.error },
        step: { id: input.step.id, expectedVersion: input.step.version, status: 'UNKNOWN', beforeState: prepared.job.beforeState, afterState: outcome.afterState, lastError: outcome.error },
        providerJob: {
          id: prepared.job.id, expectedVersion: prepared.job.version, status: 'UNKNOWN', providerJobId: outcome.providerJobId,
          providerObjectId: outcome.providerObjectId, responseState: outcome.responseState, afterState: outcome.afterState, unknownSince: new Date(), lastCheckedAt: new Date(),
        },
        reconciliation: { id: prepared.reconciliation.id, expectedVersion: prepared.reconciliation.version, status: 'PENDING', nextCheckAt: new Date(), lastError: outcome.error },
      });
    }
    const compensationRetryable = input.purpose === 'COMPENSATION' && outcome.retryable === true;
    return this.store.commitProviderOutcome({
      guard: input.guard,
      workflow: {
        id: input.workflow.id, expectedVersion: input.workflow.version,
        status: input.purpose === 'EXECUTION' ? 'RUNNING' : compensationRetryable ? 'COMPENSATION_FAILED_RETRYABLE' : 'FAILED',
        lastError: outcome.error, markCompleted: input.purpose === 'COMPENSATION' && !compensationRetryable,
      },
      step: {
        id: input.step.id, expectedVersion: input.step.version,
        status: input.purpose === 'EXECUTION' ? 'FAILED' : compensationRetryable ? 'COMPENSATION_FAILED_RETRYABLE' : 'FAILED',
        lastError: outcome.error, markCompleted: !compensationRetryable,
      },
      providerJob: { id: prepared.job.id, expectedVersion: prepared.job.version, status: 'FAILED', responseState: outcome.responseState, lastCheckedAt: new Date() },
      reconciliation: {
        id: prepared.reconciliation.id, expectedVersion: prepared.reconciliation.version, status: 'RESOLVED_FAILED',
        evidence: outcome.responseState ?? {}, resolution: { outcome: 'FAILED', source: 'DIRECT_RESPONSE', purpose: input.purpose, retryable: Boolean(outcome.retryable) }, lastError: outcome.error,
      },
    });
  }

  private async compensate(
    workflow: MetaWorkflowRecord,
    definition: MetaWorkflowDefinition,
    failedStep: MetaWorkflowStepRecord,
    guard: Extract<MetaWorkflowMutationGuard, { readonly mode: 'FENCED' }>,
    signal: AbortSignal,
    assertLeaseActive: () => void,
  ): Promise<MetaWorkflowRecord> {
    if (workflow.status !== 'COMPENSATING') {
      workflow = await this.store.updateWorkflow({
        workflowId: workflow.id, expectedVersion: workflow.version, guard, status: 'COMPENSATING',
        currentStepKey: failedStep.stepKey, lastError: failedStep.lastError ?? { code: 'META_WORKFLOW_STEP_FAILED' },
      });
    }
    const steps = await this.store.listWorkflowSteps(workflow.id);
    const candidates = steps
      .filter((step) => ['SUCCEEDED', 'COMPENSATING', 'COMPENSATION_FAILED_RETRYABLE'].includes(step.status) && step.ordinal < failedStep.ordinal)
      .sort((a, b) => b.ordinal - a.ordinal);
    for (const candidate of candidates) {
      assertLeaseActive();
      const stepDefinition = definition.steps.find((item) => item.key === candidate.stepKey) as MetaWorkflowStepDefinition | undefined;
      if (!stepDefinition?.compensate) continue;
      if (candidate.status === 'COMPENSATING') {
        const recovered = await this.recoverInterruptedProviderCommand(workflow, candidate, guard, 'COMPENSATION');
        if (recovered) return recovered;
        const interrupted = await this.store.updateStep({
          stepId: candidate.id, expectedVersion: candidate.version, guard, status: 'COMPENSATION_FAILED_RETRYABLE',
          lastError: { code: 'META_WORKFLOW_LOCAL_COMPENSATION_INTERRUPTED', retryable: true },
        });
        workflow = await this.requireWorkflow(workflow.id);
        return this.store.updateWorkflow({
          workflowId: workflow.id, expectedVersion: workflow.version, guard, status: 'COMPENSATION_FAILED_RETRYABLE',
          currentStepKey: interrupted.stepKey, lastError: interrupted.lastError,
        });
      }
      let current = await this.store.updateStep({
        stepId: candidate.id, expectedVersion: candidate.version, guard, status: 'COMPENSATING',
      });
      const priorSteps = steps.filter((item) => item.ordinal < current.ordinal);
      let prepared: PreparedProviderExecution | undefined;
      try {
        if (stepDefinition.prepareCompensation) {
          const command = await stepDefinition.prepareCompensation({ workflow, step: current, context: workflow.context, priorSteps });
          if (command.purpose !== 'COMPENSATION') throw new TypeError('META_COMPENSATION_COMMAND_PURPOSE_INVALID');
          prepared = await this.prepareProviderExecution(workflow, current, command, guard);
        }
      } catch (error) {
        current = await this.store.updateStep({
          stepId: current.id, expectedVersion: current.version, guard, status: 'COMPENSATION_FAILED_RETRYABLE',
          lastError: { code: 'META_WORKFLOW_COMPENSATION_PREPARATION_FAILED', message: safeMessage(error), retryable: true },
        });
        workflow = await this.requireWorkflow(workflow.id);
        return this.store.updateWorkflow({
          workflowId: workflow.id, expectedVersion: workflow.version, guard, status: 'COMPENSATION_FAILED_RETRYABLE',
          currentStepKey: current.stepKey, lastError: current.lastError,
        });
      }

      let outcome: MetaWorkflowStepOutcome;
      try {
        outcome = await stepDefinition.compensate({ workflow, step: current, context: workflow.context, priorSteps, providerJob: prepared?.job, signal });
        assertLeaseActive();
      } catch (error) {
        if (error instanceof MetaFencedLeaseLostError || signal.aborted) throw error;
        outcome = prepared
          ? { outcome: 'UNKNOWN', error: { code: 'META_COMPENSATION_OUTCOME_UNKNOWN', message: safeMessage(error), requestMayHaveSucceeded: true } }
          : { outcome: 'FAILED', retryable: true, error: { code: 'META_WORKFLOW_COMPENSATION_FAILED', message: safeMessage(error) } };
      }

      if (prepared) {
        const committed = await this.commitPreparedOutcome({ workflow, step: current, prepared, outcome, guard, purpose: 'COMPENSATION' });
        workflow = committed.workflow;
        if (outcome.outcome === 'UNKNOWN' || (outcome.outcome === 'FAILED' && outcome.retryable)) return workflow;
        if (outcome.outcome === 'FAILED') return workflow;
        continue;
      }

      if (outcome.outcome === 'SUCCEEDED') {
        await this.store.updateStep({
          stepId: current.id, expectedVersion: current.version, guard, status: 'COMPENSATED', output: outcome.output,
          afterState: outcome.afterState, lastError: null, markCompleted: true,
        });
        continue;
      }
      if (outcome.outcome === 'UNKNOWN') throw new TypeError('META_COMPENSATION_UNKNOWN_REQUIRES_PREPARED_PROVIDER_COMMAND');
      current = await this.store.updateStep({
        stepId: current.id, expectedVersion: current.version, guard,
        status: outcome.retryable ? 'COMPENSATION_FAILED_RETRYABLE' : 'FAILED', lastError: outcome.error, markCompleted: !outcome.retryable,
      });
      workflow = await this.requireWorkflow(workflow.id);
      return this.store.updateWorkflow({
        workflowId: workflow.id, expectedVersion: workflow.version, guard,
        status: outcome.retryable ? 'COMPENSATION_FAILED_RETRYABLE' : 'FAILED', currentStepKey: current.stepKey,
        lastError: outcome.error, markCompleted: !outcome.retryable,
      });
    }
    workflow = await this.requireWorkflow(workflow.id);
    return this.store.updateWorkflow({
      workflowId: workflow.id, expectedVersion: workflow.version, guard,
      status: 'COMPENSATED', currentStepKey: null, markCompleted: true,
    });
  }

  private requireDefinition(id: string, version: number): MetaWorkflowDefinition {
    const definition = this.definitions.get(id, version);
    if (!definition) throw new Error('META_WORKFLOW_DEFINITION_NOT_FOUND');
    return definition;
  }

  private async requireWorkflow(workflowId: string): Promise<MetaWorkflowRecord> {
    const workflow = await this.store.getWorkflow(workflowId);
    if (!workflow) throw new Error('META_WORKFLOW_NOT_FOUND');
    return workflow;
  }

  private requireStep(steps: readonly MetaWorkflowStepRecord[], key: string): MetaWorkflowStepRecord {
    const step = steps.find((candidate) => candidate.stepKey === key);
    if (!step) throw new Error('META_WORKFLOW_STEP_NOT_FOUND');
    return step;
  }
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : 'Workflow action failed.';
}
