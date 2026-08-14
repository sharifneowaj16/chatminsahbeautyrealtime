import { randomUUID } from 'node:crypto';
import type { MetaFencedLockLease, MetaFencedLockManager } from './types';

export type { MetaFencedLockLease, MetaFencedLockManager } from './types';

interface MutableLease {
  scopeKey: string;
  ownerId: string;
  leaseToken: string;
  fencingToken: number;
  expiresAt: string;
}

const SCOPE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,254}$/;

function normalize(value: string, code: string): string {
  const result = value.trim();
  if (!SCOPE_PATTERN.test(result)) throw new TypeError(code);
  return result;
}

function freeze(lease: MutableLease): MetaFencedLockLease {
  return Object.freeze({ ...lease });
}

export class InMemoryMetaFencedLockManager implements MetaFencedLockManager {
  private readonly leases = new Map<string, MutableLease>();
  private readonly counters = new Map<string, number>();

  async acquire(input: { readonly scopeKey: string; readonly ownerId: string; readonly leaseMs?: number; readonly now?: Date }) {
    const scopeKey = normalize(input.scopeKey, 'META_FENCED_LOCK_SCOPE_INVALID');
    const ownerId = normalize(input.ownerId, 'META_FENCED_LOCK_OWNER_INVALID');
    const now = input.now ?? new Date();
    const active = this.leases.get(scopeKey);
    if (active && new Date(active.expiresAt).getTime() > now.getTime()) return null;
    const fencingToken = (this.counters.get(scopeKey) ?? 0) + 1;
    this.counters.set(scopeKey, fencingToken);
    const lease: MutableLease = {
      scopeKey,
      ownerId,
      leaseToken: `${ownerId}:${randomUUID()}`,
      fencingToken,
      expiresAt: new Date(now.getTime() + Math.max(1_000, input.leaseMs ?? 60_000)).toISOString(),
    };
    this.leases.set(scopeKey, lease);
    return freeze(lease);
  }

  async renew(input: { readonly scopeKey: string; readonly leaseToken: string; readonly leaseMs?: number; readonly now?: Date }) {
    const scopeKey = normalize(input.scopeKey, 'META_FENCED_LOCK_SCOPE_INVALID');
    const active = this.leases.get(scopeKey);
    const now = input.now ?? new Date();
    if (!active || active.leaseToken !== input.leaseToken || new Date(active.expiresAt).getTime() <= now.getTime()) return null;
    active.expiresAt = new Date(now.getTime() + Math.max(1_000, input.leaseMs ?? 60_000)).toISOString();
    return freeze(active);
  }

  async release(input: { readonly scopeKey: string; readonly leaseToken: string }) {
    const scopeKey = normalize(input.scopeKey, 'META_FENCED_LOCK_SCOPE_INVALID');
    const active = this.leases.get(scopeKey);
    if (!active || active.leaseToken !== input.leaseToken) return false;
    this.leases.delete(scopeKey);
    return true;
  }

  async inspect(scopeKey: string) {
    const active = this.leases.get(normalize(scopeKey, 'META_FENCED_LOCK_SCOPE_INVALID'));
    return active ? freeze(active) : null;
  }
}

export function metaWorkflowLockScope(workflowId: string): string {
  return `meta-workflow:${normalize(workflowId, 'META_WORKFLOW_ID_INVALID')}`;
}

export function metaReconciliationLockScope(reconciliationId: string): string {
  return `meta-reconciliation:${normalize(reconciliationId, 'META_RECONCILIATION_ID_INVALID')}`;
}
