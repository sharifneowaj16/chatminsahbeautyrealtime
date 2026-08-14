import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { listAds } from '@/lib/meta-business/marketing';
import { metaAdminActionErrorResponse, metaErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { executeApprovedMetaAdsMutation } from '@/app/api/admin/meta/_shared/ads-mutation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try { return NextResponse.json({ ads: await listAds({ limit: 200 }) }); }
  catch (error) { return metaErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const payload = {
      name: requiredString(body.name, 'name'),
      adSetId: requiredString(body.adSetId, 'adSetId'),
      creativeId: requiredString(body.creativeId, 'creativeId'),
      status: typeof body.status === 'string' ? body.status : undefined,
      trackingSpecs: body.trackingSpecs,
    };
    const executed = await executeApprovedMetaAdsMutation({ request, actorId: admin.adminId, operation: 'CREATE_AD', payload, approvalId: body.approvalId, reason: body.reason });
    return NextResponse.json({ ok: true, ad: executed.result, auditId: executed.auditId }, { status: 201 });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function PATCH(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request); const adId = requiredString(body.adId, 'adId');
    const payload = Object.fromEntries(Object.entries({
      name: typeof body.name === 'string' ? body.name : undefined,
      status: typeof body.status === 'string' ? body.status : undefined,
      creative: body.creative && typeof body.creative === 'object' && !Array.isArray(body.creative) ? body.creative : undefined,
      tracking_specs: body.tracking_specs,
    }).filter(([, value]) => value !== undefined));
    const executed = await executeApprovedMetaAdsMutation({ request, actorId: admin.adminId, operation: 'UPDATE_AD', resourceId: adId, payload, approvalId: body.approvalId, reason: body.reason });
    return NextResponse.json({ ok: true, ad: executed.result, auditId: executed.auditId });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
