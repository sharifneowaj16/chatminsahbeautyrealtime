import crypto from 'node:crypto';
import { scheduleMetaMaintenanceJobs } from '@/lib/jobs/scheduler';
import { getMetaJobsRedis } from '@/lib/jobs/connection';

const INTERVAL_MS = Math.max(30_000, Number(process.env.META_JOB_SCHEDULER_INTERVAL_MS ?? 60_000));
const SCHEDULER_LOCK_KEY = 'meta:lock:scheduler-cycle';
let running = false;

async function acquireSchedulerLease(ttlMs: number): Promise<boolean> {
  if (process.env.NODE_ENV === 'test' || !process.env.REDIS_URL?.trim()) {
    return true;
  }

  try {
    const redis = getMetaJobsRedis();
    const token = crypto.randomUUID();
    const result = await redis.set(SCHEDULER_LOCK_KEY, token, 'PX', ttlMs, 'NX');
    return result === 'OK';
  } catch (error) {
    console.warn(
      '[MetaScheduler] Leader lock fallback (Redis unreachable):',
      error instanceof Error ? error.message : error
    );
    return true;
  }
}

export async function runMetaSchedulerCycle() {
  if (running) return { skipped: true, reason: 'SCHEDULER_ALREADY_RUNNING' };
  running = true;
  try {
    const leaseMs = Math.max(15_000, INTERVAL_MS - 5_000);
    const isLeader = await acquireSchedulerLease(leaseMs);
    if (!isLeader) {
      return { skipped: true, reason: 'SCHEDULER_LOCKED_BY_OTHER_REPLICA' };
    }
    return await scheduleMetaMaintenanceJobs(new Date());
  } finally {
    running = false;
  }
}

export function startMetaSchedulerWorker() {
  void runMetaSchedulerCycle();
  const timer = setInterval(() => void runMetaSchedulerCycle().catch((error) => {
    console.error('[MetaScheduler]', error instanceof Error ? error.message : error);
  }), INTERVAL_MS);
  timer.unref?.();
  console.log('[MetaScheduler] started');
  return timer;
}

if (process.argv[1]?.includes('meta-scheduler.worker')) startMetaSchedulerWorker();
