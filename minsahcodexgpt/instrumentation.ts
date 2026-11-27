/**
 * instrumentation.ts (project root — next to next.config.ts)
 *
 * Starts long-running BullMQ workers when the Next.js server starts.
 * In larger deployments, run `npm run worker:all` in a dedicated worker service
 * and set DISABLE_EMBEDDED_WORKERS=true on the web service.
 */

const globalForWorkers = globalThis as unknown as {
  minsahProductWorkerStarted?: boolean;
  minsahOrderTelegramWorkerStarted?: boolean;
  minsahMetaCapiWorkerStarted?: boolean;
  minsahGa4EventsWorkerStarted?: boolean;
  minsahMetaCatalogWorkerStarted?: boolean;
  minsahMetaBatchStatusWorkerStarted?: boolean;
  minsahMetaLeadWorkerStarted?: boolean;
  minsahMetaInstagramWorkerStarted?: boolean;
  minsahMetaSocialWorkerStarted?: boolean;
  minsahMetaSchedulerWorkerStarted?: boolean;
  minsahMetaAdsInsightsWorkerStarted?: boolean;
  minsahMetaProductSetsWorkerStarted?: boolean;
  minsahMetaDiagnosticsWorkerStarted?: boolean;
  minsahMetaTokenHealthWorkerStarted?: boolean;
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

  if (!globalForWorkers.minsahOrderTelegramWorkerStarted) {
    const { startOrderTelegramWorker } = await import('./lib/workers/orderTelegramWorker');
    startOrderTelegramWorker();
    globalForWorkers.minsahOrderTelegramWorkerStarted = true;
    console.log('[instrumentation] \u2705 Order Telegram & Courier worker started');
  }

  if (!globalForWorkers.minsahMetaCapiWorkerStarted) {
    const { startMetaCapiWorker } = await import('./lib/workers/metaCapiWorker');
    startMetaCapiWorker();
    globalForWorkers.minsahMetaCapiWorkerStarted = true;
    console.log('[instrumentation] ✅ Meta CAPI/GA4 worker started');
  }

  if (!globalForWorkers.minsahGa4EventsWorkerStarted) {
    const { startGa4EventsWorker } = await import('./workers/ga4-events.worker');
    startGa4EventsWorker();
    globalForWorkers.minsahGa4EventsWorkerStarted = true;
    console.log('[instrumentation] \u2705 GA4 events worker started');
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

  if (process.env.ENABLE_META_EXTENDED_SYNC === 'true') {
    if (!globalForWorkers.minsahMetaAdsInsightsWorkerStarted) {
      const { startMetaAdsInsightsWorker } = await import('./workers/meta-ads-insights.worker');
      startMetaAdsInsightsWorker();
      globalForWorkers.minsahMetaAdsInsightsWorkerStarted = true;
      console.log('[instrumentation] ✅ Meta ads insights worker started');
    }

    if (!globalForWorkers.minsahMetaProductSetsWorkerStarted) {
      const { startMetaProductSetsWorker } = await import('./workers/meta-product-sets.worker');
      startMetaProductSetsWorker();
      globalForWorkers.minsahMetaProductSetsWorkerStarted = true;
      console.log('[instrumentation] ✅ Meta product sets worker started');
    }

    if (!globalForWorkers.minsahMetaDiagnosticsWorkerStarted) {
      const { startMetaDiagnosticsWorker } = await import('./workers/meta-diagnostics.worker');
      startMetaDiagnosticsWorker();
      globalForWorkers.minsahMetaDiagnosticsWorkerStarted = true;
      console.log('[instrumentation] ✅ Meta diagnostics worker started');
    }

    if (!globalForWorkers.minsahMetaTokenHealthWorkerStarted) {
      const { startMetaTokenHealthWorker } = await import('./workers/meta-token-health.worker');
      startMetaTokenHealthWorker();
      globalForWorkers.minsahMetaTokenHealthWorkerStarted = true;
      console.log('[instrumentation] ✅ Meta token health worker started');
    }
  }
}
