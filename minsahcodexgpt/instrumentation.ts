/**
 * instrumentation.ts (project root — next to next.config.ts)
 *
 * Starts long-running BullMQ workers when the Next.js server starts.
 * This keeps product-sync, Meta CAPI, and GA4 Measurement Protocol queues
 * alive in single-container deployments where no separate worker process is
 * configured.
 *
 * In larger deployments you can still run workers separately with:
 *   npm run worker:all
 */

const globalForWorkers = globalThis as unknown as {
  minsahProductWorkerStarted?: boolean;
  minsahMetaCapiWorkerStarted?: boolean;
};

export async function register() {
  // Only run in Node.js runtime (not Edge), and only on the server.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  if (process.env.DISABLE_EMBEDDED_WORKERS === 'true') {
    console.log('[instrumentation] Embedded workers disabled by DISABLE_EMBEDDED_WORKERS=true');
    return;
  }

  if (!globalForWorkers.minsahProductWorkerStarted) {
    const { startProductWorker } = await import('./lib/workers/productWorker');
    startProductWorker();
    globalForWorkers.minsahProductWorkerStarted = true;
    console.log('[instrumentation] ✅ Product sync worker started');
  }

  if (!globalForWorkers.minsahMetaCapiWorkerStarted) {
    const { startMetaCapiWorker } = await import('./lib/workers/metaCapiWorker');
    startMetaCapiWorker();
    globalForWorkers.minsahMetaCapiWorkerStarted = true;
    console.log('[instrumentation] ✅ Meta CAPI/GA4 worker started');
  }
}
