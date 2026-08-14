import { randomUUID } from 'node:crypto';
import { assertMetaVersionedPayload, digestMetaVersionedPayload } from './payload';
import { assertMetaOperationTransition, isMetaOperationTerminal } from './transitions';
import { assertMetaOperationIdempotencyMatch, type MetaOperationStore, type MetaOperationTransactionContext } from './store';
import { normalizeMetaOperationExpiry } from '../reliability/deadline';
import { META_OPERATION_PRIORITIES, type MetaOperationPriority } from '../reliability/types';
import type {
  CreateMetaOperationInput,
  MetaClaimedOutboxBatch,
  MetaCommittedOperation,
  MetaOperationEventRecord,
  MetaOperationExecutionClaim,
  MetaOperationRecord,
  MetaOutboxMessageRecord,
} from './types';

type Mutable<T> = { -readonly [P in keyof T]: T[P] };
type MutableOperation = Mutable<MetaOperationRecord>;
type MutableOutbox = Mutable<MetaOutboxMessageRecord>;

const PRIORITY_RANK: Readonly<Record<MetaOperationPriority, number>> = Object.freeze({ P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 });

function normalizePriority(value: MetaOperationPriority | undefined): MetaOperationPriority {
  const priority = value ?? 'P2';
  if (!META_OPERATION_PRIORITIES.includes(priority)) throw new TypeError('META_OPERATION_PRIORITY_INVALID');
  return priority;
}

const clone = <T>(value: T): T => structuredClone(value);
const freezeRecord = <T extends object>(value: T): Readonly<T> => Object.freeze(clone(value));

function cleanIdentifier(value: string, code: string, max = 160): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new TypeError(code);
  return normalized;
}

export class InMemoryMetaOperationStore implements MetaOperationStore {
  private readonly operations = new Map<string, MutableOperation>();
  private readonly outbox = new Map<string, MutableOutbox>();
  private readonly events = new Map<string, MetaOperationEventRecord[]>();
  private readonly idempotency = new Map<string, string>();
  private businessState: Record<string, unknown>;

  constructor(initialBusinessState: Record<string, unknown> = {}) {
    this.businessState = clone(initialBusinessState);
  }

  snapshotBusinessState(): Readonly<Record<string, unknown>> {
    return freezeRecord(this.businessState);
  }

  private idempotencyScope(input: Pick<CreateMetaOperationInput, 'environment' | 'connectionKey' | 'idempotencyKey'>): string {
    return `${input.environment}:${input.connectionKey}:${input.idempotencyKey}`;
  }

  private appendEvent(input: Omit<MetaOperationEventRecord, 'id' | 'sequence' | 'createdAt'> & { createdAt?: string }): MetaOperationEventRecord {
    const current = this.events.get(input.operationId) ?? [];
    const event = freezeRecord({
      id: randomUUID(),
      operationId: input.operationId,
      sequence: current.length + 1,
      eventType: input.eventType,
      ...(input.fromStatus ? { fromStatus: input.fromStatus } : {}),
      ...(input.toStatus ? { toStatus: input.toStatus } : {}),
      attempt: input.attempt,
      ...(input.safeDetails ? { safeDetails: clone(input.safeDetails) } : {}),
      createdAt: input.createdAt ?? new Date().toISOString(),
    }) as MetaOperationEventRecord;
    current.push(event);
    this.events.set(input.operationId, current);
    return event;
  }

  private transition(operation: MutableOperation, toStatus: MutableOperation['status'], eventType: MetaOperationEventRecord['eventType'], safeDetails?: Readonly<Record<string, unknown>>): void {
    const fromStatus = operation.status;
    assertMetaOperationTransition(fromStatus, toStatus);
    operation.status = toStatus;
    operation.updatedAt = new Date().toISOString();
    this.appendEvent({ operationId: operation.id, eventType, fromStatus, toStatus, attempt: operation.attempts, safeDetails });
  }

