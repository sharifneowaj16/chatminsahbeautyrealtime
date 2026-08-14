import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { metaAdminActionErrorResponse, readJsonObject } from '@/app/api/admin/meta/_shared/response';
import { executeMetaAdminAction, getMetaAdminRequestMetadata } from '@/lib/meta/admin/service';
import { getMetaAdsReadOnlyStability, listMetaAdsInsights, syncMetaAdsInsights, type MetaAdsInsightLevel } from '@/lib/meta/ads/insights';
import { generateMetaAdsRecommendations, listMetaAdsRecommendations } from '@/lib/meta/ads/recommendations';
import { getMetaAdsSafetyCaps } from '@/lib/meta/ads/safety';
import { listMetaAdsMutationExecutions } from '@/lib/meta/ads/mutations';

export const dynamic = 'force-dynamic';

function parseLevel(value: string | null): MetaAdsInsightLevel {
  const upper = value?.toUpperCase();
  return upper === 'ACCOUNT' || upper === 'CAMPAIGN' || upper === 'ADSET' || upper === 'AD' ? upper : 'CAMPAIGN';
}
function dateParam(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : undefined;
}

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try {
    const q = request.nextUrl.searchParams;
    const level = parseLevel(q.get('level'));
    const [report, stability, recommendations, executions] = await Promise.all([
      listMetaAdsInsights({ level, since: dateParam(q.get('since')), until: dateParam(q.get('until')), limit: Number(q.get('limit') ?? 100) }),
      getMetaAdsReadOnlyStability(),
      listMetaAdsRecommendations({ limit: 100 }),
      listMetaAdsMutationExecutions({ limit: 50 }),
    ]);
    return NextResponse.json({ ok: true, level, ...report, stability, recommendations, executions, safetyCaps: getMetaAdsSafetyCaps() });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const level = parseLevel(typeof body.level === 'string' ? body.level : null);
    const since = typeof body.since === 'string' ? body.since : undefined;
    const until = typeof body.until === 'string' ? body.until : undefined;
    const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'Synchronize read-only Meta Ads Insights';
    const correlationId = getMetaAdminRequestMetadata(request).requestId;
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_ADS_INSIGHTS_SYNC', resourceType: 'META_ADS_INSIGHTS', resourceId: level,
      payload: { level, since: since ?? null, until: until ?? null }, reason,
      run: async () => {
        const sync = await syncMetaAdsInsights({ level, since, until, requestedById: admin.adminId, correlationId });
        const recommendations = await generateMetaAdsRecommendations();
        return { sync, recommendations };
      },
    });
    return NextResponse.json({ ok: true, result: executed.result, auditId: executed.auditId }, { status: 202 });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
