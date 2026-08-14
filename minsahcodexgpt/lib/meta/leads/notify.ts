import 'server-only';
import { getMetaLeadConfig } from './config';

export async function notifyMetaLeadAssignment(input: {
  leadId: string;
  assignedToId?: string | null;
  fullName?: string | null;
  phoneMasked?: string | null;
  emailMasked?: string | null;
  campaignId?: string | null;
  responseSlaAt?: Date;
}) {
  const url = getMetaLeadConfig().notificationWebhookUrl;
  if (!url) return { sent: false as const, reason: 'NOT_CONFIGURED' as const };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ type: 'META_LEAD_ASSIGNED', leadId: input.leadId, assignedToId: input.assignedToId ?? null,
        fullName: input.fullName ?? null, phoneMasked: input.phoneMasked ?? null, emailMasked: input.emailMasked ?? null,
        campaignId: input.campaignId ?? null, responseSlaAt: input.responseSlaAt?.toISOString() ?? null }),
    });
    return response.ok ? { sent: true as const } : { sent: false as const, reason: `HTTP_${response.status}` };
  } catch (error) {
    return { sent: false as const, reason: error instanceof Error ? error.name : 'NOTIFICATION_FAILED' };
  } finally { clearTimeout(timer); }
}
