import 'server-only';

import { randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import { assertMetaVersionedPayload } from '../operations/payload';
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
  CreateMetaWorkflowInput,
  MetaProviderJobRecord,
  MetaReconciliationRecord,
  MetaReplayRecord,
  MetaWorkflowRecord,
  MetaWorkflowStepRecord,
} from './types';

export interface MetaWorkflowSqlExecutor {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
}
export interface MetaWorkflowPrismaClient extends MetaWorkflowSqlExecutor {
  $transaction<T>(callback: (tx: MetaWorkflowSqlExecutor) => Promise<T>): Promise<T>;
}

const parseJson = <T>(value: unknown): T | undefined => value == null ? undefined : (typeof value === 'string' ? JSON.parse(value) as T : value as T);
const json = (value: unknown): string | null => value == null ? null : JSON.stringify(value);
const iso = (value: unknown): string | undefined => value == null ? undefined : new Date(value as string | Date).toISOString();
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
function clean(value: string, code: string, max = 255): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max || !IDENTIFIER.test(normalized)) throw new TypeError(code);
  return normalized;
}
function safe(value: Readonly<Record<string, unknown>> | undefined | null): Readonly<Record<string, unknown>> | undefined {
  if (value == null) return undefined;
  assertMetaVersionedPayload({ type: 'workflow.state', schemaVersion: 1, data: value });
  return value;
}
function stable(value: unknown): string {
  const normalize = (item: unknown): unknown => Array.isArray(item) ? item.map(normalize) : item && typeof item === 'object'
    ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, normalize(child)]))
    : item;
  return JSON.stringify(normalize(value));
}

