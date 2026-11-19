/**
 * instrumentation.ts (project root — next to next.config.ts)
 *
 * Starts long-running BullMQ workers when the Next.js server starts.
 * In larger deployments, run `npm run worker:all` in a dedicated worker service
 * and set DISABLE_EMBEDDED_WORKERS=true on the web service.
 */

const globalForWorkers = globalThis as unknown as {
  minsahProductWorkerStarted?: boolean;
  minsahMetaCapiWorkerStarted?: boolean;
  minsahMetaCatalogWorkerStarted?: boolean;
  minsahMetaBatchStatusWorkerStarted?: boolean;
  minsahMetaLeadWorkerStarted?: boolean;
  minsahMetaInstagramWorkerStarted?: boolean;
  minsahMetaSocialWorkerStarted?: boolean;
  minsahMetaSchedulerWorkerStarted?: boolean;
};

export async function register() {
  // Only run in Node.js runtime (not Edge), and only on the server.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { validateMetaCatalogIdentityEnvironment } = await import(
    './lib/tracking/meta-content-id-server'
  );
  validateMetaCatalogIdentityEnvironment();

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

  if (!globalForWorkers.minsahMetaCatalogWorkerStarted) {
    const { startMetaCatalogWorker } = await import('./workers/meta-catalog.worker');
    startMetaCatalogWorker();
    globalForWorkers.minsahMetaCatalogWorkerStarted = true;
    console.log('[instrumentation] ✅ Meta catalog sync worker started');
  }

  if (!globalForWorkers.minsahMetaBatchStatusWorkerStarted) {
    const { startMetaBatchStatusWorker } = await import('./workers/meta-batch-status.worker');
    startMetaBatchStatusWorker();
    globalForWorkers.minsahMetaBatchStatusWorkerStarted = true;
    console.log('[instrumentation] ✅ Meta catalog batch-status worker started');
  }

  if (!globalForWorkers.minsahMetaLeadWorkerStarted) {
    const { startMetaLeadWorker } = await import('./workers/meta-lead.worker');
    startMetaLeadWorker();
    globalForWorkers.minsahMetaLeadWorkerStarted = true;
    console.log('[instrumentation] ✅ Meta Lead worker started');
  }

  if (!globalForWorkers.minsahMetaInstagramWorkerStarted) {
    const { startMetaInstagramWorker } = await import('./workers/meta-instagram.worker');
    startMetaInstagramWorker();
    globalForWorkers.minsahMetaInstagramWorkerStarted = true;
    console.log('[instrumentation] ✅ Meta Instagram worker started');
  }

  if (!globalForWorkers.minsahMetaSocialWorkerStarted) {
    const { startMetaSocialWorker } = await import('./workers/meta-social.worker');
    startMetaSocialWorker();
    globalForWorkers.minsahMetaSocialWorkerStarted = true;
    console.log('[instrumentation] ✅ Meta social worker started');
  }

  if (!globalForWorkers.minsahMetaSchedulerWorkerStarted) {
    const { startMetaSchedulerWorker } = await import('./workers/meta-scheduler.worker');
    startMetaSchedulerWorker();
    globalForWorkers.minsahMetaSchedulerWorkerStarted = true;
    console.log('[instrumentation] ✅ Meta scheduler started');
  }
}