  async commitWithOperation<TBusinessResult>(
    input: CreateMetaOperationInput,
    businessMutation?: (tx: MetaOperationTransactionContext) => Promise<TBusinessResult>,
  ): Promise<MetaCommittedOperation<TBusinessResult>> {
    assertMetaVersionedPayload(input.payload);
    const connectionKey = cleanIdentifier(input.connectionKey, 'META_OPERATION_CONNECTION_KEY_INVALID', 80);
    const idempotencyKey = cleanIdentifier(input.idempotencyKey, 'META_OPERATION_IDEMPOTENCY_KEY_INVALID', 200);
    const capability = cleanIdentifier(input.capability, 'META_OPERATION_CAPABILITY_INVALID', 120);
    const operationType = cleanIdentifier(input.operationType, 'META_OPERATION_TYPE_INVALID', 160);
    const assetId = input.assetId ? cleanIdentifier(input.assetId, 'META_OPERATION_ASSET_ID_INVALID', 255) : undefined;
    const replayOfOperationId = input.replayOfOperationId ? cleanIdentifier(input.replayOfOperationId, 'META_OPERATION_REPLAY_LINK_INVALID', 255) : undefined;
    const payloadDigest = digestMetaVersionedPayload(input.payload);
    const priority = normalizePriority(input.priority);
    const expiresAt = normalizeMetaOperationExpiry(input.expiresAt);
    const normalizedInput = {
      ...input,
      priority,
      connectionKey,
      idempotencyKey,
      capability,
      operationType,
      ...(input.expiresAt !== undefined ? { expiresAt } : {}),
      ...(assetId ? { assetId } : {}),
      ...(replayOfOperationId ? { replayOfOperationId } : {}),
    };
    const scope = this.idempotencyScope(normalizedInput);
    const existingId = this.idempotency.get(scope);
    if (existingId) {
      const operation = this.operations.get(existingId);
      const outbox = [...this.outbox.values()].find((message) => message.operationId === existingId);
      if (!operation || !outbox) throw new Error('META_OPERATION_IDEMPOTENCY_LOOKUP_FAILED');
      assertMetaOperationIdempotencyMatch(freezeRecord(operation), normalizedInput, payloadDigest);
      this.appendEvent({ operationId: operation.id, eventType: 'DUPLICATE_IGNORED', attempt: operation.attempts, safeDetails: { idempotencyKey } });
      return { created: false, operation: freezeRecord(operation), outbox: freezeRecord(outbox) };
    }

    const now = new Date().toISOString();
    const payload = clone(input.payload);
    const operation: MutableOperation = {
      id: randomUUID(),
      environment: input.environment,
      connectionKey,
      idempotencyKey,
      capability,
      operationType,
      ...(input.credentialRole ? { credentialRole: input.credentialRole } : {}),
      correlationId: input.invocation.correlationId,
      actorType: input.invocation.actor.type,
      ...(input.invocation.actor.reference ? { actorReference: input.invocation.actor.reference } : {}),
      ...(input.assetType ? { assetType: input.assetType } : {}),
      ...(assetId ? { assetId } : {}),
      payload,
      payloadDigest,
      status: 'ACCEPTED',
      priority,
      attempts: 0,
      expiresAt: expiresAt.toISOString(),
      ...(replayOfOperationId ? { replayOfOperationId } : {}),
      createdAt: now,
      updatedAt: now,
    };
    const message: MutableOutbox = {
      id: randomUUID(),
      operationId: operation.id,
      topic: cleanIdentifier(input.topic ?? 'meta.operation.execute', 'META_OUTBOX_TOPIC_INVALID', 160),
      partitionKey: cleanIdentifier(input.partitionKey ?? assetId ?? connectionKey, 'META_OUTBOX_PARTITION_KEY_INVALID', 255),
      payload,
      payloadDigest,
      state: 'PENDING',
      priority,
      attempts: 0,
      maxAttempts: Math.max(1, Math.min(input.maxDispatchAttempts ?? 10, 100)),
      availableAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const draft = clone(this.businessState);
    let businessResult: TBusinessResult | undefined;
    if (businessMutation) {
      businessResult = await businessMutation({ implementation: 'IN_MEMORY', raw: draft });
    }

    this.operations.set(operation.id, operation);
    this.outbox.set(message.id, message);
    this.idempotency.set(scope, operation.id);
    this.businessState = draft;
    this.appendEvent({ operationId: operation.id, eventType: 'OPERATION_ACCEPTED', toStatus: 'ACCEPTED', attempt: 0, safeDetails: { payloadDigest } });
    this.appendEvent({ operationId: operation.id, eventType: 'OUTBOX_CREATED', fromStatus: 'ACCEPTED', toStatus: 'ACCEPTED', attempt: 0, safeDetails: { messageId: message.id, topic: message.topic } });
    return {
      created: true,
      operation: freezeRecord(operation),
      outbox: freezeRecord(message),
      ...(businessMutation ? { businessResult } : {}),
    };
  }

  async getOperation(operationId: string): Promise<MetaOperationRecord | null> {
    const operation = this.operations.get(operationId);
    return operation ? freezeRecord(operation) : null;
  }

  async getOutboxMessage(messageId: string): Promise<MetaOutboxMessageRecord | null> {
    const message = this.outbox.get(messageId);
    return message ? freezeRecord(message) : null;
  }

  async listOperationEvents(operationId: string): Promise<readonly MetaOperationEventRecord[]> {
    return Object.freeze(clone(this.events.get(operationId) ?? []));
  }

  async claimDueOutbox(input: { readonly limit?: number; readonly leaseMs?: number; readonly workerId?: string; readonly now?: Date } = {}): Promise<MetaClaimedOutboxBatch> {
    const now = input.now ?? new Date();
    const leaseMs = Math.max(1_000, input.leaseMs ?? 60_000);
    const limit = Math.max(1, Math.min(input.limit ?? 25, 100));
    const leaseToken = `${input.workerId?.trim() || 'dispatcher'}:${randomUUID()}`;
    const due = [...this.outbox.values()]
      .filter((message) => ['PENDING', 'RETRY_SCHEDULED', 'CLAIMED'].includes(message.state))
      .filter((message) => new Date(message.availableAt).getTime() <= now.getTime())
      .filter((message) => !message.leaseExpiresAt || new Date(message.leaseExpiresAt).getTime() <= now.getTime())
      .filter((message) => {
        const operation = this.operations.get(message.operationId);
        if (!operation) throw new Error('META_OUTBOX_OPERATION_MISSING');
        if (new Date(operation.expiresAt).getTime() > now.getTime()) return true;
        message.state = 'DEAD_LETTER';
        message.lastError = freezeRecord({ code: 'META_OPERATION_DEADLINE_EXPIRED', message: 'The Meta operation expired before dispatch.', retryable: false, category: 'TIMEOUT' });
        message.updatedAt = now.toISOString();
        if (!isMetaOperationTerminal(operation.status)) {
          operation.lastError = message.lastError;
          operation.completedAt = now.toISOString();
          this.transition(operation, 'PERMANENT_FAILURE', 'OPERATION_EXPIRED', { expiresAt: operation.expiresAt });
        }
        return false;
      })
      .sort((left, right) => PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority] || left.availableAt.localeCompare(right.availableAt) || left.createdAt.localeCompare(right.createdAt))
      .slice(0, limit);

    for (const message of due) {
      message.state = 'CLAIMED';
      message.leaseToken = leaseToken;
      message.leaseExpiresAt = new Date(now.getTime() + leaseMs).toISOString();
      message.updatedAt = now.toISOString();
      const operation = this.operations.get(message.operationId);
      if (!operation) throw new Error('META_OUTBOX_OPERATION_MISSING');
      operation.nextAttemptAt = undefined;
      if (operation.status === 'ACCEPTED' || operation.status === 'RETRYABLE_FAILURE') this.transition(operation, 'DISPATCHING', 'OUTBOX_CLAIMED', { messageId: message.id, leaseMs });
      else this.appendEvent({ operationId: operation.id, eventType: 'OUTBOX_CLAIMED', fromStatus: operation.status, toStatus: operation.status, attempt: operation.attempts, safeDetails: { messageId: message.id, leaseMs } });
    }
    return Object.freeze({ leaseToken, messages: Object.freeze(due.map((message) => freezeRecord(message))) });
  }

