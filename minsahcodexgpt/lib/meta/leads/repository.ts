import 'server-only';
import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import { selectMetaLeadAssignee } from './assign';
import { selectMetaLeadDuplicate } from './deduplicate';
import { validateMetaLeadTransition } from './lifecycle';
import { linkLeadAttributionToOrderInTransaction, type AttributionDb } from '@/lib/attribution/repository';
import type {
  MetaLeadAgentView,
  MetaLeadAssignmentRuleView,
  MetaLeadContactChannel,
  MetaLeadField,
  MetaLeadGraphPayload,
  MetaLeadStatus,
  NormalizedMetaLead,
} from './types';

export type PersistedMetaLeadResult = {
  leadId: string;
  leadgenId: string;
  created: boolean;
  duplicate: boolean;
  duplicateReason?: 'LEADGEN_ID' | 'PHONE' | 'EMAIL';
  canonicalLeadId: string;
};

type LeadIdentityRow = {
  id: string;
  leadgenId: string;
  normalizedPhoneHash: string | null;
  normalizedEmailHash: string | null;
  assignedToId?: string | null;
};

type SafeLeadRow = {
  id: string;
  leadgenId: string;
  formId: string | null;
  pageId: string | null;
  adId: string | null;
  adsetId: string | null;
  campaignId: string | null;
  campaignName: string | null;
  fullName: string | null;
  phoneMasked: string | null;
  emailMasked: string | null;
  city: string | null;
  area: string | null;
  productInterest: string | null;
  isTestLead: boolean | null;
  status: MetaLeadStatus;
  retrievalStatus: string;
  assignedToId: string | null;
  assignmentReason: string | null;
  receivedAt: Date;
  sourceCreatedAt: Date | null;
  fetchedAt: Date | null;
  assignedAt: Date | null;
  contactedAt: Date | null;
  qualifiedAt: Date | null;
  convertedAt: Date | null;
  lostAt: Date | null;
  convertedOrderId: string | null;
  duplicateCount: bigint | number;
  contactAttemptCount: bigint | number;
};

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeFieldMetadata(fields: MetaLeadField[]) {
  return fields.map((field) => ({ name: field.name, valueCount: field.values.length }));
}

function safeNormalizedMetadata(normalized: NormalizedMetaLead) {
  return {
    city: normalized.city,
    area: normalized.area,
    country: normalized.country,
    productInterest: normalized.productInterest,
    customFields: Object.entries(normalized.customFields).map(([name, values]) => ({ name, valueCount: values.length })),
  };
}

function serializeSafeLead(row: SafeLeadRow) {
  return {
    ...row,
    duplicateCount: Number(row.duplicateCount),
    contactAttemptCount: Number(row.contactAttemptCount),
  };
}

