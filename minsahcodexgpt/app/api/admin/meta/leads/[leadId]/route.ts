import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission, requireSuperAdminMutation } from '@/app/api/admin/_utils';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { readJsonObject, metaAdminActionErrorResponse } from '@/app/api/admin/meta/_shared/response';
import { getMetaLeadSafe, updateMetaLeadLifecycle } from '@/lib/meta/leads/repository';
import type { MetaLeadContactChannel, MetaLeadStatus } from '@/lib/meta/leads/types';
import { executeMetaAdminAction } from '@/lib/meta/admin/service';
import { assertMetaAdminSafeDto, metaAdminNoStoreHeaders, requireMetaAdminOpaqueId } from '@/lib/meta-platform/admin';
import { getMetaLeadAdminTrace } from '@/lib/meta-platform/admin/lead-status';

const STATUSES = new Set<MetaLeadStatus>(['NEW','CONTACTED','QUALIFIED','UNQUALIFIED','CONVERTED','LOST']);
const CHANNELS = new Set<MetaLeadContactChannel>(['PHONE','WHATSAPP','EMAIL','MESSENGER','OTHER']);

type Context = { params: Promise<{ leadId: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.META_OPS_VIEW);
  if (response) return response;
  try {
    const { leadId: rawId } = await params;
    const leadId = requireMetaAdminOpaqueId(rawId, 'META_LEAD_ID_INVALID');
    const [lead, trace] = await Promise.all([getMetaLeadSafe(leadId), getMetaLeadAdminTrace(leadId)]);
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404, headers: metaAdminNoStoreHeaders() });
    const payload = { ok: true, lead, trace };
    assertMetaAdminSafeDto(payload);
    return NextResponse.json(payload, { headers: metaAdminNoStoreHeaders() });
  } catch (error) { return metaAdminActionErrorResponse(error); }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { admin, response } = await requireSuperAdminMutation(request);
  if (response) return response;
  try {
    const { leadId: rawId } = await params;
    const leadId = requireMetaAdminOpaqueId(rawId, 'META_LEAD_ID_INVALID');
    const before = await getMetaLeadSafe(leadId);
    if (!before) return NextResponse.json({ error: 'Lead not found' }, { status: 404, headers: metaAdminNoStoreHeaders() });
    const body = await readJsonObject(request);
    const status = typeof body.status === 'string' ? body.status.toUpperCase() as MetaLeadStatus : undefined;
    if (status && !STATUSES.has(status)) return NextResponse.json({ error: 'Invalid lead status' }, { status: 400 });
    let contactAttempt: Parameters<typeof updateMetaLeadLifecycle>[0]['contactAttempt'];
    if (body.contactAttempt && typeof body.contactAttempt === 'object' && !Array.isArray(body.contactAttempt)) {
      const attempt = body.contactAttempt as Record<string, unknown>;
      const channel = typeof attempt.channel === 'string' ? attempt.channel.toUpperCase() as MetaLeadContactChannel : 'OTHER';
      if (!CHANNELS.has(channel)) return NextResponse.json({ error: 'Invalid contact channel' }, { status: 400 });
      contactAttempt = {
        channel,
        outcome: typeof attempt.outcome === 'string' ? attempt.outcome : '',
        notes: typeof attempt.notes === 'string' ? attempt.notes : undefined,
        nextFollowUpAt: typeof attempt.nextFollowUpAt === 'string' && !Number.isNaN(Date.parse(attempt.nextFollowUpAt)) ? new Date(attempt.nextFollowUpAt) : undefined,
      };
    }
    const payload = {
      status: status ?? null,
      assignedToId: typeof body.assignedToId === 'string' ? requireMetaAdminOpaqueId(body.assignedToId, 'META_LEAD_ASSIGNEE_ID_INVALID') : null,
      convertedOrderId: typeof body.convertedOrderId === 'string' ? requireMetaAdminOpaqueId(body.convertedOrderId, 'META_LEAD_ORDER_ID_INVALID') : null,
      contactAttempt: contactAttempt ? { channel: contactAttempt.channel, outcomeCode: contactAttempt.outcome.slice(0, 80), hasNotes: Boolean(contactAttempt.notes), nextFollowUpAt: contactAttempt.nextFollowUpAt?.toISOString() ?? null } : null,
    };
    const executed = await executeMetaAdminAction({
      request, actorId: admin.adminId, actionKey: 'META_LEAD_UPDATE', resourceType: 'META_LEAD', resourceId: leadId,
      payload, beforeData: { status: before.status, assignedToId: before.assignedToId, convertedOrderId: before.convertedOrderId },
      reason: typeof body.reason === 'string' ? body.reason : 'Lead lifecycle update',
      run: () => updateMetaLeadLifecycle({
        leadId, actorId: admin.adminId, status,
        assignedToId: payload.assignedToId ?? undefined,
        convertedOrderId: payload.convertedOrderId ?? undefined,
        contactAttempt,
      }),
    });
    const responsePayload = { updated: true, result: executed.result, auditId: executed.auditId };
    assertMetaAdminSafeDto(responsePayload);
    return NextResponse.json(responsePayload, { headers: metaAdminNoStoreHeaders() });
  } catch (error) {
    return metaAdminActionErrorResponse(error);
  }
}
