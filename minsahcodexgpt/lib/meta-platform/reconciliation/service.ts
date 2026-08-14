import {
  metaReconciliationLockScope,
  metaWorkflowLockScope,
  runWithMetaLeaseHeartbeat,
  type MetaFencedLockManager,
} from '../concurrency';
import type { MetaWorkflowEngine } from '../workflows/engine';
import { MetaOptimisticConcurrencyError, type MetaWorkflowMutationGuard, type MetaWorkflowStore } from '../workflows/store';
import type { MetaProviderJobRecord, MetaReconciliationRecord, MetaWorkflowRecord, MetaWorkflowStepRecord } from '../workflows/types';

export type MetaUnknownOutcomeResolution =
  | { readonly outcome: 'SUCCEEDED'; readonly evidence: Readonly<Record<string, unknown>>; readonly afterState?: Readonly<Record<string, unknown>>; readonly providerObjectId?: string }
  | { readonly outcome: 'FAILED'; readonly evidence: Readonly<Record<string, unknown>>; readonly error: Readonly<Record<string, unknown>>; readonly retryable?: boolean }
  | { readonly outcome: 'PENDING'; readonly evidence?: Readonly<Record<string, unknown>>; readonly retryAt: Date }
  | { readonly outcome: 'NEEDS_REVIEW'; readonly evidence: Readonly<Record<string, unknown>>; readonly reason: string };

export interface MetaUnknownOutcomeResolver {
  resolve(input: {
    readonly reconciliation: MetaReconciliationRecord;
    readonly providerJob: MetaProviderJobRecord;
    readonly signal: AbortSignal;
  }): Promise<MetaUnknownOutcomeResolution>;
}

export class MetaUnknownOutcomeResolverRegistry {
  private readonly resolvers = new Map<string, MetaUnknownOutcomeResolver>();

  register(input: { readonly capability: string; readonly operationType: string; readonly resolverKey: string; readonly resolver: MetaUnknownOutcomeResolver }): this {
    const key = this.key(input.capability, input.operationType, input.resolverKey);
    if (this.resolvers.has(key)) throw new TypeError('META_RECONCILIATION_RESOLVER_DUPLICATE');
    this.resolvers.set(key, input.resolver);
    return this;
  }

  get(input: { readonly capability: string; readonly operationType: string; readonly resolverKey: string }): MetaUnknownOutcomeResolver | undefined {
    return this.resolvers.get(this.key(input.capability, input.operationType, input.resolverKey));
  }

  private key(capability: string, operationType: string, resolverKey: string): string {
    const parts = [capability, operationType, resolverKey].map((value) => value.trim());
    if (parts.some((value) => !value)) throw new TypeError('META_RECONCILIATION_RESOLVER_KEY_INVALID');
    return parts.join(':');
  }
}

export class MetaReconciliationService {
  private readonly workerId: string;
  private readonly leaseMs: number;

  constructor(private readonly options: {
    readonly store: MetaWorkflowStore;
    readonly resolvers: MetaUnknownOutcomeResolverRegistry;
    readonly lockManager: MetaFencedLockManager;
    readonly engine?: MetaWorkflowEngine;
    readonly workerId?: string;
    readonly leaseMs?: number;
  }) {
    this.workerId = options.workerId?.trim() || 'reconciliation-worker';
    this.leaseMs = Math.max(5_000, options.leaseMs ?? 60_000);
  }

  async reconcileDue(input: { readonly now?: Date; readonly limit?: number } = {}) {
    const due = await this.options.store.listDueReconciliations(input);
    const results: MetaReconciliationRecord[] = [];
    for (const item of due) {
      try {
        results.push(await this.reconcile(item.id, input.now));
      } catch (error) {
        if (!(error instanceof MetaOptimisticConcurrencyError)) throw error;
        const current = await this.options.store.getReconciliation(item.id);
        if (current) results.push(current);
      }
    }
    return Object.freeze(results);
  }

