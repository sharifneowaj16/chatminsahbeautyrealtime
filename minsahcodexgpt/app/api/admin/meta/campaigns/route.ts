import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { listCampaigns } from '@/lib/meta-business/marketing';
import { metaAdminActionErrorResponse, metaErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { executeApprovedMetaAdsMutation } from '@/app/api/admin/meta/_shared/ads-mutation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try { return NextResponse.json({ campaigns: await listCampaigns({ limit: 200 }) }); }
  catch (error) { return metaErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const payload = {
      name: requiredString(body.name, 'name'),
      objective: typeof body.objective === 'string' ? body.objective : undefined,
      status: typeof body.status === 'string' ? body.status : undefined,
      specialAdCategories: Array.isArray(body.specialAdCategories) ? body.specialAdCategories.filter((x): x is string => typeof x === 'string') : undefined,
      buyingType: typeof body.buyingType === 'string' ? body.buyingType : undefined,
      dailyBudgetBdt: typeof body.dailyBudgetBdt === 'number' ? body.dailyBudgetBdt : undefined,
      lifetimeBudgetBdt: typeof body.lifetimeBudgetBdt === 'number' ? body.lifetimeBudgetBdt : undefined,
      bidStrategy: typeof body.bidStrategy === 'string' ? body.bidStrategy : undefined,
    };
    const executed = await executeApprovedMetaAdsMutation({ request, actorId: admin.adminId, operation: 'CREATE_CAMPAIGN', payload, approvalId: body.approvalId, reason: body.reason });
    return NextResponse.json({ ok: true, campaign: executed.result, auditId: executed.auditId }, { status: 201 });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function PATCH(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const campaignId = requiredString(body.campaignId, 'campaignId');
    const payload = Object.fromEntries(Object.entries({
      name: typeof body.name === 'string' ? body.name : undefined,
      status: typeof body.status === 'string' ? body.status : undefined,
      dailyBudgetBdt: typeof body.dailyBudgetBdt === 'number' ? body.dailyBudgetBdt : undefined,
      lifetimeBudgetBdt: typeof body.lifetimeBudgetBdt === 'number' ? body.lifetimeBudgetBdt : undefined,
      bidStrategy: typeof body.bidStrategy === 'string' ? body.bidStrategy : undefined,
    }).filter(([, value]) => value !== undefined));
    const executed = await executeApprovedMetaAdsMutation({ request, actorId: admin.adminId, operation: 'UPDATE_CAMPAIGN', resourceId: campaignId, payload, approvalId: body.approvalId, reason: body.reason });
    return NextResponse.json({ ok: true, campaign: executed.result, auditId: executed.auditId });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