  async markOutboxPublished(input: { readonly messageId: string; readonly leaseToken: string; readonly publishedAt?: Date; readonly safeDetails?: Readonly<Record<string, unknown>> }): Promise<MetaOutboxMessageRecord | null> {
    const message = this.outbox.get(input.messageId);
    if (!message || message.state !== 'CLAIMED' || message.leaseToken !== input.leaseToken) return null;
    const publishedAt = (input.publishedAt ?? new Date()).toISOString();
    message.state = 'PUBLISHED';
    message.publishedAt = publishedAt;
    message.leaseToken = undefined;
    message.leaseExpiresAt = undefined;
    message.lastError = undefined;
    message.updatedAt = publishedAt;
    const operation = this.operations.get(message.operationId);
    if (!operation) throw new Error('META_OUTBOX_OPERATION_MISSING');
    if (operation.status === 'DISPATCHING') this.transition(operation, 'QUEUED', 'OUTBOX_PUBLISHED', input.safeDetails);
    else this.appendEvent({ operationId: operation.id, eventType: 'OUTBOX_PUBLISHED', fromStatus: operation.status, toStatus: operation.status, attempt: operation.attempts, safeDetails: input.safeDetails });
    return freezeRecord(message);
  }

  async releaseOutbox(input: { readonly messageId: string; readonly leaseToken: string; readonly error: import('./types').MetaOperationSafeError; readonly availableAt: Date }): Promise<MetaOutboxMessageRecord | null> {
    const message = this.outbox.get(input.messageId);
    if (!message || message.state !== 'CLAIMED' || message.leaseToken !== input.leaseToken) return null;
    message.attempts += 1;
    message.lastError = freezeRecord(input.error);
    message.leaseToken = undefined;
    message.leaseExpiresAt = undefined;
    message.availableAt = input.availableAt.toISOString();
    message.state = !input.error.retryable || message.attempts >= message.maxAttempts ? 'DEAD_LETTER' : 'RETRY_SCHEDULED';
    message.updatedAt = new Date().toISOString();
    const operation = this.operations.get(message.operationId);
    if (!operation) throw new Error('META_OUTBOX_OPERATION_MISSING');
    if (message.state === 'DEAD_LETTER') {
      if (!isMetaOperationTerminal(operation.status)) this.transition(operation, 'PERMANENT_FAILURE', 'OUTBOX_RELEASED', { code: input.error.code, deadLetter: true });
    } else if (operation.status === 'DISPATCHING') {
      this.transition(operation, 'ACCEPTED', 'OUTBOX_RELEASED', { code: input.error.code, availableAt: message.availableAt });
    } else {
      this.appendEvent({ operationId: operation.id, eventType: 'OUTBOX_RELEASED', fromStatus: operation.status, toStatus: operation.status, attempt: operation.attempts, safeDetails: { code: input.error.code, availableAt: message.availableAt } });
    }
    return freezeRecord(message);
  }