  async reconcile(reconciliationId: string, now = new Date()): Promise<MetaReconciliationRecord> {
    const scopeKey = metaReconciliationLockScope(reconciliationId);
    const lease = await this.options.lockManager.acquire({ scopeKey, ownerId: this.workerId, leaseMs: this.leaseMs, now });
    if (!lease) {
      const current = await this.options.store.getReconciliation(reconciliationId);
      if (!current) throw new Error('META_RECONCILIATION_NOT_FOUND');
      return current;
    }
    try {
      return await runWithMetaLeaseHeartbeat({
        manager: this.options.lockManager,
        lease,
        leaseMs: this.leaseMs,
        task: async ({ signal, assertActive }) => {
          const result = await this.reconcileClaimed(reconciliationId, now, signal, assertActive);
          assertActive();
          return result;
        },
      });
    } finally {
      await this.options.lockManager.release({ scopeKey, leaseToken: lease.leaseToken });
    }
  }

  private async reconcileClaimed(
    reconciliationId: string,
    now: Date,
    signal: AbortSignal,
    assertLeaseActive: () => void,
  ): Promise<MetaReconciliationRecord> {
    let reconciliation = await this.options.store.getReconciliation(reconciliationId);
    if (!reconciliation) throw new Error('META_RECONCILIATION_NOT_FOUND');
    if (['RESOLVED_SUCCEEDED', 'RESOLVED_FAILED'].includes(reconciliation.status)) {
      const repaired = await this.repairTerminalInvariant(reconciliation);
      if (this.options.engine) await this.options.engine.resume(repaired.workflowId);
      return (await this.options.store.getReconciliation(repaired.id)) ?? repaired;
    }
    if (['NEEDS_REVIEW', 'EXPIRED'].includes(reconciliation.status)) return reconciliation;
    if (reconciliation.status === 'RUNNING' && new Date(reconciliation.nextCheckAt).getTime() > now.getTime()) return reconciliation;
    const claimGuard = administrativeGuard(this.workerId, 'Claim unknown-outcome reconciliation for bounded resolver execution.');
    if (new Date(reconciliation.expiresAt).getTime() <= now.getTime()) {
      return this.options.store.updateReconciliation({
        reconciliationId: reconciliation.id, expectedVersion: reconciliation.version, guard: claimGuard,
        status: 'EXPIRED', lastError: { code: 'META_RECONCILIATION_EXPIRED' },
      });
    }
    reconciliation = await this.options.store.updateReconciliation({
      reconciliationId: reconciliation.id, expectedVersion: reconciliation.version, guard: claimGuard,
      status: 'RUNNING', nextCheckAt: new Date(now.getTime() + this.leaseMs), incrementAttempts: true, lastError: null,
    });
    const providerJob = await this.options.store.getProviderJob(reconciliation.providerJobId);
    if (!providerJob) throw new Error('META_RECONCILIATION_PROVIDER_JOB_NOT_FOUND');
    const resolver = this.options.resolvers.get(reconciliation);
    if (!resolver) {
      return this.options.store.updateReconciliation({
        reconciliationId: reconciliation.id, expectedVersion: reconciliation.version, guard: claimGuard,
        status: 'NEEDS_REVIEW', lastError: { code: 'META_RECONCILIATION_RESOLVER_NOT_FOUND' },
      });
    }

    let resolution: MetaUnknownOutcomeResolution;
    try {
      resolution = await resolver.resolve({ reconciliation, providerJob, signal });
      assertLeaseActive();
    } catch (error) {
      if (signal.aborted) throw error;
      const retryNow = new Date();
      return this.options.store.updateReconciliation({
        reconciliationId: reconciliation.id, expectedVersion: reconciliation.version, guard: claimGuard,
        status: 'PENDING', nextCheckAt: new Date(retryNow.getTime() + 60_000),
        lastError: { code: 'META_RECONCILIATION_RESOLVER_FAILED', message: safeMessage(error) },
      });
    }

    if (resolution.outcome === 'PENDING') {
      if (resolution.retryAt.getTime() >= new Date(reconciliation.expiresAt).getTime()) {
        return this.options.store.updateReconciliation({
          reconciliationId: reconciliation.id, expectedVersion: reconciliation.version, guard: claimGuard,
          status: 'EXPIRED', evidence: resolution.evidence, lastError: { code: 'META_RECONCILIATION_RETRY_AFTER_EXPIRY' },
        });
      }
      return this.options.store.updateReconciliation({
        reconciliationId: reconciliation.id, expectedVersion: reconciliation.version, guard: claimGuard,
        status: 'PENDING', nextCheckAt: resolution.retryAt, evidence: resolution.evidence, lastError: null,
      });
    }
    if (resolution.outcome === 'NEEDS_REVIEW') {
      return this.options.store.updateReconciliation({
        reconciliationId: reconciliation.id, expectedVersion: reconciliation.version, guard: claimGuard,
        status: 'NEEDS_REVIEW', evidence: resolution.evidence,
        lastError: { code: 'META_RECONCILIATION_REVIEW_REQUIRED', reason: resolution.reason },
      });
    }

    reconciliation = await this.finalizeResolution(reconciliation, resolution);
    if (this.options.engine) await this.options.engine.resume(reconciliation.workflowId);
    return (await this.options.store.getReconciliation(reconciliation.id)) ?? reconciliation;
  }

