import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { listAdSets } from '@/lib/meta-business/marketing';
import { metaAdminActionErrorResponse, metaErrorResponse, readJsonObject, requiredString } from '@/app/api/admin/meta/_shared/response';
import { executeApprovedMetaAdsMutation } from '@/app/api/admin/meta/_shared/ads-mutation';

export const dynamic = 'force-dynamic';
function record(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }

export async function GET(request: NextRequest) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try { return NextResponse.json({ adSets: await listAdSets({ limit: 200 }) }); }
  catch (error) { return metaErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request);
    const payload = {
      name: requiredString(body.name, 'name'), campaignId: requiredString(body.campaignId, 'campaignId'),
      status: typeof body.status === 'string' ? body.status : undefined,
      dailyBudgetBdt: typeof body.dailyBudgetBdt === 'number' ? body.dailyBudgetBdt : undefined,
      lifetimeBudgetBdt: typeof body.lifetimeBudgetBdt === 'number' ? body.lifetimeBudgetBdt : undefined,
      bidAmountBdt: typeof body.bidAmountBdt === 'number' ? body.bidAmountBdt : undefined,
      bidStrategy: typeof body.bidStrategy === 'string' ? body.bidStrategy : undefined,
      billingEvent: typeof body.billingEvent === 'string' ? body.billingEvent : undefined,
      optimizationGoal: typeof body.optimizationGoal === 'string' ? body.optimizationGoal : undefined,
      targeting: record(body.targeting), promotedObject: record(body.promotedObject),
      startTime: typeof body.startTime === 'string' ? body.startTime : undefined,
      endTime: typeof body.endTime === 'string' ? body.endTime : undefined,
      attributionSpec: body.attributionSpec,
    };
    const executed = await executeApprovedMetaAdsMutation({ request, actorId: admin.adminId, operation: 'CREATE_ADSET', payload, approvalId: body.approvalId, reason: body.reason });
    return NextResponse.json({ ok: true, adSet: executed.result, auditId: executed.auditId }, { status: 201 });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function PATCH(request: NextRequest) {
  const { admin, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_OPERATE);
  if (response) return response;
  try {
    const body = await readJsonObject(request); const adSetId = requiredString(body.adSetId, 'adSetId');
    const payload = Object.fromEntries(Object.entries({
      name: typeof body.name === 'string' ? body.name : undefined,
      status: typeof body.status === 'string' ? body.status : undefined,
      dailyBudgetBdt: typeof body.dailyBudgetBdt === 'number' ? body.dailyBudgetBdt : undefined,
      lifetimeBudgetBdt: typeof body.lifetimeBudgetBdt === 'number' ? body.lifetimeBudgetBdt : undefined,
      bidAmountBdt: typeof body.bidAmountBdt === 'number' ? body.bidAmountBdt : undefined,
      bidStrategy: typeof body.bidStrategy === 'string' ? body.bidStrategy : undefined,
      billingEvent: typeof body.billingEvent === 'string' ? body.billingEvent : undefined,
      optimizationGoal: typeof body.optimizationGoal === 'string' ? body.optimizationGoal : undefined,
      targeting: record(body.targeting), promotedObject: record(body.promotedObject),
      startTime: typeof body.startTime === 'string' ? body.startTime : undefined,
      endTime: typeof body.endTime === 'string' ? body.endTime : undefined,
      attributionSpec: body.attributionSpec,
    }).filter(([, value]) => value !== undefined));
    const executed = await executeApprovedMetaAdsMutation({ request, actorId: admin.adminId, operation: 'UPDATE_ADSET', resourceId: adSetId, payload, approvalId: body.approvalId, reason: body.reason });
    return NextResponse.json({ ok: true, adSet: executed.result, auditId: executed.auditId });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}