export async function persistRetrievedMetaLead(input: {
  receiptId: string;
  pageId: string;
  raw: MetaLeadGraphPayload;
  fields: MetaLeadField[];
  normalized: NormalizedMetaLead;
  encryptedRawPayload: string;
  rawPayloadDigest: string;
  freshnessSeconds?: number;
  retentionUntil: Date;
}): Promise<PersistedMetaLeadResult> {
  const candidates = await prisma.$queryRawUnsafe<LeadIdentityRow[]>(
    `SELECT "id","leadgenId","normalizedPhoneHash","normalizedEmailHash","assignedToId"
     FROM "MetaLead"
     WHERE "leadgenId"=$1
        OR ($2::text IS NOT NULL AND "normalizedPhoneHash"=$2)
        OR ($3::text IS NOT NULL AND "normalizedEmailHash"=$3)
     ORDER BY CASE WHEN "leadgenId"=$1 THEN 0 WHEN "normalizedPhoneHash"=$2 THEN 1 ELSE 2 END, "createdAt" ASC
     LIMIT 20`,
    input.raw.id, input.normalized.phoneHash ?? null, input.normalized.emailHash ?? null
  );
  const duplicate = selectMetaLeadDuplicate({
    leadgenId: input.raw.id,
    phoneHash: input.normalized.phoneHash,
    emailHash: input.normalized.emailHash,
    candidates,
  });

  if (duplicate && duplicate.reason !== 'LEADGEN_ID') {
    const matchedValueHash = duplicate.reason === 'PHONE' ? input.normalized.phoneHash : input.normalized.emailHash;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "MetaLeadDuplicate"
        ("id","sourceLeadgenId","canonicalLeadId","reason","matchedValueHash","receiptId","createdAt")
       VALUES ($1,$2,$3,$4::"MetaLeadDuplicateReason",$5,$6,NOW())
       ON CONFLICT ("sourceLeadgenId") DO UPDATE SET
         "canonicalLeadId"=EXCLUDED."canonicalLeadId", "reason"=EXCLUDED."reason",
         "matchedValueHash"=EXCLUDED."matchedValueHash", "receiptId"=EXCLUDED."receiptId"`,
      crypto.randomUUID(), input.raw.id, duplicate.candidate.id, duplicate.reason, matchedValueHash ?? null, input.receiptId
    );
    return {
      leadId: duplicate.candidate.id,
      leadgenId: input.raw.id,
      created: false,
      duplicate: true,
      duplicateReason: duplicate.reason,
      canonicalLeadId: duplicate.candidate.id,
    };
  }

  const id = duplicate?.candidate.id ?? crypto.randomUUID();
  const created = !duplicate;
  const sourceCreatedAt = parseDate(input.raw.created_time);
  const safeFields = JSON.stringify(safeFieldMetadata(input.fields));
  const normalizedJson = JSON.stringify(safeNormalizedMetadata(input.normalized));
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO "MetaLead" (
      "id","leadgenId","formId","pageId","adId","adName","adsetId","adsetName","campaignId","campaignName",
      "isOrganic","platform","partnerName","retailerItemId","rawFields","rawPayloadEncrypted","rawPayloadDigest",
      "normalizedData","normalizedPhoneHash","normalizedEmailHash","phoneMasked","emailMasked","fullName","city","area","productInterest",
      "status","retrievalStatus","receivedAt","sourceCreatedAt","freshnessSeconds","fetchedAt","retentionUntil","createdAt","updatedAt"
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,CAST($15 AS JSONB),$16,$17,
      CAST($18 AS JSONB),$19,$20,$21,$22,$23,$24,$25,$26,
      'NEW'::"MetaLeadStatus",'FETCHED'::"MetaLeadRetrievalStatus",NOW(),$27,$28,NOW(),$29,NOW(),NOW()
    )
    ON CONFLICT ("leadgenId") DO UPDATE SET
      "formId"=COALESCE(EXCLUDED."formId","MetaLead"."formId"),
      "pageId"=COALESCE(EXCLUDED."pageId","MetaLead"."pageId"),
      "adId"=COALESCE(EXCLUDED."adId","MetaLead"."adId"),
      "adName"=COALESCE(EXCLUDED."adName","MetaLead"."adName"),
      "adsetId"=COALESCE(EXCLUDED."adsetId","MetaLead"."adsetId"),
      "adsetName"=COALESCE(EXCLUDED."adsetName","MetaLead"."adsetName"),
      "campaignId"=COALESCE(EXCLUDED."campaignId","MetaLead"."campaignId"),
      "campaignName"=COALESCE(EXCLUDED."campaignName","MetaLead"."campaignName"),
      "isOrganic"=EXCLUDED."isOrganic", "platform"=EXCLUDED."platform", "partnerName"=EXCLUDED."partnerName",
      "retailerItemId"=EXCLUDED."retailerItemId", "rawFields"=EXCLUDED."rawFields",
      "rawPayloadEncrypted"=EXCLUDED."rawPayloadEncrypted", "rawPayloadDigest"=EXCLUDED."rawPayloadDigest",
      "normalizedData"=EXCLUDED."normalizedData", "normalizedPhoneHash"=EXCLUDED."normalizedPhoneHash",
      "normalizedEmailHash"=EXCLUDED."normalizedEmailHash", "phoneMasked"=EXCLUDED."phoneMasked",
      "emailMasked"=EXCLUDED."emailMasked", "fullName"=EXCLUDED."fullName", "city"=EXCLUDED."city",
      "area"=EXCLUDED."area", "productInterest"=EXCLUDED."productInterest", "retrievalStatus"='FETCHED',
      "sourceCreatedAt"=COALESCE(EXCLUDED."sourceCreatedAt","MetaLead"."sourceCreatedAt"),
      "freshnessSeconds"=EXCLUDED."freshnessSeconds", "fetchedAt"=NOW(), "lastError"=NULL,
      "retentionUntil"=GREATEST("MetaLead"."retentionUntil",EXCLUDED."retentionUntil"), "updatedAt"=NOW()
    RETURNING "id"`,
    id, input.raw.id, input.raw.form_id ?? null, input.pageId, input.raw.ad_id ?? null, input.raw.ad_name ?? null,
    input.raw.adset_id ?? null, input.raw.adset_name ?? null, input.raw.campaign_id ?? null, input.raw.campaign_name ?? null,
    input.raw.is_organic ?? null, input.raw.platform ?? null, input.raw.partner_name ?? null, input.raw.retailer_item_id ?? null,
    safeFields, input.encryptedRawPayload, input.rawPayloadDigest, normalizedJson,
    input.normalized.phoneHash ?? null, input.normalized.emailHash ?? null, input.normalized.phoneMasked ?? null,
    input.normalized.emailMasked ?? null, input.normalized.fullName ?? null, input.normalized.city ?? null,
    input.normalized.area ?? null, input.normalized.productInterest ?? null, sourceCreatedAt,
    input.freshnessSeconds ?? null, input.retentionUntil
  );
  return {
    leadId: rows[0]?.id ?? id,
    leadgenId: input.raw.id,
    created,
    duplicate: false,
    duplicateReason: duplicate?.reason,
    canonicalLeadId: rows[0]?.id ?? id,
  };
}