  private async repairTerminalInvariant(reconciliation: MetaReconciliationRecord): Promise<MetaReconciliationRecord> {
    const providerJob = await this.options.store.getProviderJob(reconciliation.providerJobId);
    const workflow = await this.options.store.getWorkflow(reconciliation.workflowId);
    const step = (await this.options.store.listWorkflowSteps(reconciliation.workflowId)).find((item) => item.id === reconciliation.stepId);
    if (!providerJob || !workflow || !step) throw new Error('META_RECONCILIATION_SCOPE_MISSING');
    const expected = targetStates(providerJob, reconciliation.status === 'RESOLVED_SUCCEEDED'
      ? { outcome: 'SUCCEEDED', evidence: reconciliation.evidence ?? {}, afterState: providerJob.afterState, providerObjectId: providerJob.providerObjectId }
      : { outcome: 'FAILED', evidence: reconciliation.evidence ?? {}, error: reconciliation.lastError ?? { code: 'META_RECONCILIATION_RESOLVED_FAILED' }, retryable: Boolean(reconciliation.resolution?.retryable) });
    if (providerJob.status === expected.providerJobStatus && step.status === expected.stepStatus && workflow.status === expected.workflowStatus) return reconciliation;
    const resolution: MetaUnknownOutcomeResolution = reconciliation.status === 'RESOLVED_SUCCEEDED'
      ? { outcome: 'SUCCEEDED', evidence: reconciliation.evidence ?? {}, afterState: providerJob.afterState, providerObjectId: providerJob.providerObjectId }
      : { outcome: 'FAILED', evidence: reconciliation.evidence ?? {}, error: reconciliation.lastError ?? { code: 'META_RECONCILIATION_RESOLVED_FAILED' }, retryable: Boolean(reconciliation.resolution?.retryable) };
    return this.finalizeResolution(reconciliation, resolution);
  }