  async quarantineOutbox(input: { readonly messageId: string; readonly leaseToken?: string; readonly reason: string; readonly error?: import('./types').MetaOperationSafeError }): Promise<MetaOutboxMessageRecord | null> {
    const message = this.outbox.get(input.messageId);
    if (!message || (input.leaseToken && message.leaseToken !== input.leaseToken)) return null;
    message.state = 'QUARANTINED';
    message.quarantineReason = cleanIdentifier(input.reason, 'META_OUTBOX_QUARANTINE_REASON_INVALID', 500);
    message.lastError = input.error ? freezeRecord(input.error) : undefined;
    message.leaseToken = undefined;
    message.leaseExpiresAt = undefined;
    message.updatedAt = new Date().toISOString();
    const operation = this.operations.get(message.operationId);
    if (!operation) throw new Error('META_OUTBOX_OPERATION_MISSING');
    if (!isMetaOperationTerminal(operation.status)) this.transition(operation, 'QUARANTINED', 'PAYLOAD_QUARANTINED', { reason: message.quarantineReason, code: input.error?.code });
    return freezeRecord(message);
  }

  async beginExecution(input: { readonly operationId: string; readonly workerId?: string; readonly leaseMs?: number; readonly now?: Date }): Promise<MetaOperationExecutionClaim> {
    const operation = this.operations.get(input.operationId);
    if (!operation) throw new Error('META_OPERATION_NOT_FOUND');
    const now = input.now ?? new Date();
    if (new Date(operation.expiresAt).getTime() <= now.getTime() && !isMetaOperationTerminal(operation.status)) {
      operation.lastError = freezeRecord({ code: 'META_OPERATION_DEADLINE_EXPIRED', message: 'The Meta operation expired before execution.', retryable: false, category: 'TIMEOUT' });
      operation.completedAt = now.toISOString();
      this.transition(operation, 'PERMANENT_FAILURE', 'OPERATION_EXPIRED', { expiresAt: operation.expiresAt });
      return { claimed: false, duplicate: false, terminal: true, operation: freezeRecord(operation) };
    }
    if (operation.status === 'SUCCEEDED') {
      this.appendEvent({ operationId: operation.id, eventType: 'DUPLICATE_IGNORED', fromStatus: 'SUCCEEDED', toStatus: 'SUCCEEDED', attempt: operation.attempts, safeDetails: { reason: 'ALREADY_SUCCEEDED' } });
      return { claimed: false, duplicate: true, terminal: true, operation: freezeRecord(operation) };
    }
    if (isMetaOperationTerminal(operation.status)) return { claimed: false, duplicate: false, terminal: true, operation: freezeRecord(operation) };
    if (operation.status === 'RUNNING' && operation.executionLeaseExpiresAt && new Date(operation.executionLeaseExpiresAt).getTime() > now.getTime()) {
      return { claimed: false, duplicate: true, terminal: false, operation: freezeRecord(operation) };
    }
    const previous = operation.status;
    if (!['QUEUED', 'RETRYABLE_FAILURE', 'RUNNING'].includes(previous)) {
      return { claimed: false, duplicate: true, terminal: false, operation: freezeRecord(operation) };
    }
    if (previous !== 'RUNNING') assertMetaOperationTransition(previous, 'RUNNING');
    operation.status = 'RUNNING';
    operation.attempts += 1;
    operation.startedAt ??= now.toISOString();
    operation.executionLeaseToken = `${input.workerId?.trim() || 'worker'}:${randomUUID()}`;
    operation.executionLeaseExpiresAt = new Date(now.getTime() + Math.max(1_000, input.leaseMs ?? 120_000)).toISOString();
    operation.updatedAt = now.toISOString();
    this.appendEvent({ operationId: operation.id, eventType: 'EXECUTION_STARTED', fromStatus: previous, toStatus: 'RUNNING', attempt: operation.attempts, safeDetails: { leaseExpiresAt: operation.executionLeaseExpiresAt } });
    return { claimed: true, duplicate: false, terminal: false, operation: freezeRecord(operation), leaseToken: operation.executionLeaseToken };
  }