export async function assignMetaLead(leadId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext('meta-v6-lead-assignment'))`);
    const leadRows = await tx.$queryRawUnsafe<Array<{
      id: string; assignedToId: string | null; campaignId: string | null; formId: string | null;
      city: string | null; area: string | null; productInterest: string | null;
    }>>(
      `SELECT "id","assignedToId","campaignId","formId","city","area","productInterest" FROM "MetaLead" WHERE "id"=$1 LIMIT 1`, leadId
    );
    const lead = leadRows[0];
    if (!lead) throw new Error('META_LEAD_NOT_FOUND');
    if (lead.assignedToId) return { assignedToId: lead.assignedToId, reason: 'ALREADY_ASSIGNED' as const, ruleId: null };

    const rules = await tx.$queryRawUnsafe<MetaLeadAssignmentRuleView[]>(
      `SELECT "id","priority","campaignId","formId","city","area","productInterest","assignedToId"
       FROM "MetaLeadAssignmentRule" WHERE "active"=true ORDER BY "priority" DESC,"id" ASC`
    );
    const agents = await tx.$queryRawUnsafe<MetaLeadAgentView[]>(
      `SELECT p."adminId",p."maxOpenLeads",p."lastAssignedAt",
        COUNT(l."id")::int AS "openLeads"
       FROM "MetaLeadAgentProfile" p
       JOIN "AdminUser" a ON a."id"=p."adminId" AND a."status"='ACTIVE'
       LEFT JOIN "MetaLead" l ON l."assignedToId"=p."adminId" AND l."status" IN ('NEW','CONTACTED','QUALIFIED')
       WHERE p."active"=true
       GROUP BY p."adminId",p."maxOpenLeads",p."lastAssignedAt"`
    );
    const selected = selectMetaLeadAssignee({
      campaignId: lead.campaignId,
      formId: lead.formId,
      normalized: { city: lead.city ?? undefined, area: lead.area ?? undefined, productInterest: lead.productInterest ?? undefined, customFields: {} },
      rules,
      agents,
    });
    if (!selected.assignedToId) return selected;
    await tx.$executeRawUnsafe(
      `UPDATE "MetaLead" SET "assignedToId"=$2,"assignmentRuleId"=$3,"assignmentReason"=$4,"assignedAt"=NOW(),"updatedAt"=NOW()
       WHERE "id"=$1 AND "assignedToId" IS NULL`,
      leadId, selected.assignedToId, selected.ruleId, selected.reason
    );
    await tx.$executeRawUnsafe(
      `UPDATE "MetaLeadAgentProfile" SET "lastAssignedAt"=NOW(),"updatedAt"=NOW() WHERE "adminId"=$1`, selected.assignedToId
    );
    return selected;
  });
}

export async function listMetaLeadsSafe(input: {
  page?: number;
  limit?: number;
  status?: string;
  formId?: string;
  assignedToId?: string;
  campaignId?: string;
}) {
  const page = Math.max(1, Math.trunc(input.page ?? 1));
  const limit = Math.min(200, Math.max(1, Math.trunc(input.limit ?? 50)));
  const offset = (page - 1) * limit;
  const status = input.status?.trim() || null;
  const formId = input.formId?.trim() || null;
  const assignedToId = input.assignedToId?.trim() || null;
  const campaignId = input.campaignId?.trim() || null;
  const rows = await prisma.$queryRawUnsafe<SafeLeadRow[]>(
    `SELECT l."id",l."leadgenId",l."formId",l."pageId",l."adId",l."adsetId",l."campaignId",l."campaignName",
      l."fullName",l."phoneMasked",l."emailMasked",l."city",l."area",l."productInterest",l."isTestLead",l."status",l."retrievalStatus",
      l."assignedToId",l."assignmentReason",l."receivedAt",l."sourceCreatedAt",l."fetchedAt",l."assignedAt",l."contactedAt",
      l."qualifiedAt",l."convertedAt",l."lostAt",l."convertedOrderId",
      (SELECT COUNT(*) FROM "MetaLeadDuplicate" d WHERE d."canonicalLeadId"=l."id") AS "duplicateCount",
      (SELECT COUNT(*) FROM "MetaLeadContactAttempt" c WHERE c."leadId"=l."id") AS "contactAttemptCount"
     FROM "MetaLead" l
     WHERE ($1::text IS NULL OR l."status"::text=$1)
       AND ($2::text IS NULL OR l."formId"=$2)
       AND ($3::text IS NULL OR l."assignedToId"=$3)
       AND ($4::text IS NULL OR l."campaignId"=$4)
     ORDER BY l."receivedAt" DESC,l."id" DESC LIMIT $5 OFFSET $6`,
    status, formId, assignedToId, campaignId, limit, offset
  );
  const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM "MetaLead" l
     WHERE ($1::text IS NULL OR l."status"::text=$1)
       AND ($2::text IS NULL OR l."formId"=$2)
       AND ($3::text IS NULL OR l."assignedToId"=$3)
       AND ($4::text IS NULL OR l."campaignId"=$4)`,
    status, formId, assignedToId, campaignId
  );
  const data = rows.map(serializeSafeLead);
  const total = Number(countRows[0]?.count ?? 0);
  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getMetaLeadSafe(leadId: string) {
  const rows = await prisma.$queryRawUnsafe<SafeLeadRow[]>(
    `SELECT l."id",l."leadgenId",l."formId",l."pageId",l."adId",l."adsetId",l."campaignId",l."campaignName",
      l."fullName",l."phoneMasked",l."emailMasked",l."city",l."area",l."productInterest",l."isTestLead",l."status",l."retrievalStatus",
      l."assignedToId",l."assignmentReason",l."receivedAt",l."sourceCreatedAt",l."fetchedAt",l."assignedAt",l."contactedAt",
      l."qualifiedAt",l."convertedAt",l."lostAt",l."convertedOrderId",
      (SELECT COUNT(*) FROM "MetaLeadDuplicate" d WHERE d."canonicalLeadId"=l."id") AS "duplicateCount",
      (SELECT COUNT(*) FROM "MetaLeadContactAttempt" c WHERE c."leadId"=l."id") AS "contactAttemptCount"
     FROM "MetaLead" l WHERE l."id"=$1 LIMIT 1`,
    leadId
  );
  return rows[0] ? serializeSafeLead(rows[0]) : null;
}

