import { schedulePrivacyGovernanceJobs } from '@/lib/privacy/scheduler';

const INTERVAL_MS = Math.max(30_000, Number(process.env.PRIVACY_SCHEDULER_INTERVAL_MS ?? 60_000));
let running = false;

export async function runPrivacySchedulerCycle() {
  if (running) return { skipped: true, reason: 'PRIVACY_SCHEDULER_ALREADY_RUNNING' };
  running = true;
  try {
    return await schedulePrivacyGovernanceJobs(new Date());
  } finally {
    running = false;
  }
}

export function startPrivacySchedulerWorker() {
  void runPrivacySchedulerCycle();
  const timer = setInterval(() => void runPrivacySchedulerCycle().catch((error) => {
    console.error('[PrivacyScheduler]', error instanceof Error ? error.message : 'PRIVACY_SCHEDULER_FAILED');
  }), INTERVAL_MS);
  timer.unref?.();
  console.log('[PrivacyScheduler] started');
  return timer;
}

if (process.argv[1]?.includes('privacy-scheduler.worker')) startPrivacySchedulerWorker();
