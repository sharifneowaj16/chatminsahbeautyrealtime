import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { listCreatives } from '@/lib/meta-business/marketing';
import { metaAdminActionErrorResponse, metaErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { executeApprovedMetaAdsMutation } from '@/app/api/admin/meta/_shared/ads-mutation';

export const dynamic = 'force-dynamic';
function record(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try { return NextResponse.json({ creatives: await listCreatives({ limit: 200 }) }); }
  catch (error) { return metaErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const payload = {
      name: requiredString(body.name, 'name'),
      pageId: typeof body.pageId === 'string' ? body.pageId : undefined,
      instagramActorId: typeof body.instagramActorId === 'string' ? body.instagramActorId : undefined,
      link: typeof body.link === 'string' ? body.link : undefined,
      message: typeof body.message === 'string' ? body.message : undefined,
      headline: typeof body.headline === 'string' ? body.headline : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      imageHash: typeof body.imageHash === 'string' ? body.imageHash : undefined,
      picture: typeof body.picture === 'string' ? body.picture : undefined,
      callToActionType: typeof body.callToActionType === 'string' ? body.callToActionType : undefined,
      objectStorySpec: record(body.objectStorySpec), assetFeedSpec: record(body.assetFeedSpec), degreesOfFreedomSpec: record(body.degreesOfFreedomSpec),
      urlTags: typeof body.urlTags === 'string' ? body.urlTags : undefined,
    };
    const executed = await executeApprovedMetaAdsMutation({ request, actorId: admin.adminId, operation: 'CREATE_CREATIVE', payload, approvalId: body.approvalId, reason: body.reason });
    return NextResponse.json({ ok: true, creative: executed.result, auditId: executed.auditId }, { status: 201 });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function PATCH(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request); const creativeId = requiredString(body.creativeId, 'creativeId');
    const payload = Object.fromEntries(Object.entries({
      name: typeof body.name === 'string' ? body.name : undefined,
      object_story_spec: record(body.object_story_spec),
      asset_feed_spec: record(body.asset_feed_spec),
      degrees_of_freedom_spec: record(body.degrees_of_freedom_spec),
      url_tags: typeof body.url_tags === 'string' ? body.url_tags : undefined,
    }).filter(([, value]) => value !== undefined));
    const executed = await executeApprovedMetaAdsMutation({ request, actorId: admin.adminId, operation: 'UPDATE_CREATIVE', resourceId: creativeId, payload, approvalId: body.approvalId, reason: body.reason });
    return NextResponse.json({ ok: true, creative: executed.result, auditId: executed.auditId });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
