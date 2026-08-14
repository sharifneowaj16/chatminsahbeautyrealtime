import 'server-only';
import { randomUUID } from 'node:crypto';
import { incrementMetaCounter } from '@/lib/observability/metrics';
import { buildAttributionCapture } from './capture';
import { resolveFirstTouch, firstTouchConflict } from './first-touch';
import { resolveLastTouch } from './last-touch';
import { buildAttributionKey } from './session';
import { buildCheckoutSnapshot, type OrderAttributionSnapshotInput } from './checkout-snapshot';
import { inheritLeadAttribution } from './order-link';
import type { AttributionCaptureInput, AttributionTouch } from './types';

export type AttributionDb = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $transaction<T>(fn: (tx: AttributionDb) => Promise<T>): Promise<T>;
};

type AttributionRow = {
  id: string;
  firstTouch: AttributionTouch | null;
  lastTouch: AttributionTouch | null;
  checkoutSnapshot?: Record<string, unknown> | null;
  sourceModel?: 'FIRST_PARTY' | 'META_REPORTED';
};

function json(value: unknown) {
  return JSON.stringify(value);
}

function qualityFor(input: ReturnType<typeof buildAttributionCapture>, conflict = false) {
  const issues = [
    !input.fbp ? 'MISSING_FBP' : null,
    !input.fbc && !input.fbclid ? 'MISSING_CLICK_ID' : null,
    input.touch.direct ? 'DIRECT_TRAFFIC' : null,
    conflict ? 'FIRST_TOUCH_CONFLICT_IGNORED' : null,
  ].filter(Boolean);
  return { issues, complete: issues.length === 0, evaluatedAt: new Date().toISOString() };
}

async function captureInTransaction(tx: AttributionDb, raw: AttributionCaptureInput) {
  const input = buildAttributionCapture(raw);
  const rows = await tx.$queryRawUnsafe<AttributionRow[]>(
    `SELECT "id","firstTouch","lastTouch" FROM "MarketingAttribution" WHERE "attributionKey"=$1 FOR UPDATE`,
    input.attributionKey
  );
  const existing = rows[0];
  const conflict = firstTouchConflict(existing?.firstTouch, input.touch);
  const firstTouch = resolveFirstTouch(existing?.firstTouch, input.touch);
  const lastTouch = resolveLastTouch(existing?.lastTouch, input.touch);
  const dataQuality = qualityFor(input, conflict);

  if (!existing) {
    const id = randomUUID();
    await tx.$executeRawUnsafe(
      `INSERT INTO "MarketingAttribution" (
        "id","attributionKey","sessionId","visitorId","customerId","fbclid","fbc","fbp",
        "utmSource","utmMedium","utmCampaign","utmTerm","utmContent","landingPage",
        "firstTouch","lastTouch","dataQuality","consentState","conversionType","sourceModel",
        "firstTouchedAt","lastTouchedAt","captureCount","createdAt","updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17::jsonb,$18,'SESSION','FIRST_PARTY',$19,$19,1,NOW(),NOW())`,
      id, input.attributionKey, input.sessionId ?? null, input.visitorId ?? null, input.customerId ?? null,
      input.fbclid ?? null, input.fbc ?? null, input.fbp ?? null,
      input.utmSource ?? null, input.utmMedium ?? null, input.utmCampaign ?? null, input.utmTerm ?? null,
      input.utmContent ?? null, input.landingPage ?? null, json(firstTouch), json(lastTouch), json(dataQuality),
      input.consentState, input.capturedAt
    );
    incrementMetaCounter('meta_attribution_capture_total', { model: 'first_party', outcome: input.touch.direct ? 'direct' : 'attributed' });
    return { id, created: true, firstTouch, lastTouch, conflict, dataQuality };
  }

  await tx.$executeRawUnsafe(
    `UPDATE "MarketingAttribution" SET
      "visitorId"=COALESCE("visitorId",$2), "customerId"=COALESCE($3,"customerId"),
      "fbclid"=COALESCE($4,"fbclid"), "fbc"=COALESCE($5,"fbc"), "fbp"=COALESCE($6,"fbp"),
      "utmSource"=$7, "utmMedium"=$8, "utmCampaign"=$9, "utmTerm"=$10, "utmContent"=$11,
      "landingPage"=COALESCE($12,"landingPage"), "firstTouch"=$13::jsonb, "lastTouch"=$14::jsonb,
      "dataQuality"=$15::jsonb, "consentState"=$16, "lastTouchedAt"=$17,
      "captureCount"="captureCount"+1, "updatedAt"=NOW()
     WHERE "id"=$1`,
    existing.id, input.visitorId ?? null, input.customerId ?? null, input.fbclid ?? null, input.fbc ?? null,
    input.fbp ?? null, input.utmSource ?? null, input.utmMedium ?? null, input.utmCampaign ?? null,
    input.utmTerm ?? null, input.utmContent ?? null, input.landingPage ?? null, json(firstTouch), json(lastTouch),
    json(dataQuality), input.consentState, input.capturedAt
  );
  incrementMetaCounter('meta_attribution_capture_total', { model: 'first_party', outcome: input.touch.direct ? 'direct' : 'attributed' });
  if (conflict) incrementMetaCounter('meta_attribution_first_touch_conflict_total', { outcome: 'ignored' });
  return { id: existing.id, created: false, firstTouch, lastTouch, conflict, dataQuality };
}