function workflow(row: Record<string, unknown>): MetaWorkflowRecord {
  return Object.freeze({
    id: String(row.id), operationId: String(row.operationId), definitionId: String(row.definitionId), definitionVersion: Number(row.definitionVersion),
    status: String(row.status) as MetaWorkflowRecord['status'], ...(row.currentStepKey == null ? {} : { currentStepKey: String(row.currentStepKey) }),
    priority: String(row.priority) as MetaWorkflowRecord['priority'], context: Object.freeze(parseJson<Record<string, unknown>>(row.context) ?? {}),
    version: Number(row.version), ...(iso(row.startedAt) ? { startedAt: iso(row.startedAt) } : {}), ...(iso(row.completedAt) ? { completedAt: iso(row.completedAt) } : {}),
    ...(row.lastError == null ? {} : { lastError: Object.freeze(parseJson<Record<string, unknown>>(row.lastError) ?? {}) }),
    createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)!,
  });
}
function step(row: Record<string, unknown>): MetaWorkflowStepRecord {
  return Object.freeze({
    id: String(row.id), workflowId: String(row.workflowId), stepKey: String(row.stepKey), ordinal: Number(row.ordinal),
    status: String(row.status) as MetaWorkflowStepRecord['status'], attempt: Number(row.attempt), version: Number(row.version),
    ...(row.input == null ? {} : { input: Object.freeze(parseJson<Record<string, unknown>>(row.input) ?? {}) }),
    ...(row.output == null ? {} : { output: Object.freeze(parseJson<Record<string, unknown>>(row.output) ?? {}) }),
    ...(row.beforeState == null ? {} : { beforeState: Object.freeze(parseJson<Record<string, unknown>>(row.beforeState) ?? {}) }),
    ...(row.afterState == null ? {} : { afterState: Object.freeze(parseJson<Record<string, unknown>>(row.afterState) ?? {}) }),
    ...(row.lastError == null ? {} : { lastError: Object.freeze(parseJson<Record<string, unknown>>(row.lastError) ?? {}) }),
    ...(iso(row.startedAt) ? { startedAt: iso(row.startedAt) } : {}), ...(iso(row.completedAt) ? { completedAt: iso(row.completedAt) } : {}),
    createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)!,
  });
}
function providerJob(row: Record<string, unknown>): MetaProviderJobRecord {
  return Object.freeze({
    id: String(row.id), workflowId: String(row.workflowId), stepId: String(row.stepId), purpose: String(row.purpose) as MetaProviderJobRecord['purpose'],
    capability: String(row.capability), operationType: String(row.operationType), requestFingerprint: String(row.requestFingerprint),
    ...(row.providerJobType == null ? {} : { providerJobType: String(row.providerJobType) }),
    ...(row.providerJobId == null ? {} : { providerJobId: String(row.providerJobId) }), ...(row.providerObjectId == null ? {} : { providerObjectId: String(row.providerObjectId) }),
    status: String(row.status) as MetaProviderJobRecord['status'],
    ...(row.requestState == null ? {} : { requestState: Object.freeze(parseJson<Record<string, unknown>>(row.requestState) ?? {}) }),
    ...(row.responseState == null ? {} : { responseState: Object.freeze(parseJson<Record<string, unknown>>(row.responseState) ?? {}) }),
    ...(row.beforeState == null ? {} : { beforeState: Object.freeze(parseJson<Record<string, unknown>>(row.beforeState) ?? {}) }),
    ...(row.afterState == null ? {} : { afterState: Object.freeze(parseJson<Record<string, unknown>>(row.afterState) ?? {}) }),
    ...(iso(row.unknownSince) ? { unknownSince: iso(row.unknownSince) } : {}), ...(iso(row.lastCheckedAt) ? { lastCheckedAt: iso(row.lastCheckedAt) } : {}),
    version: Number(row.version), createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)!,
  });
}
function reconciliation(row: Record<string, unknown>): MetaReconciliationRecord {
  return Object.freeze({
    id: String(row.id), operationId: String(row.operationId), workflowId: String(row.workflowId), stepId: String(row.stepId), providerJobId: String(row.providerJobId),
    capability: String(row.capability), operationType: String(row.operationType), resolverKey: String(row.resolverKey),
    status: String(row.status) as MetaReconciliationRecord['status'], attempts: Number(row.attempts), nextCheckAt: iso(row.nextCheckAt)!, expiresAt: iso(row.expiresAt)!,
    ...(row.evidence == null ? {} : { evidence: Object.freeze(parseJson<Record<string, unknown>>(row.evidence) ?? {}) }),
    ...(row.resolution == null ? {} : { resolution: Object.freeze(parseJson<Record<string, unknown>>(row.resolution) ?? {}) }),
    ...(row.lastError == null ? {} : { lastError: Object.freeze(parseJson<Record<string, unknown>>(row.lastError) ?? {}) }),
    version: Number(row.version), createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)!,
  });
}
function replay(row: Record<string, unknown>): MetaReplayRecord {
  return Object.freeze({
    id: String(row.id), sourceOperationId: String(row.sourceOperationId), ...(row.replayOperationId == null ? {} : { replayOperationId: String(row.replayOperationId) }),
    requestedBy: String(row.requestedBy), ...(row.approvedBy == null ? {} : { approvedBy: String(row.approvedBy) }),
    ...(row.approvalRole == null ? {} : { approvalRole: String(row.approvalRole) }),
    reason: String(row.reason), idempotencyKey: String(row.idempotencyKey), requestDigest: String(row.requestDigest), expiresAt: iso(row.expiresAt)!,
    ...(iso(row.approvedAt) ? { approvedAt: iso(row.approvedAt) } : {}),
    status: String(row.status) as MetaReplayRecord['status'],
    ...(row.rejectionCode == null ? {} : { rejectionCode: String(row.rejectionCode) }), createdAt: iso(row.createdAt)!, updatedAt: iso(row.updatedAt)!,
  });
}

function assertAdministrativeGuard(guard: Extract<MetaWorkflowMutationGuard, { readonly mode: 'ADMINISTRATIVE' }>): void {
  clean(guard.actorId, 'META_ADMINISTRATIVE_MUTATION_ACTOR_INVALID', 160);
  const reason = guard.reason.trim();
  if (reason.length < 10 || reason.length > 500) throw new TypeError('META_ADMINISTRATIVE_MUTATION_REASON_INVALID');
}

export class PrismaMetaWorkflowStore implements MetaWorkflowStore {
  constructor(private readonly client: MetaWorkflowSqlExecutor | MetaWorkflowPrismaClient = prisma as unknown as MetaWorkflowPrismaClient) {}

  private async transaction<T>(callback: (tx: MetaWorkflowSqlExecutor) => Promise<T>): Promise<T> {
    if ('$transaction' in this.client && typeof this.client.$transaction === 'function') return this.client.$transaction(callback);
    return callback(this.client);
  }

