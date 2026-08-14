import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { metaAdminActionErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { dismissMetaAdsRecommendation, generateMetaAdsRecommendations, listMetaAdsRecommendations } from '@/lib/meta/ads/recommendations';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try { return NextResponse.json({ ok: true, recommendations: await listMetaAdsRecommendations({ status: request.nextUrl.searchParams.get('status') ?? undefined, limit: Number(request.nextUrl.searchParams.get('limit') ?? 100) }) }); }
  catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const reason = typeof body.reason === 'string' ? body.reason : 'Generate Meta Ads optimization recommendations';
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_ADS_RECOMMENDATIONS_GENERATE', resourceType: 'META_ADS_RECOMMENDATIONS', payload: {}, reason,
      run: () => generateMetaAdsRecommendations(),
    });
    return NextResponse.json({ ok: true, result: executed.result, auditId: executed.auditId });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function PATCH(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const recommendationId = requiredString(body.recommendationId, 'recommendationId');
    const reason = typeof body.reason === 'string' ? body.reason : 'Dismiss Meta Ads recommendation';
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_ADS_RECOMMENDATION_DISMISS', resourceType: 'META_ADS_RECOMMENDATION', resourceId: recommendationId,
      payload: { recommendationId }, reason,
      run: () => dismissMetaAdsRecommendation({ recommendationId }),
    });
    return NextResponse.json({ ok: true, recommendation: executed.result, auditId: executed.auditId });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