export function captureMarketingAttribution(db: AttributionDb, input: AttributionCaptureInput) {
  return db.$transaction((tx) => captureInTransaction(tx, input));
}

export async function snapshotOrderAttributionInTransaction(tx: AttributionDb, input: OrderAttributionSnapshotInput) {
  const key = buildAttributionKey({ orderId: input.orderId });
  const { touch: checkoutTouch, snapshot } = buildCheckoutSnapshot(input);
  const candidates = await tx.$queryRawUnsafe<AttributionRow[]>(
    `SELECT "firstTouch","lastTouch" FROM "MarketingAttribution"
     WHERE "conversionType"='SESSION' AND (($1::text IS NOT NULL AND "visitorId"=$1) OR ($2::text IS NOT NULL AND "customerId"=$2))
     ORDER BY "lastTouchedAt" DESC NULLS LAST, "createdAt" DESC LIMIT 1`,
    input.visitorId ?? null, input.customerId ?? null
  );
  const firstTouch = resolveFirstTouch(candidates[0]?.firstTouch, checkoutTouch);
  const lastTouch = resolveLastTouch(candidates[0]?.lastTouch, checkoutTouch);
  const dataQuality = {
    issues: [!input.fbp ? 'MISSING_FBP' : null, !input.fbc ? 'MISSING_FBC' : null, lastTouch.direct ? 'UNATTRIBUTED_ORDER' : null].filter(Boolean),
    evaluatedAt: new Date().toISOString(),
  };
  await tx.$executeRawUnsafe(
    `INSERT INTO "MarketingAttribution" (
      "id","attributionKey","visitorId","customerId","orderId","fbc","fbp","utmSource","utmMedium","utmCampaign","utmTerm","utmContent","landingPage",
      "firstTouch","lastTouch","checkoutSnapshot","dataQuality","consentState","conversionType","sourceModel","conversionValue","currency","firstTouchedAt","lastTouchedAt","convertedAt","createdAt","updatedAt"
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb,$18,'ORDER','FIRST_PARTY',$19,$20,$21,$21,$21,NOW(),NOW())
    ON CONFLICT ("attributionKey") DO NOTHING`,
    randomUUID(), key, input.visitorId ?? null, input.customerId ?? null, input.orderId, input.fbc ?? null, input.fbp ?? null,
    input.utmSource ?? null, input.utmMedium ?? null, input.utmCampaign ?? null, input.utmTerm ?? null,
    input.utmContent ?? null, input.landingPage ?? null, json(firstTouch), json(lastTouch), json(snapshot), json(dataQuality),
    input.consentState ?? 'UNKNOWN', input.total == null ? null : Number(input.total), input.currency?.trim().toUpperCase() || 'BDT', input.createdAt ?? new Date()
  );
  incrementMetaCounter('meta_attribution_order_snapshot_total', { outcome: lastTouch.direct ? 'unattributed' : 'attributed' });
  return { attributionKey: key, firstTouch, lastTouch, immutable: true };
}

