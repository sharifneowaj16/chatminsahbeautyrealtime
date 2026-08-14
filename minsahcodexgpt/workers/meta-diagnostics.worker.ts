import { META_QUEUE_NAMES, type MetaCatalogDiagnosticsJobPayload } from '@/lib/jobs/job-types';
import { startMetaJobWorker } from '@/lib/jobs/worker';
import { importMetaCatalogDiagnostics } from '@/lib/meta/catalog/diagnostics';
import { evaluateMetaOperationalAlerts } from '@/lib/observability/incidents';

export function startMetaDiagnosticsWorker() {
  return startMetaJobWorker(META_QUEUE_NAMES.DIAGNOSTICS, async (job) => {
    const data = job.data as MetaCatalogDiagnosticsJobPayload;
    const diagnostics = await importMetaCatalogDiagnostics({ catalogId: data.catalogId, correlationId: data.correlationId });
    const alerts = await evaluateMetaOperationalAlerts();
    return { auditStatus: 'SUCCEEDED' as const, result: { diagnostics, alerts: { createdOrRefreshed: alerts.createdOrRefreshed } } };
  });
}

if (process.argv[1]?.includes('meta-diagnostics.worker')) startMetaDiagnosticsWorker();
