import type { MetaFencedLockLease, MetaFencedLockManager } from './types';

export class MetaFencedLeaseLostError extends Error {
  readonly code = 'META_FENCED_LEASE_LOST';

  constructor(readonly scopeKey: string) {
    super('The active fenced lease could not be renewed.');
    this.name = 'MetaFencedLeaseLostError';
  }
}

export interface MetaLeaseExecutionContext {
  readonly signal: AbortSignal;
  readonly lease: MetaFencedLockLease;
  assertActive(): void;
}

export async function runWithMetaLeaseHeartbeat<T>(input: {
  readonly manager: MetaFencedLockManager;
  readonly lease: MetaFencedLockLease;
  readonly leaseMs: number;
  readonly task: (context: MetaLeaseExecutionContext) => Promise<T>;
}): Promise<T> {
  const controller = new AbortController();
  let currentLease = input.lease;
  let lost: MetaFencedLeaseLostError | undefined;
  let stopped = false;
  const intervalMs = Math.max(250, Math.floor(input.leaseMs / 3));
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    timer = setTimeout(async () => {
      if (stopped) return;
      try {
        const renewed = await input.manager.renew({
          scopeKey: currentLease.scopeKey,
          leaseToken: currentLease.leaseToken,
          leaseMs: input.leaseMs,
        });
        if (!renewed) {
          lost = new MetaFencedLeaseLostError(currentLease.scopeKey);
          controller.abort(lost);
          return;
        }
        currentLease = renewed;
      } catch {
        lost = new MetaFencedLeaseLostError(currentLease.scopeKey);
        controller.abort(lost);
        return;
      }
      schedule();
    }, intervalMs);
    timer.unref?.();
  };

  schedule();
  const context: MetaLeaseExecutionContext = {
    get lease() { return currentLease; },
    signal: controller.signal,
    assertActive() {
      if (lost) throw lost;
    },
  };

  try {
    const result = await input.task(context);
    context.assertActive();
    return result;
  } finally {
    stopped = true;
    if (timer) clearTimeout(timer);
  }
}