  private async finalizeResolution(
    reconciliation: MetaReconciliationRecord,
    resolution: Extract<MetaUnknownOutcomeResolution, { readonly outcome: 'SUCCEEDED' | 'FAILED' }>,
  ): Promise<MetaReconciliationRecord> {
    const workflowScope = metaWorkflowLockScope(reconciliation.workflowId);
    const workflowLease = await this.options.lockManager.acquire({
      scopeKey: workflowScope, ownerId: `${this.workerId}-finalizer`, leaseMs: this.leaseMs,
    });
    if (!workflowLease) {
      // A terminal receipt is durable evidence. Never move it backwards merely
      // because the workflow repair lock is busy; a later invariant sweep can
      // safely retry the split-state repair from the terminal receipt.
      if (['RESOLVED_SUCCEEDED', 'RESOLVED_FAILED'].includes(reconciliation.status)) {
        return reconciliation;
      }
      return this.options.store.updateReconciliation({
        reconciliationId: reconciliation.id, expectedVersion: reconciliation.version,
        guard: administrativeGuard(this.workerId, 'Defer reconciliation because the workflow finalization lock is busy.'),
        status: 'PENDING', nextCheckAt: new Date(Date.now() + 5_000),
        lastError: { code: 'META_RECONCILIATION_WORKFLOW_LOCK_BUSY' },
      });
    }
    await this.options.store.observeFencingToken(workflowScope, workflowLease.fencingToken);
    const guard: Extract<MetaWorkflowMutationGuard, { readonly mode: 'FENCED' }> = {
      mode: 'FENCED', scopeKey: workflowScope, fencingToken: workflowLease.fencingToken,
    };
    try {
      return await runWithMetaLeaseHeartbeat({
        manager: this.options.lockManager,
        lease: workflowLease,
        leaseMs: this.leaseMs,
        task: async ({ assertActive }) => {
          const currentReconciliation = await this.options.store.getReconciliation(reconciliation.id);
          const providerJob = await this.options.store.getProviderJob(reconciliation.providerJobId);
          const workflow = await this.options.store.getWorkflow(reconciliation.workflowId);
          const step = (await this.options.store.listWorkflowSteps(reconciliation.workflowId)).find((item) => item.id === reconciliation.stepId);
          if (!currentReconciliation || !providerJob || !workflow || !step) throw new Error('META_RECONCILIATION_SCOPE_MISSING');
          const states = targetStates(providerJob, resolution);
          assertActive();
          const committed = await this.options.store.commitProviderOutcome({
            guard,
            workflow: {
              id: workflow.id, expectedVersion: workflow.version, status: states.workflowStatus,
              currentStepKey: step.stepKey, lastError: resolution.outcome === 'FAILED' ? resolution.error : null,
              markCompleted: states.workflowStatus === 'FAILED',
            },
            step: {
              id: step.id, expectedVersion: step.version, status: states.stepStatus,
              output: resolution.evidence, afterState: resolution.outcome === 'SUCCEEDED' ? resolution.afterState : undefined,
              lastError: resolution.outcome === 'FAILED' ? resolution.error : null,
              markCompleted: !['COMPENSATION_FAILED_RETRYABLE'].includes(states.stepStatus),
            },
            providerJob: {
              id: providerJob.id, expectedVersion: providerJob.version, status: states.providerJobStatus,
              providerObjectId: resolution.outcome === 'SUCCEEDED' ? resolution.providerObjectId : undefined,
              afterState: resolution.outcome === 'SUCCEEDED' ? resolution.afterState : undefined,
              responseState: resolution.evidence, unknownSince: null, lastCheckedAt: new Date(),
            },
            reconciliation: {
              id: currentReconciliation.id, expectedVersion: currentReconciliation.version,
              status: resolution.outcome === 'SUCCEEDED' ? 'RESOLVED_SUCCEEDED' : 'RESOLVED_FAILED',
              evidence: resolution.evidence,
              resolution: resolution.outcome === 'SUCCEEDED'
                ? {
                  outcome: 'SUCCEEDED', purpose: providerJob.purpose,
                  ...(resolution.providerObjectId ? { providerObjectId: resolution.providerObjectId } : {}),
                }
                : { outcome: 'FAILED', retryable: Boolean(resolution.retryable), purpose: providerJob.purpose },
              lastError: resolution.outcome === 'FAILED' ? resolution.error : null,
            },
          });
          return committed.reconciliation;
        },
      });
    } finally {
      await this.options.lockManager.release({ scopeKey: workflowScope, leaseToken: workflowLease.leaseToken });
    }
  }
}

function targetStates(
  providerJob: MetaProviderJobRecord,
  resolution: Extract<MetaUnknownOutcomeResolution, { readonly outcome: 'SUCCEEDED' | 'FAILED' }>,
): {
  readonly providerJobStatus: 'SUCCEEDED' | 'FAILED';
  readonly stepStatus: MetaWorkflowStepRecord['status'];
  readonly workflowStatus: MetaWorkflowRecord['status'];
} {
  if (resolution.outcome === 'SUCCEEDED') {
    return providerJob.purpose === 'COMPENSATION'
      ? { providerJobStatus: 'SUCCEEDED', stepStatus: 'COMPENSATED', workflowStatus: 'COMPENSATING' }
      : { providerJobStatus: 'SUCCEEDED', stepStatus: 'SUCCEEDED', workflowStatus: 'RUNNING' };
  }
  if (providerJob.purpose === 'COMPENSATION') {
    return resolution.retryable
      ? { providerJobStatus: 'FAILED', stepStatus: 'COMPENSATION_FAILED_RETRYABLE', workflowStatus: 'COMPENSATION_FAILED_RETRYABLE' }
      : { providerJobStatus: 'FAILED', stepStatus: 'FAILED', workflowStatus: 'FAILED' };
  }
  return { providerJobStatus: 'FAILED', stepStatus: 'FAILED', workflowStatus: 'RUNNING' };
}

function administrativeGuard(actorId: string, reason: string): Extract<MetaWorkflowMutationGuard, { readonly mode: 'ADMINISTRATIVE' }> {
  return { mode: 'ADMINISTRATIVE', actorId, reason };
}

function safeMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : 'Resolver failed.';
}
