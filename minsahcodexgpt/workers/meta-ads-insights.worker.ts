import { META_QUEUE_NAMES, type MetaAdsInsightsJobPayload } from '@/lib/jobs/job-types';
import { startMetaJobWorker } from '@/lib/jobs/worker';
import { syncMetaAdsInsights } from '@/lib/meta/ads/insights';
import { generateMetaAdsRecommendations } from '@/lib/meta/ads/recommendations';

export function startMetaAdsInsightsWorker() {
  return startMetaJobWorker(META_QUEUE_NAMES.ADS_INSIGHTS, async (job) => {
    const data = job.data as MetaAdsInsightsJobPayload;
    const sync = await syncMetaAdsInsights({ level: data.level, since: data.since, until: data.until, requestedById: 'system:meta-ads-insights-worker', correlationId: data.correlationId });
    const recommendations = await generateMetaAdsRecommendations();
    return { auditStatus: 'SUCCEEDED' as const, result: { sync, recommendations } };
  });
}

if (process.argv[1]?.includes('meta-ads-insights.worker')) startMetaAdsInsightsWorker();