  async createWorkflow(input: CreateMetaWorkflowInput) {
    return this.transaction(async (tx) => {
      const existing = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaWorkflow" WHERE "operationId" = $1 FOR UPDATE`, input.operationId);
      if (existing[0]) {
        const current = workflow(existing[0]);
        if (current.definitionId !== input.definitionId.trim() || current.definitionVersion !== input.definitionVersion || current.priority !== input.priority || stable(current.context) !== stable(input.context ?? {})) {
          throw new TypeError('META_WORKFLOW_OPERATION_CONFLICT');
        }
        const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaWorkflowStep" WHERE "workflowId" = $1 ORDER BY "ordinal" ASC`, current.id);
        return { created: false, workflow: current, steps: Object.freeze(rows.map(step)) };
      }
      const keys = input.stepKeys.map((key) => clean(key, 'META_WORKFLOW_STEP_KEY_INVALID', 120));
      if (!keys.length || new Set(keys).size !== keys.length) throw new TypeError('META_WORKFLOW_STEPS_INVALID');
      safe(input.context ?? {});
      const id = randomUUID();
      const inserted = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
        `INSERT INTO "MetaWorkflow" ("id", "operationId", "definitionId", "definitionVersion", "status", "currentStepKey", "priority", "context", "version", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,'PENDING'::"MetaWorkflowStatus",$5,$6::"MetaOperationPriority",$7::jsonb,1,NOW(),NOW()) RETURNING *`,
        id, clean(input.operationId, 'META_WORKFLOW_OPERATION_ID_INVALID'), clean(input.definitionId, 'META_WORKFLOW_DEFINITION_ID_INVALID', 160), input.definitionVersion,
        keys[0], input.priority, json(input.context ?? {}),
      );
      for (let ordinal = 0; ordinal < keys.length; ordinal += 1) {
        await tx.$executeRawUnsafe(
          `INSERT INTO "MetaWorkflowStep" ("id", "workflowId", "stepKey", "ordinal", "status", "attempt", "version", "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,'PENDING'::"MetaWorkflowStepStatus",0,1,NOW(),NOW())`, randomUUID(), id, keys[ordinal], ordinal,
        );
      }
      const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaWorkflowStep" WHERE "workflowId" = $1 ORDER BY "ordinal" ASC`, id);
      return { created: true, workflow: workflow(inserted[0]), steps: Object.freeze(rows.map(step)) };
    });
  }

  async getWorkflow(workflowId: string) { const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaWorkflow" WHERE "id" = $1`, workflowId); return rows[0] ? workflow(rows[0]) : null; }
  async getWorkflowByOperation(operationId: string) { const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaWorkflow" WHERE "operationId" = $1`, operationId); return rows[0] ? workflow(rows[0]) : null; }
  async listWorkflowSteps(workflowId: string) { const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaWorkflowStep" WHERE "workflowId" = $1 ORDER BY "ordinal" ASC`, workflowId); return Object.freeze(rows.map(step)); }

  async updateWorkflow(input: Parameters<MetaWorkflowStore['updateWorkflow']>[0]) {
    const current = await this.getWorkflow(input.workflowId);
    if (!current) throw new Error('META_WORKFLOW_NOT_FOUND');
    if (input.status) assertMetaWorkflowStatusTransition(current.status, input.status);
    const sets: string[] = []; const values: unknown[] = [];
    const add = (sql: string, value: unknown) => { values.push(value); sets.push(sql.replace('?', `$${values.length + 2}`)); };
    if (input.status) add(`"status" = ?::"MetaWorkflowStatus"`, input.status);
    if (input.currentStepKey !== undefined) add(`"currentStepKey" = ?`, input.currentStepKey === null ? null : clean(input.currentStepKey, 'META_WORKFLOW_STEP_KEY_INVALID', 120));
    if (input.context) { safe(input.context); add(`"context" = ?::jsonb`, json(input.context)); }
    if (input.lastError !== undefined) { safe(input.lastError); add(`"lastError" = ?::jsonb`, json(input.lastError)); }
    if (input.markStarted) sets.push(`"startedAt" = COALESCE("startedAt", NOW())`);
    if (input.markCompleted) sets.push(`"completedAt" = NOW()`);
    return this.optimistic('MetaWorkflow', input.workflowId, input.expectedVersion, sets, values, workflow, input.guard);
  }

  async updateStep(input: Parameters<MetaWorkflowStore['updateStep']>[0]) {
    const currentRows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaWorkflowStep" WHERE "id" = $1`, input.stepId);
    if (!currentRows[0]) throw new Error('META_WORKFLOW_STEP_NOT_FOUND');
    const current = step(currentRows[0]);
    if (input.status) assertMetaWorkflowStepStatusTransition(current.status, input.status);
    const sets: string[] = []; const values: unknown[] = [];
    const add = (sql: string, value: unknown) => { values.push(value); sets.push(sql.replace('?', `$${values.length + 2}`)); };
    if (input.status) add(`"status" = ?::"MetaWorkflowStepStatus"`, input.status);
    for (const [field, value] of [['input', input.input], ['output', input.output], ['beforeState', input.beforeState], ['afterState', input.afterState], ['lastError', input.lastError]] as const) {
      if (value !== undefined) { safe(value); add(`"${field}" = ?::jsonb`, json(value)); }
    }
    if (input.incrementAttempt) sets.push(`"attempt" = "attempt" + 1`);
    if (input.markStarted) sets.push(`"startedAt" = COALESCE("startedAt", NOW())`);
    if (input.markCompleted) sets.push(`"completedAt" = NOW()`);
    return this.optimistic('MetaWorkflowStep', input.stepId, input.expectedVersion, sets, values, step, input.guard);
  }

  async prepareProviderCommand(input: Parameters<MetaWorkflowStore['prepareProviderCommand']>[0]) {
    return this.transaction(async (tx) => {
      const scoped = new PrismaMetaWorkflowStore(tx);
      const job = await scoped.createProviderJob({ ...input.job, guard: input.guard });
      const reconciliation = await scoped.createReconciliation({
        ...input.reconciliation, providerJobId: job.id, guard: input.guard,
      });
      return Object.freeze({ job, reconciliation });
    });
  }

  async createProviderJob(input: Parameters<MetaWorkflowStore['createProviderJob']>[0]) {
    for (const item of [input.requestState, input.responseState, input.beforeState, input.afterState]) safe(item);
    const capability = clean(input.capability, 'META_PROVIDER_JOB_CAPABILITY_INVALID', 120);
    const operationType = clean(input.operationType, 'META_PROVIDER_JOB_OPERATION_TYPE_INVALID', 160);
    const requestFingerprint = clean(input.requestFingerprint, 'META_PROVIDER_JOB_FINGERPRINT_INVALID', 128);
    const fence = this.guardFence(input.guard);
    const values: unknown[] = [
      randomUUID(), input.workflowId, input.stepId, input.purpose, capability, operationType, requestFingerprint,
      input.providerJobType ?? null, input.providerJobId ?? null, input.providerObjectId ?? null,
      input.status, json(input.requestState), json(input.responseState), json(input.beforeState), json(input.afterState),
      input.status === 'UNKNOWN' ? (input.unknownSince ?? new Date()) : null,
    ];
    let select = `SELECT $1,$2,$3,$4::"MetaProviderJobPurpose",$5,$6,$7,$8,$9,$10,$11::"MetaProviderJobStatus",$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16,1,NOW(),NOW()`;
    if (fence) {
      values.push(fence.scopeKey, fence.fencingToken);
      select += ` WHERE EXISTS (SELECT 1 FROM "MetaWorkflowLock" WHERE "scopeKey" = $17 AND "fencingToken" = $18::bigint AND "expiresAt" > NOW())`;
    }
    const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(
      `INSERT INTO "MetaProviderJob" ("id","workflowId","stepId","purpose","capability","operationType","requestFingerprint","providerJobType","providerJobId","providerObjectId","status","requestState","responseState","beforeState","afterState","unknownSince","version","createdAt","updatedAt")
       ${select}
       ON CONFLICT ("stepId", "purpose", "requestFingerprint") DO NOTHING RETURNING *`,
      ...values,
    );
    if (rows[0]) return providerJob(rows[0]);
    const existingRows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "MetaProviderJob" WHERE "stepId" = $1 AND "purpose" = $2::"MetaProviderJobPurpose" AND "requestFingerprint" = $3 LIMIT 1`, input.stepId, input.purpose, requestFingerprint,
    );
    if (existingRows[0]) {
      const existing = providerJob(existingRows[0]);
      const matches = existing.workflowId === input.workflowId && existing.purpose === input.purpose
        && existing.capability === capability && existing.operationType === operationType
        && (existing.providerJobType ?? null) === (input.providerJobType ?? null)
        && stable(existing.requestState) === stable(input.requestState) && stable(existing.beforeState) === stable(input.beforeState);
      if (!matches) throw new TypeError('META_PROVIDER_JOB_IDEMPOTENCY_CONFLICT');
      return existing;
    }
    if (fence) await this.assertFencingToken(fence.scopeKey, fence.fencingToken);
    throw new Error('META_PROVIDER_JOB_CREATE_FAILED');
  }

  async getProviderJob(providerJobId: string) { const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaProviderJob" WHERE "id" = $1`, providerJobId); return rows[0] ? providerJob(rows[0]) : null; }
  async listProviderJobs(workflowId: string) { const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaProviderJob" WHERE "workflowId" = $1 ORDER BY "createdAt" ASC`, workflowId); return Object.freeze(rows.map(providerJob)); }

  async updateProviderJob(input: Parameters<MetaWorkflowStore['updateProviderJob']>[0]) {
    const current = await this.getProviderJob(input.providerJobId);
    if (!current) throw new Error('META_PROVIDER_JOB_NOT_FOUND');
    if (input.status) assertMetaProviderJobStatusTransition(current.status, input.status);
    const sets: string[] = []; const values: unknown[] = []; const add = (sql: string, value: unknown) => { values.push(value); sets.push(sql.replace('?', `$${values.length + 2}`)); };
    if (input.status) add(`"status" = ?::"MetaProviderJobStatus"`, input.status);
    if (input.providerJobIdValue !== undefined) add(`"providerJobId" = ?`, input.providerJobIdValue);
    if (input.providerObjectId !== undefined) add(`"providerObjectId" = ?`, input.providerObjectId);
    if (input.responseState !== undefined) { safe(input.responseState); add(`"responseState" = ?::jsonb`, json(input.responseState)); }
    if (input.afterState !== undefined) { safe(input.afterState); add(`"afterState" = ?::jsonb`, json(input.afterState)); }
    if (input.unknownSince !== undefined) add(`"unknownSince" = ?`, input.unknownSince);
    if (input.lastCheckedAt) add(`"lastCheckedAt" = ?`, input.lastCheckedAt);
    return this.optimistic('MetaProviderJob', input.providerJobId, input.expectedVersion, sets, values, providerJob, input.guard);
  }

  async createReconciliation(input: Parameters<MetaWorkflowStore['createReconciliation']>[0]) {
    const capability = clean(input.capability, 'META_RECONCILIATION_CAPABILITY_INVALID', 120);
    const operationType = clean(input.operationType, 'META_RECONCILIATION_OPERATION_TYPE_INVALID', 160);
    const resolverKey = clean(input.resolverKey, 'META_RECONCILIATION_RESOLVER_INVALID', 200);
    const fence = this.guardFence(input.guard);
    const values: unknown[] = [randomUUID(), input.operationId, input.workflowId, input.stepId, input.providerJobId, capability, operationType, resolverKey, input.nextCheckAt ?? new Date(), input.expiresAt];
    let select = `SELECT $1,$2,$3,$4,$5,$6,$7,$8,'PENDING'::"MetaReconciliationStatus",0,$9,$10,1,NOW(),NOW()`;
    if (fence) {
      values.push(fence.scopeKey, fence.fencingToken);
      select += ` WHERE EXISTS (SELECT 1 FROM "MetaWorkflowLock" WHERE "scopeKey" = $11 AND "fencingToken" = $12::bigint AND "expiresAt" > NOW())`;
    }
    const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(
      `INSERT INTO "MetaReconciliation" ("id","operationId","workflowId","stepId","providerJobId","capability","operationType","resolverKey","status","attempts","nextCheckAt","expiresAt","version","createdAt","updatedAt")
       ${select}
       ON CONFLICT ("providerJobId") DO NOTHING RETURNING *`, ...values,
    );
    if (rows[0]) return reconciliation(rows[0]);
    const existingRows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaReconciliation" WHERE "providerJobId" = $1 LIMIT 1`, input.providerJobId);
    if (existingRows[0]) {
      const existing = reconciliation(existingRows[0]);
      const matches = existing.operationId === input.operationId && existing.workflowId === input.workflowId && existing.stepId === input.stepId
        && existing.capability === capability && existing.operationType === operationType && existing.resolverKey === resolverKey
        && existing.expiresAt === input.expiresAt.toISOString();
      if (!matches) throw new TypeError('META_RECONCILIATION_IDEMPOTENCY_CONFLICT');
      return existing;
    }
    if (fence) await this.assertFencingToken(fence.scopeKey, fence.fencingToken);
    throw new Error('META_RECONCILIATION_CREATE_FAILED');
  }

  async getReconciliation(id: string) { const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaReconciliation" WHERE "id" = $1`, id); return rows[0] ? reconciliation(rows[0]) : null; }
  async listReconciliations(workflowId: string) { const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaReconciliation" WHERE "workflowId" = $1 ORDER BY "createdAt" ASC`, workflowId); return Object.freeze(rows.map(reconciliation)); }
  async listDueReconciliations(input: { readonly now?: Date; readonly limit?: number } = {}) {
    const limit = Math.min(500, Math.max(1, input.limit ?? 50));
    const rows = input.now
      ? await this.client.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT * FROM "MetaReconciliation" WHERE "status" IN ('PENDING'::"MetaReconciliationStatus", 'RUNNING'::"MetaReconciliationStatus") AND "nextCheckAt" <= $1 ORDER BY "nextCheckAt" ASC LIMIT $2`, input.now, limit,
      )
      : await this.client.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT * FROM "MetaReconciliation" WHERE "status" IN ('PENDING'::"MetaReconciliationStatus", 'RUNNING'::"MetaReconciliationStatus") AND "nextCheckAt" <= NOW() ORDER BY "nextCheckAt" ASC LIMIT $1`, limit,
      );
    return Object.freeze(rows.map(reconciliation));
  }

  async updateReconciliation(input: Parameters<MetaWorkflowStore['updateReconciliation']>[0]) {
    const current = await this.getReconciliation(input.reconciliationId);
    if (!current) throw new Error('META_RECONCILIATION_NOT_FOUND');
    if (input.status) assertMetaReconciliationStatusTransition(current.status, input.status);
    const sets: string[] = []; const values: unknown[] = []; const add = (sql: string, value: unknown) => { values.push(value); sets.push(sql.replace('?', `$${values.length + 2}`)); };
    if (input.status) add(`"status" = ?::"MetaReconciliationStatus"`, input.status);
    if (input.nextCheckAt) add(`"nextCheckAt" = ?`, input.nextCheckAt);
    for (const [field, value] of [['evidence', input.evidence], ['resolution', input.resolution], ['lastError', input.lastError]] as const) {
      if (value !== undefined) { safe(value); add(`"${field}" = ?::jsonb`, json(value)); }
    }
    if (input.incrementAttempts) sets.push(`"attempts" = "attempts" + 1`);
    return this.optimistic('MetaReconciliation', input.reconciliationId, input.expectedVersion, sets, values, reconciliation, input.guard);
  }

  async commitProviderOutcome(input: CommitMetaWorkflowProviderOutcomeInput) {
    return this.transaction(async (tx) => {
      const scoped = new PrismaMetaWorkflowStore(tx);
      const providerJobResult = await scoped.updateProviderJob({
        providerJobId: input.providerJob.id, expectedVersion: input.providerJob.expectedVersion, guard: input.guard,
        status: input.providerJob.status, providerJobIdValue: input.providerJob.providerJobId,
        providerObjectId: input.providerJob.providerObjectId, responseState: input.providerJob.responseState,
        afterState: input.providerJob.afterState, unknownSince: input.providerJob.unknownSince,
        lastCheckedAt: input.providerJob.lastCheckedAt,
      });
      const stepResult = await scoped.updateStep({
        stepId: input.step.id, expectedVersion: input.step.expectedVersion, guard: input.guard, status: input.step.status,
        output: input.step.output, beforeState: input.step.beforeState, afterState: input.step.afterState,
        lastError: input.step.lastError, markCompleted: input.step.markCompleted,
      });
      const reconciliationResult = await scoped.updateReconciliation({
        reconciliationId: input.reconciliation.id, expectedVersion: input.reconciliation.expectedVersion, guard: input.guard,
        status: input.reconciliation.status, nextCheckAt: input.reconciliation.nextCheckAt, evidence: input.reconciliation.evidence,
        resolution: input.reconciliation.resolution, lastError: input.reconciliation.lastError,
      });
      const workflowResult = await scoped.updateWorkflow({
        workflowId: input.workflow.id, expectedVersion: input.workflow.expectedVersion, guard: input.guard, status: input.workflow.status,
        currentStepKey: input.workflow.currentStepKey, lastError: input.workflow.lastError, markCompleted: input.workflow.markCompleted,
      });
      return Object.freeze({ workflow: workflowResult, step: stepResult, providerJob: providerJobResult, reconciliation: reconciliationResult });
    });
  }

  async createReplay(input: Parameters<MetaWorkflowStore['createReplay']>[0]) {
    const normalized = {
      sourceOperationId: clean(input.sourceOperationId, 'META_REPLAY_SOURCE_OPERATION_INVALID'),
      requestedBy: clean(input.requestedBy, 'META_REPLAY_REQUESTER_INVALID', 160),
      reason: input.reason.trim(),
      idempotencyKey: clean(input.idempotencyKey, 'META_REPLAY_IDEMPOTENCY_KEY_INVALID', 200),
      requestDigest: clean(input.requestDigest, 'META_REPLAY_REQUEST_DIGEST_INVALID', 128),
      expiresAt: input.expiresAt,
    };
    if (normalized.reason.length < 10 || normalized.reason.length > 1_000) throw new TypeError('META_REPLAY_REASON_INVALID');
    const assertMatch = (existing: MetaReplayRecord) => {
      if (existing.sourceOperationId !== normalized.sourceOperationId || existing.requestedBy !== normalized.requestedBy
        || existing.reason !== normalized.reason || existing.requestDigest !== normalized.requestDigest
        || existing.expiresAt !== normalized.expiresAt.toISOString()) throw new TypeError('META_REPLAY_IDEMPOTENCY_CONFLICT');
      return existing;
    };
    const existing = await this.getReplayByIdempotencyKey(normalized.idempotencyKey);
    if (existing) return assertMatch(existing);
    const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(
      `INSERT INTO "MetaReplay" ("id","sourceOperationId","requestedBy","reason","idempotencyKey","requestDigest","expiresAt","status","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,'REQUESTED'::"MetaReplayStatus",NOW(),NOW())
       ON CONFLICT ("idempotencyKey") DO NOTHING RETURNING *`,
      randomUUID(), normalized.sourceOperationId, normalized.requestedBy, normalized.reason, normalized.idempotencyKey, normalized.requestDigest, normalized.expiresAt,
    );
    return rows[0] ? replay(rows[0]) : assertMatch((await this.getReplayByIdempotencyKey(normalized.idempotencyKey))!);
  }

  async approveReplay(input: Parameters<MetaWorkflowStore['approveReplay']>[0]) {
    const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE "MetaReplay" SET "approvedBy" = $2, "approvalRole" = $3, "approvedAt" = $4,
       "status" = 'APPROVED'::"MetaReplayStatus", "updatedAt" = NOW()
       WHERE "id" = $1 AND "status" = 'REQUESTED'::"MetaReplayStatus" AND "requestedBy" <> $2 AND "expiresAt" > NOW()
       RETURNING *`, input.replayId, clean(input.approvedBy, 'META_REPLAY_APPROVER_INVALID', 160), clean(input.approvalRole, 'META_REPLAY_APPROVAL_ROLE_INVALID', 120), input.approvedAt,
    );
    if (rows[0]) return replay(rows[0]);
    const currentRows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaReplay" WHERE "id" = $1`, input.replayId);
    if (!currentRows[0]) throw new Error('META_REPLAY_NOT_FOUND');
    const current = replay(currentRows[0]);
    const approvedBy = input.approvedBy.trim();
    const approvalRole = input.approvalRole.trim();
    if (current.status === 'APPROVED') {
      if (current.approvedBy !== approvedBy || current.approvalRole !== approvalRole) throw new TypeError('META_REPLAY_APPROVAL_CONFLICT');
      return current;
    }
    if (current.requestedBy === approvedBy) throw new TypeError('META_REPLAY_TWO_PERSON_APPROVAL_REQUIRED');
    throw new TypeError('META_REPLAY_NOT_APPROVABLE');
  }

  async completeReplay(input: Parameters<MetaWorkflowStore['completeReplay']>[0]) {
    const hasOperation = Boolean(input.replayOperationId);
    const hasRejection = Boolean(input.rejectionCode);
    if (hasOperation === hasRejection) throw new TypeError('META_REPLAY_COMPLETION_INVALID');
    const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE "MetaReplay" SET "replayOperationId" = $2, "rejectionCode" = $3,
       "status" = CASE WHEN $2::text IS NOT NULL THEN 'CREATED'::"MetaReplayStatus" ELSE 'REJECTED'::"MetaReplayStatus" END, "updatedAt" = NOW()
       WHERE "id" = $1 AND (("status" = 'APPROVED'::"MetaReplayStatus" AND $2::text IS NOT NULL) OR ("status" IN ('REQUESTED'::"MetaReplayStatus", 'APPROVED'::"MetaReplayStatus") AND $2::text IS NULL))
       RETURNING *`, input.replayId, input.replayOperationId ?? null, input.rejectionCode ?? null,
    );
    if (rows[0]) return replay(rows[0]);
    const current = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaReplay" WHERE "id" = $1`, input.replayId);
    if (!current[0]) throw new Error('META_REPLAY_NOT_FOUND');
    const existing = replay(current[0]);
    if (existing.status === 'CREATED' && existing.replayOperationId === input.replayOperationId) return existing;
    if (existing.status === 'REJECTED' && existing.rejectionCode === input.rejectionCode) return existing;
    throw new TypeError('META_REPLAY_COMPLETION_CONFLICT');
  }

  async getReplayByIdempotencyKey(key: string) { const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaReplay" WHERE "idempotencyKey" = $1`, key.trim()); return rows[0] ? replay(rows[0]) : null; }
  async listReplays(sourceOperationId: string) { const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM "MetaReplay" WHERE "sourceOperationId" = $1 ORDER BY "createdAt" ASC`, sourceOperationId); return Object.freeze(rows.map(replay)); }

  async assertFencingToken(scopeKey: string, fencingToken: number) {
    const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT "fencingToken" FROM "MetaWorkflowLock" WHERE "scopeKey" = $1 AND "expiresAt" > NOW()`, scopeKey);
    const current = rows[0] ? Number(rows[0].fencingToken) : 0;
    if (!rows[0] || current !== fencingToken) throw new MetaFencingTokenRejectedError({ scopeKey, suppliedToken: fencingToken, currentToken: current });
  }
  async observeFencingToken(scopeKey: string, fencingToken: number) { await this.assertFencingToken(scopeKey, fencingToken); }

  private guardFence(guard: MetaWorkflowMutationGuard): { readonly scopeKey: string; readonly fencingToken: number } | undefined {
    if (guard.mode === 'ADMINISTRATIVE') {
      assertAdministrativeGuard(guard);
      return undefined;
    }
    if (!Number.isSafeInteger(guard.fencingToken) || guard.fencingToken < 1) throw new TypeError('META_FENCING_SCOPE_TOKEN_REQUIRED');
    return { scopeKey: clean(guard.scopeKey, 'META_FENCING_SCOPE_INVALID', 255), fencingToken: guard.fencingToken };
  }

  private async optimistic<T>(
    table: string,
    id: string,
    expectedVersion: number,
    sets: string[],
    values: unknown[],
    hydrate: (row: Record<string, unknown>) => T,
    guard: MetaWorkflowMutationGuard,
  ): Promise<T> {
    if (!sets.length) throw new TypeError('META_OPTIMISTIC_UPDATE_EMPTY');
    const fence = this.guardFence(guard);
    const parameters: unknown[] = [id, expectedVersion, ...values];
    let where = `"id" = $1 AND "version" = $2`;
    if (fence) {
      parameters.push(fence.scopeKey, fence.fencingToken);
      const scopeParameter = values.length + 3;
      const tokenParameter = values.length + 4;
      where += ` AND EXISTS (SELECT 1 FROM "MetaWorkflowLock" WHERE "scopeKey" = $${scopeParameter} AND "fencingToken" = $${tokenParameter}::bigint AND "expiresAt" > NOW())`;
    }
    const rows = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE "${table}" SET ${sets.join(', ')}, "version" = "version" + 1, "updatedAt" = NOW() WHERE ${where} RETURNING *`, ...parameters,
    );
    if (rows[0]) return hydrate(rows[0]);
    if (fence) await this.assertFencingToken(fence.scopeKey, fence.fencingToken);
    const current = await this.client.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT "version" FROM "${table}" WHERE "id" = $1`, id);
    if (!current[0]) throw new Error(`META_${table.toUpperCase()}_NOT_FOUND`);
    throw new MetaOptimisticConcurrencyError({ entity: table, id, expectedVersion, actualVersion: Number(current[0].version) });
  }
}

export function createPrismaMetaWorkflowStore(): PrismaMetaWorkflowStore {
  return new PrismaMetaWorkflowStore();
}
