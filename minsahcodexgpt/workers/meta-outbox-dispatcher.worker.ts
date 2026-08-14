import { dispatchDueMetaOutbox } from '@/lib/meta/capi/dispatcher';

const POLL_INTERVAL_MS = Number(process.env.META_OUTBOX_DISPATCH_INTERVAL_MS ?? 5_000);
const BATCH_SIZE = Number(process.env.META_OUTBOX_DISPATCH_BATCH_SIZE ?? 25);
let running = false;

export async function runMetaOutboxDispatchCycle() {
  if (running) return { skipped: true, reason: 'DISPATCH_ALREADY_RUNNING' };
  running = true;
  try {
    return await dispatchDueMetaOutbox({ limit: BATCH_SIZE });
  } finally {
    running = false;
  }
}

export function startMetaOutboxDispatcherWorker() {
  void runMetaOutboxDispatchCycle();
  const timer = setInterval(() => {
    void runMetaOutboxDispatchCycle().catch((error) => {
      console.error('[MetaOutboxDispatcher] cycle failed:', error instanceof Error ? error.message : error);
    });
  }, Math.max(1_000, POLL_INTERVAL_MS));
  timer.unref?.();
  console.log('[MetaOutboxDispatcher] worker started');
  return timer;
}

const isDirectRun = process.argv[1]?.includes('meta-outbox-dispatcher.worker');
if (isDirectRun) startMetaOutboxDispatcherWorker();
