import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission, requireSuperAdmin } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { getMetaConnectionBootstrap } from '@/lib/meta/connection/config';
import { buildMetaConnectionBootstrapReadiness, getMetaConnectionCutoverStatus } from '@/lib/meta/connection/readiness';
import { getLatestMetaConnectionReadiness } from '@/lib/meta/connection/repository';
import { enqueueMetaConnectionHealthJob } from '@/lib/jobs/queues';
import { buildTokenHealthIdempotencyKey } from '@/lib/jobs/idempotency';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { metaAdminActionErrorResponse } from '@/app/api/admin/meta/_shared/response';
import { evaluateMetaPageHealth } from '@/lib/meta-platform/domains/pages/page-identity';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  const now = new Date();
  const bootstrapReadiness = buildMetaConnectionBootstrapReadiness(now);
  const persisted = await getLatestMetaConnectionReadiness(bootstrapReadiness.connectionName).catch(() => null);
  const effectiveReadiness = persisted ?? bootstrapReadiness;
  const serverConfig = getMetaConnectionBootstrap();
  const pageHealth = evaluateMetaPageHealth({
    operation: 'LEADGEN_SUBSCRIBE',
    expectedPageId: bootstrapReadiness.assets.page.id,
    expectedAppId: bootstrapReadiness.assets.app.id,
    expectedBusinessId: bootstrapReadiness.assets.business.id,
    expectedInstagramAccountId: bootstrapReadiness.assets.instagramAccount.id,
    readiness: effectiveReadiness,
    now,
  });
  const bootstrapSafe = {
    connectionName: bootstrapReadiness.connectionName,
    appId: bootstrapReadiness.assets.app.id,
    businessId: bootstrapReadiness.assets.business.id,
    catalogId: bootstrapReadiness.assets.catalog.id,
    datasetId: bootstrapReadiness.assets.dataset.id,
    pixelId: bootstrapReadiness.assets.pixel.id,
    adAccountId: bootstrapReadiness.assets.adAccount.id,
    pageId: bootstrapReadiness.assets.page.id,
    instagramAccountId: bootstrapReadiness.assets.instagramAccount.id,
    graphApiVersion: bootstrapReadiness.graphApiVersion,
    requiredPermissions: bootstrapReadiness.permissions.required,
    tokenConfigured: Boolean(serverConfig.accessToken),
    pageTokenConfigured: Boolean(serverConfig.pageAccessToken),
    appSecretConfigured: Boolean(serverConfig.appSecret),
  };
  return NextResponse.json({ ok: true, connection: effectiveReadiness, bootstrap: bootstrapSafe, pageHealth, cutover: getMetaConnectionCutoverStatus(), secretPolicy: { accessTokenReturned: false, pageAccessTokenReturned: false, appSecretReturned: false, rotationMode: 'external-secret-reference' } });
}

export async function POST(request: NextRequest) {
  const { admin, response } = await requireSuperAdmin(request);
  if (response) return response;
  if (!admin) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: unknown; connectionName?: unknown; reason?: unknown } | null;
  if (body?.action !== 'recheck') return NextResponse.json({ ok: false, error: 'action must be recheck' }, { status: 400 });
  const connectionName = typeof body.connectionName === 'string' && body.connectionName.trim() ? body.connectionName.trim() : 'primary';
  try {
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_CONNECTION_RECHECK', resourceType: 'META_CONNECTION', resourceId: connectionName,
      payload: { connectionName, checks: ['TOKEN', 'PERMISSIONS', 'ASSETS', 'VERSION'] },
      reason: typeof body.reason === 'string' ? body.reason : 'Manual connection health recheck',
      run: () => enqueueMetaConnectionHealthJob({ connectionId: connectionName, idempotencyKey: buildTokenHealthIdempotencyKey(connectionName, new Date()), requestedBy: admin.adminId, checks: ['TOKEN', 'PERMISSIONS', 'ASSETS', 'VERSION'] }),
    });
    return NextResponse.json({ ok: true, ...executed.result, auditId: executed.auditId }, { status: 202 });
  } catch (error) {
    return metaAdminActionErrorResponse(error);
  }
}