export async function linkLeadAttributionToOrderInTransaction(tx: AttributionDb, input: { leadId: string; orderId: string; actorId?: string }) {
    const leads = await tx.$queryRawUnsafe<Array<{
      id: string; campaignId: string | null; campaignName: string | null; adsetId: string | null; adId: string | null;
      isOrganic: boolean | null; receivedAt: Date; convertedOrderId: string | null;
    }>>(
      `SELECT "id","campaignId","campaignName","adsetId","adId","isOrganic","receivedAt","convertedOrderId" FROM "MetaLead" WHERE "id"=$1 FOR UPDATE`, input.leadId
    );
    const lead = leads[0];
    if (!lead) throw new Error('ATTRIBUTION_LEAD_NOT_FOUND');
    if (lead.convertedOrderId && lead.convertedOrderId !== input.orderId) throw new Error('ATTRIBUTION_LEAD_ORDER_MISMATCH');
    const leadTouch: AttributionTouch = {
      source: lead.isOrganic ? 'meta-organic' : 'meta-paid',
      medium: lead.isOrganic ? 'organic-lead' : 'paid-social',
      campaign: lead.campaignName || lead.campaignId || 'meta-lead',
      content: lead.adId || lead.adsetId || undefined,
      capturedAt: lead.receivedAt.toISOString(),
      direct: false,
    };
    const orderKey = buildAttributionKey({ orderId: input.orderId });
    const orderRows = await tx.$queryRawUnsafe<AttributionRow[]>(
      `SELECT "id","firstTouch","lastTouch","checkoutSnapshot" FROM "MarketingAttribution" WHERE "attributionKey"=$1 FOR UPDATE`, orderKey
    );
    const inherited = inheritLeadAttribution({ orderFirstTouch: orderRows[0]?.firstTouch, orderLastTouch: orderRows[0]?.lastTouch, leadTouch });
    const correction = { type: 'LEAD_ATTRIBUTION_INHERITANCE', leadId: input.leadId, actorId: input.actorId ?? null, appliedAt: new Date().toISOString(), inherited: inherited.inherited };
    if (orderRows[0]) {
      await tx.$executeRawUnsafe(
        `UPDATE "MarketingAttribution" SET "leadId"=$2,"firstTouch"=$3::jsonb,"lastTouch"=$4::jsonb,
         "correctionAudit"=COALESCE("correctionAudit",'[]'::jsonb) || $5::jsonb,"updatedAt"=NOW() WHERE "id"=$1`,
        orderRows[0].id, input.leadId, json(inherited.firstTouch), json(inherited.lastTouch), json([correction])
      );
    } else {
      await tx.$executeRawUnsafe(
        `INSERT INTO "MarketingAttribution" ("id","attributionKey","orderId","leadId","firstTouch","lastTouch","correctionAudit","conversionType","sourceModel","convertedAt","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,'ORDER','FIRST_PARTY',NOW(),NOW(),NOW())`,
        randomUUID(), orderKey, input.orderId, input.leadId, json(inherited.firstTouch), json(inherited.lastTouch), json([correction])
      );
    }
    await tx.$executeRawUnsafe(
      `INSERT INTO "MarketingAttribution" ("id","attributionKey","leadId","orderId","firstTouch","lastTouch","conversionType","sourceModel","convertedAt","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5::jsonb,$5::jsonb,'LEAD','FIRST_PARTY',NOW(),NOW(),NOW()) ON CONFLICT ("attributionKey") DO UPDATE SET "orderId"=EXCLUDED."orderId","updatedAt"=NOW()`,
      randomUUID(), buildAttributionKey({ leadId: input.leadId }), input.leadId, input.orderId, json(leadTouch)
    );
    incrementMetaCounter('meta_attribution_lead_order_link_total', { outcome: inherited.inherited ? 'inherited' : 'preserved' });
    return { leadId: input.leadId, orderId: input.orderId, inherited: inherited.inherited };
 }

export function linkLeadAttributionToOrder(db: AttributionDb, input: { leadId: string; orderId: string; actorId?: string }) {
  return db.$transaction((tx) => linkLeadAttributionToOrderInTransaction(tx, input));
}
