import { META_QUEUE_NAMES, type MetaConnectionHealthJobPayload } from '@/lib/jobs/job-types';
import { startMetaJobWorker } from '@/lib/jobs/worker';
import { checkMetaConnectionReadiness } from '@/lib/meta/connection/readiness';
import { createAndPublishSocialRealtimeEvent } from '@/lib/meta-platform/realtime/social-events';

export function startMetaTokenHealthWorker() {
  return startMetaJobWorker(META_QUEUE_NAMES.CONNECTION_HEALTH, async (job) => {
    const data = job.data as MetaConnectionHealthJobPayload;
    const correlationId = job.id ?? data.connectionId ?? 'meta-connection-health';
    const readiness = await checkMetaConnectionReadiness({ persist: true, correlationId });
    const state = String(readiness.status).toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 96);
    await createAndPublishSocialRealtimeEvent({
      type: 'META_CONNECTION_HEALTH_CHANGED',
      platform: 'meta',
      correlationId,
      orderingKey: data.connectionId ?? readiness.connectionName,
      providerEventKey: data.connectionId ?? readiness.connectionName,
      state: /^[A-Z][A-Z0-9_]{1,95}$/.test(state) ? state : 'HEALTH_UPDATED',
      occurredAt: readiness.checkedAt,
    }).catch((error) => console.error('[meta/token-health] realtime publish failed', error));
    return {
      auditStatus: readiness.status === 'ERROR' || readiness.status === 'INVALID_TOKEN' ? 'DEAD_LETTER' as const : 'SUCCEEDED' as const,
      result: {
        connectionId: data.connectionId ?? readiness.connectionName,
        checks: data.checks,
        status: readiness.status,
        warningCount: readiness.warnings.length,
        checkedAt: readiness.checkedAt,
      },
    };
  });
}

if (process.argv[1]?.includes('meta-token-health.worker')) startMetaTokenHealthWorker();