export async function updateMetaLeadLifecycle(input: {
  leadId: string;
  actorId: string;
  status?: MetaLeadStatus;
  assignedToId?: string;
  convertedOrderId?: string;
  contactAttempt?: { channel: MetaLeadContactChannel; outcome: string; notes?: string; nextFollowUpAt?: Date };
}) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string; status: MetaLeadStatus; assignedToId: string | null; convertedOrderId: string | null }>>(
      `SELECT "id","status","assignedToId","convertedOrderId" FROM "MetaLead" WHERE "id"=$1 FOR UPDATE`, input.leadId
    );
    const lead = rows[0];
    if (!lead) throw new Error('META_LEAD_NOT_FOUND');
    const nextStatus = input.status ?? lead.status;
    const orderId = input.convertedOrderId?.trim() || lead.convertedOrderId;
    validateMetaLeadTransition({ from: lead.status, to: nextStatus, convertedOrderId: orderId });
    if (input.assignedToId) {
      const admins = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT "id" FROM "AdminUser" WHERE "id"=$1 AND "status"='ACTIVE' LIMIT 1`, input.assignedToId
      );
      if (!admins[0]) throw new Error('META_LEAD_ASSIGNEE_INVALID');
    }
    if (nextStatus === 'CONVERTED') {
      const orders = await tx.$queryRawUnsafe<Array<{ id: string }>>(`SELECT "id" FROM "Order" WHERE "id"=$1 LIMIT 1`, orderId);
      if (!orders[0]) throw new Error('META_LEAD_CONVERTED_ORDER_NOT_FOUND');
    }
    await tx.$executeRawUnsafe(
      `UPDATE "MetaLead" SET
        "status"=$2::"MetaLeadStatus",
        "assignedToId"=COALESCE($3,"assignedToId"),
        "assignedAt"=CASE WHEN $3::text IS NOT NULL AND "assignedAt" IS NULL THEN NOW() ELSE "assignedAt" END,
        "convertedOrderId"=CASE WHEN $2='CONVERTED' THEN $4 ELSE "convertedOrderId" END,
        "contactedAt"=CASE WHEN $2='CONTACTED' THEN COALESCE("contactedAt",NOW()) ELSE "contactedAt" END,
        "qualifiedAt"=CASE WHEN $2='QUALIFIED' THEN COALESCE("qualifiedAt",NOW()) ELSE "qualifiedAt" END,
        "convertedAt"=CASE WHEN $2='CONVERTED' THEN COALESCE("convertedAt",NOW()) ELSE "convertedAt" END,
        "lostAt"=CASE WHEN $2='LOST' THEN COALESCE("lostAt",NOW()) ELSE "lostAt" END,
        "updatedAt"=NOW()
       WHERE "id"=$1`,
      input.leadId, nextStatus, input.assignedToId?.trim() || null, orderId
    );
    if (nextStatus === 'CONVERTED' && orderId) {
      await linkLeadAttributionToOrderInTransaction(tx as unknown as AttributionDb, {
        leadId: input.leadId,
        orderId,
        actorId: input.actorId,
      });
    }
    if (input.contactAttempt) {
      const outcome = input.contactAttempt.outcome.trim().slice(0, 200);
      if (!outcome) throw new Error('META_LEAD_CONTACT_OUTCOME_REQUIRED');
      await tx.$executeRawUnsafe(
        `INSERT INTO "MetaLeadContactAttempt"
          ("id","leadId","actorId","channel","outcome","notes","attemptedAt","nextFollowUpAt","createdAt")
         VALUES ($1,$2,$3,$4::"MetaLeadContactChannel",$5,$6,NOW(),$7,NOW())`,
        crypto.randomUUID(), input.leadId, input.actorId, input.contactAttempt.channel, outcome,
        input.contactAttempt.notes?.trim().slice(0, 2_000) || null, input.contactAttempt.nextFollowUpAt ?? null
      );
      if (lead.status === 'NEW' && !input.status) {
        await tx.$executeRawUnsafe(
          `UPDATE "MetaLead" SET "status"='CONTACTED',"contactedAt"=COALESCE("contactedAt",NOW()),"updatedAt"=NOW() WHERE "id"=$1`, input.leadId
        );
      }
    }
    return { leadId: input.leadId, status: nextStatus, assignedToId: input.assignedToId ?? lead.assignedToId, convertedOrderId: orderId };
  });
}

export async function listMetaLeadWebhookFailures(limit = 100) {
  return prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT "id","eventKey","leadgenId","pageId","formId","status","attemptCount","receivedAt","lastAttemptAt","processedAt","error"
     FROM "MetaWebhookReceipt" WHERE "status" IN ('FAILED','REJECTED')
     ORDER BY "receivedAt" DESC LIMIT $1`, Math.max(1, Math.min(limit, 500))
  );
}