  async completeExecution(input: { readonly operationId: string; readonly leaseToken: string; readonly result?: Readonly<Record<string, unknown>> }): Promise<MetaOperationRecord | null> {
    const operation = this.operations.get(input.operationId);
    if (!operation || operation.status !== 'RUNNING' || operation.executionLeaseToken !== input.leaseToken) return null;
    operation.result = input.result ? freezeRecord(input.result) : undefined;
    operation.lastError = undefined;
    operation.nextAttemptAt = undefined;
    operation.executionLeaseToken = undefined;
    operation.executionLeaseExpiresAt = undefined;
    operation.completedAt = new Date().toISOString();
    this.transition(operation, 'SUCCEEDED', 'EXECUTION_SUCCEEDED', input.result);
    return freezeRecord(operation);
  }


  async deferExecution(input: { readonly operationId: string; readonly leaseToken: string; readonly error: import('./types').MetaOperationSafeError; readonly availableAt: Date }): Promise<MetaOperationRecord | null> {
    const operation = this.operations.get(input.operationId);
    if (!operation || operation.status !== 'RUNNING' || operation.executionLeaseToken !== input.leaseToken) return null;
    if (input.availableAt.getTime() >= new Date(operation.expiresAt).getTime()) {
      return this.failExecution({
        operationId: input.operationId,
        leaseToken: input.leaseToken,
        error: { code: 'META_OPERATION_DEADLINE_EXPIRED', message: 'The next retry would occur after operation expiry.', retryable: false, category: 'TIMEOUT' },
      });
    }
    const message = [...this.outbox.values()].find((candidate) => candidate.operationId === operation.id);
    if (!message) throw new Error('META_OPERATION_OUTBOX_MISSING');
    operation.lastError = freezeRecord(input.error);
    operation.executionLeaseToken = undefined;
    operation.executionLeaseExpiresAt = undefined;
    operation.nextAttemptAt = input.availableAt.toISOString();
    message.state = 'RETRY_SCHEDULED';
    message.availableAt = input.availableAt.toISOString();
    message.publishedAt = undefined;
    message.leaseToken = undefined;
    message.leaseExpiresAt = undefined;
    message.lastError = freezeRecord(input.error);
    message.updatedAt = new Date().toISOString();
    this.transition(operation, 'RETRYABLE_FAILURE', 'EXECUTION_DEFERRED', { code: input.error.code, availableAt: message.availableAt, priority: operation.priority });
    return freezeRecord(operation);
  }

  async failExecution(input: { readonly operationId: string; readonly leaseToken: string; readonly error: import('./types').MetaOperationSafeError }): Promise<MetaOperationRecord | null> {
    const operation = this.operations.get(input.operationId);
    if (!operation || operation.status !== 'RUNNING' || operation.executionLeaseToken !== input.leaseToken) return null;
    operation.lastError = freezeRecord(input.error);
    operation.executionLeaseToken = undefined;
    operation.executionLeaseExpiresAt = undefined;
    operation.completedAt = input.error.retryable ? undefined : new Date().toISOString();
    this.transition(operation, input.error.retryable ? 'RETRYABLE_FAILURE' : 'PERMANENT_FAILURE', 'EXECUTION_FAILED', { code: input.error.code, retryable: input.error.retryable });
    return freezeRecord(operation);
  }
}
