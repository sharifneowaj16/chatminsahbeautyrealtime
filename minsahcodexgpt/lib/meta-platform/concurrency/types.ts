export interface MetaFencedLockLease {
  readonly scopeKey: string;
  readonly ownerId: string;
  readonly leaseToken: string;
  readonly fencingToken: number;
  readonly expiresAt: string;
}

export interface MetaFencedLockManager {
  acquire(input: {
    readonly scopeKey: string;
    readonly ownerId: string;
    readonly leaseMs?: number;
    /** Test clock for deterministic in-memory tests. Durable implementations must use database time. */
    readonly now?: Date;
  }): Promise<MetaFencedLockLease | null>;
  renew(input: {
    readonly scopeKey: string;
    readonly leaseToken: string;
    readonly leaseMs?: number;
    /** Test clock for deterministic in-memory tests. Durable implementations must use database time. */
    readonly now?: Date;
  }): Promise<MetaFencedLockLease | null>;
  release(input: { readonly scopeKey: string; readonly leaseToken: string }): Promise<boolean>;
  inspect(scopeKey: string): Promise<MetaFencedLockLease | null>;
}