export async function runMetaLeadSlaScan(slaMinutes: number, limit = 100) {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; assignedToId: string | null; fullName: string | null; phoneMasked: string | null; emailMasked: string | null; campaignId: string | null; receivedAt: Date }>>(
    `SELECT "id","assignedToId","fullName","phoneMasked","emailMasked","campaignId","receivedAt"
     FROM "MetaLead"
     WHERE "status"='NEW' AND "contactedAt" IS NULL AND "receivedAt" < NOW() - ($1::int * INTERVAL '1 minute')
     ORDER BY "receivedAt" ASC LIMIT $2`, Math.max(1, slaMinutes), Math.max(1, Math.min(limit, 500))
  );
  return rows;
}

export async function runMetaLeadRetentionCleanup(input: { rawRetentionDays: number; limit?: number }) {
  const limit = Math.max(1, Math.min(input.limit ?? 500, 5_000));
  const rawRedacted = await prisma.$executeRawUnsafe(
    `UPDATE "MetaLead" SET "rawPayloadEncrypted"=NULL,"updatedAt"=NOW()
     WHERE "id" IN (SELECT "id" FROM "MetaLead" WHERE "rawPayloadEncrypted" IS NOT NULL
       AND "fetchedAt" < NOW() - ($1::int * INTERVAL '1 day') ORDER BY "fetchedAt" ASC LIMIT $2)`,
    Math.max(1, input.rawRetentionDays), limit
  );
  const piiRedacted = await prisma.$executeRawUnsafe(
    `UPDATE "MetaLead" SET "normalizedData"=NULL,"fullName"=NULL,"city"=NULL,"area"=NULL,"productInterest"=NULL,
      "phoneMasked"=NULL,"emailMasked"=NULL,"updatedAt"=NOW()
     WHERE "id" IN (SELECT "id" FROM "MetaLead" WHERE "retentionUntil" <= NOW()
       AND ("normalizedData" IS NOT NULL OR "fullName" IS NOT NULL) ORDER BY "retentionUntil" ASC LIMIT $1)`, limit
  );
  const receiptsRedacted = await prisma.$executeRawUnsafe(
    `UPDATE "MetaWebhookReceipt" SET "payload"=NULL,"payloadEncrypted"=NULL,"updatedAt"=NOW()
     WHERE "id" IN (SELECT "id" FROM "MetaWebhookReceipt" WHERE "cleanupAfter" <= NOW()
       AND ("payload" IS NOT NULL OR "payloadEncrypted" IS NOT NULL) ORDER BY "cleanupAfter" ASC LIMIT $1)`, limit
  );
  return { rawRedacted, piiRedacted, receiptsRedacted };
}
