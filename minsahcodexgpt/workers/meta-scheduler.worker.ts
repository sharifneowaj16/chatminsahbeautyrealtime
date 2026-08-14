import { scheduleMetaMaintenanceJobs } from '@/lib/jobs/scheduler';

const INTERVAL_MS = Math.max(30_000, Number(process.env.META_JOB_SCHEDULER_INTERVAL_MS ?? 60_000));
let running = false;

export async function runMetaSchedulerCycle() {
  if (running) return { skipped: true, reason: 'SCHEDULER_ALREADY_RUNNING' };
  running = true;
  try {
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
