import 'server-only';

import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import { createMetaAssetContext, type MetaAssetBinding, type MetaPlatformEnvironment } from '../context/asset-context';
import {
  prismaMetaProviderIdentities,
  prismaMetaProviderIdentityRelationships,
} from './prisma-provider-identities';
import {
  META_LEAD_FINGERPRINT_VERSION,
  buildMetaLeadHandoffIdempotencyKey,
  sanitizeMetaLeadFailure,
  type MetaLeadDuplicateReason,
  type MetaLeadHandoffDestination,
  type MetaLeadRetrievalStatus,
} from './leads';
import type { MetaLeadField, MetaLeadGraphPayload, NormalizedMetaLead } from '@/lib/meta/leads/types';

export type MetaLeadIdentityContext = Readonly<{
  pageIdentityReferenceId: string;
  formIdentityReferenceId: string | null;
}>;

export type PersistNormalizedMetaLeadStorageResult = Readonly<{
  leadId: string;
  leadgenId: string;
  created: boolean;
  duplicate: boolean;
  duplicateReason?: MetaLeadDuplicateReason;
  canonicalLeadId: string;
  processingAttemptId: string;
  handoffId: string;
  handoffIdempotencyKey: string;
}>;

type AttemptRow = {
  id: string;
  receiptId: string;
  providerLeadId: string;
  environment: MetaPlatformEnvironment;
  connectionKey: string;
  retrievalStatus: MetaLeadRetrievalStatus;
  retrievalAttempt: number;
  normalizedLeadId: string | null;
};

type LeadCandidate = {
  id: string;
  leadgenId: string;
  environment: MetaPlatformEnvironment | null;
  connectionKey: string | null;
  normalizedPhoneHash: string | null;
  normalizedEmailHash: string | null;
  phoneFingerprint: string | null;
  emailFingerprint: string | null;
};

function requiredText(value: unknown, code: string, max = 255): string {
  if (typeof value !== 'string') throw new TypeError(code);
  const clean = value.trim();
  if (!clean || clean.length > max) throw new TypeError(code);
  return clean;
}

function safeFields(fields: readonly MetaLeadField[]) {
  return fields.map((field) => ({ name: field.name.slice(0, 120), valueCount: Math.max(0, Math.min(field.values.length, 20)) }));
}

function safeNormalized(normalized: NormalizedMetaLead) {
  return {
    city: normalized.city?.slice(0, 500),
    area: normalized.area?.slice(0, 500),
    country: normalized.country?.slice(0, 500),
    productInterest: normalized.productInterest?.slice(0, 1_000),
    customFields: Object.entries(normalized.customFields).slice(0, 100).map(([name, values]) => ({ name: name.slice(0, 120), valueCount: Math.min(values.length, 20) })),
  };
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function isTestLead(payload: MetaLeadGraphPayload): boolean | null {
  const value = (payload as MetaLeadGraphPayload & { is_test_lead?: unknown }).is_test_lead;
  return typeof value === 'boolean' ? value : null;
}

export async function ensureMetaLeadStorageIdentities(input: {
  readonly receiptId: string;
  readonly receiptPrimaryIdentityReferenceId?: string | null;
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly pageId: string;
  readonly formId?: string | null;
  readonly pageConfigured: boolean;
  readonly formAllowlisted: boolean;
}): Promise<MetaLeadIdentityContext> {
  const assets: MetaAssetBinding[] = [{ type: 'PAGE', id: input.pageId }];
  if (input.formId) assets.push({ type: 'LEAD_FORM', id: input.formId });
  const context = createMetaAssetContext({ environment: input.environment, connectionKey: input.connectionKey, assets });
  const now = new Date();
  const page = await prismaMetaProviderIdentities.register({
    context,
    assetType: 'PAGE',
    providerId: input.pageId,
    identityStatus: input.pageConfigured ? 'ACTIVE' : 'UNVERIFIED',
    permissionHealth: 'UNKNOWN',
    source: 'RUNTIME',
    seenAt: now,
    ...(input.pageConfigured ? { verifiedAt: now, statusReason: 'CONFIGURED_PAGE_MATCH' } : {}),
    metadata: { providerObjectType: 'page' },
  });
  let formId: string | null = null;
  if (input.formId) {
    const form = await prismaMetaProviderIdentities.register({
      context,
      assetType: 'LEAD_FORM',
      providerId: input.formId,
      identityStatus: input.formAllowlisted ? 'ACTIVE' : 'UNVERIFIED',
      permissionHealth: 'UNKNOWN',
      source: 'RUNTIME',
      seenAt: now,
      ...(input.formAllowlisted ? { verifiedAt: now, statusReason: 'CONFIGURED_FORM_MATCH' } : {}),
      metadata: { providerObjectType: 'lead_form' },
    });
    await prismaMetaProviderIdentityRelationships.link({
      relationshipType: 'PAGE_CONTAINS_LEAD_FORM',
      parentIdentityId: page.id,
      childIdentityId: form.id,
      status: input.formAllowlisted ? 'ACTIVE' : 'UNVERIFIED',
      source: 'RUNTIME',
      ...(input.formAllowlisted ? { verifiedAt: now } : {}),
    });
    formId = form.id;
  }
  if (input.receiptPrimaryIdentityReferenceId) {
    const allowed = new Set([page.id, formId].filter((value): value is string => Boolean(value)));
    if (!allowed.has(input.receiptPrimaryIdentityReferenceId)) throw new Error('META_LEAD_RECEIPT_IDENTITY_MISMATCH');
  }
  return Object.freeze({ pageIdentityReferenceId: page.id, formIdentityReferenceId: formId });
}

export async function beginMetaLeadProcessingAttempt(input: {
  readonly receiptId: string;
  readonly providerLeadId: string;
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly pageId?: string | null;
  readonly formId?: string | null;
  readonly pageIdentityReferenceId?: string | null;
  readonly formIdentityReferenceId?: string | null;
}): Promise<AttemptRow> {
  const id = crypto.randomUUID();
  const rows = await prisma.$queryRawUnsafe<AttemptRow[]>(
    `INSERT INTO "MetaLeadProcessingAttempt" (
       "id","receiptId","providerLeadId","provider","environment","connectionKey","pageId","formId",
       "pageIdentityReferenceId","formIdentityReferenceId","retrievalStatus","retrievalAttempt","createdAt","updatedAt"
     )
     SELECT $1,$2,$3,'META'::"MetaSocialWebhookProvider",$4::"MetaPlatformEnvironment",$5,$6,$7,$8,$9,
            'PENDING'::"MetaLeadRetrievalStatus",0,NOW(),NOW()
     WHERE EXISTS (
       SELECT 1 FROM "MetaSocialWebhookReceipt"
       WHERE "id"=$2 AND "platform"='LEAD_ADS'::"MetaSocialWebhookPlatform"
         AND "environment"=$4::"MetaPlatformEnvironment" AND "connectionKey"=$5
     )
     ON CONFLICT ("receiptId") DO UPDATE SET "updatedAt"=NOW()
     WHERE "MetaLeadProcessingAttempt"."providerLeadId"=EXCLUDED."providerLeadId"
       AND "MetaLeadProcessingAttempt"."environment"=EXCLUDED."environment"
       AND "MetaLeadProcessingAttempt"."connectionKey"=EXCLUDED."connectionKey"
     RETURNING "id","receiptId","providerLeadId","environment","connectionKey","retrievalStatus","retrievalAttempt","normalizedLeadId"`,
    id, requiredText(input.receiptId, 'META_LEAD_RECEIPT_ID_INVALID'), requiredText(input.providerLeadId, 'META_LEAD_PROVIDER_ID_INVALID'),
    input.environment, requiredText(input.connectionKey, 'META_LEAD_CONNECTION_KEY_INVALID', 80), input.pageId ?? null, input.formId ?? null,
    input.pageIdentityReferenceId ?? null, input.formIdentityReferenceId ?? null,
  );
  if (!rows[0]) throw new Error('META_LEAD_ATTEMPT_RECEIPT_CONFLICT');
  return rows[0];
}

export async function markMetaLeadProcessingAttemptFetching(input: { receiptId: string; now?: Date }): Promise<AttemptRow> {
  const rows = await prisma.$queryRawUnsafe<AttemptRow[]>(
    `UPDATE "MetaLeadProcessingAttempt" SET
       "retrievalStatus"='FETCHING'::"MetaLeadRetrievalStatus",
       "retrievalAttempt"="retrievalAttempt"+1,
       "lastRetrievalAt"=$2,
       "nextRetrievalAt"=NULL,
       "failureCode"=NULL,"failureCategory"=NULL,"failureSummary"=NULL,"updatedAt"=NOW()
     WHERE "receiptId"=$1 AND "retrievalStatus" IN ('PENDING','RETRYING','TOKEN_ERROR')
     RETURNING "id","receiptId","providerLeadId","environment","connectionKey","retrievalStatus","retrievalAttempt","normalizedLeadId"`,
    input.receiptId, input.now ?? new Date(),
  );
  if (!rows[0]) {
    const current = await prisma.$queryRawUnsafe<AttemptRow[]>(
      `SELECT "id","receiptId","providerLeadId","environment","connectionKey","retrievalStatus","retrievalAttempt","normalizedLeadId"
       FROM "MetaLeadProcessingAttempt" WHERE "receiptId"=$1 LIMIT 1`, input.receiptId,
    );
    if (current[0]?.retrievalStatus === 'FETCHED') return current[0];
    throw new Error(current[0] ? 'META_LEAD_RETRIEVAL_TRANSITION_INVALID' : 'META_LEAD_ATTEMPT_NOT_FOUND');
  }
  return rows[0];
}

export async function markMetaLeadProcessingAttemptFailed(input: {
  readonly receiptId: string;
  readonly retrievalStatus: Exclude<MetaLeadRetrievalStatus, 'PENDING' | 'FETCHING' | 'FETCHED'>;
  readonly error: unknown;
  readonly nextRetryAt?: Date | null;
}) {
  const safe = sanitizeMetaLeadFailure(input.error);
  const rows = await prisma.$queryRawUnsafe<AttemptRow[]>(
    `UPDATE "MetaLeadProcessingAttempt" SET
       "retrievalStatus"=$2::"MetaLeadRetrievalStatus","nextRetrievalAt"=$3,
       "failureCode"=$4,"failureCategory"=$5,"failureSummary"=$6,"updatedAt"=NOW()
     WHERE "receiptId"=$1 AND "retrievalStatus" <> 'FETCHED'
     RETURNING "id","receiptId","providerLeadId","environment","connectionKey","retrievalStatus","retrievalAttempt","normalizedLeadId"`,
    input.receiptId, input.retrievalStatus, input.nextRetryAt ?? null, safe.code, safe.category, safe.summary,
  );
  if (!rows[0]) throw new Error('META_LEAD_ATTEMPT_NOT_FOUND_OR_TERMINAL');
  return rows[0];
}

export async function createOrGetMetaLeadHandoff(input: {
  readonly tx?: { $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T> };
  readonly leadId: string;
  readonly destination?: MetaLeadHandoffDestination;
}) {
  const executor = input.tx ?? prisma;
  const destination = input.destination ?? 'INTERNAL_CRM';
  const idempotencyKey = buildMetaLeadHandoffIdempotencyKey(input.leadId, destination);
  const id = crypto.randomUUID();
  const rows = await executor.$queryRawUnsafe<Array<{ id: string; idempotencyKey: string }>>(
    `INSERT INTO "MetaLeadHandoff" ("id","leadId","destination","idempotencyKey","status","attemptCount","createdAt","updatedAt")
     VALUES ($1,$2,$3::"MetaLeadHandoffDestination",$4,'PENDING'::"MetaLeadHandoffStatus",0,NOW(),NOW())
     ON CONFLICT ("leadId","destination") DO UPDATE SET "updatedAt"=NOW()
     RETURNING "id","idempotencyKey"`, id, input.leadId, destination, idempotencyKey,
  );
  return rows[0]!;
}

export async function persistNormalizedMetaLeadStorage(input: {
  readonly legacyReceiptId: string;
  readonly canonicalReceiptId: string;
  readonly processingAttemptId: string;
  readonly environment: MetaPlatformEnvironment;
  readonly connectionKey: string;
  readonly pageId: string;
  readonly formId?: string | null;
  readonly pageIdentityReferenceId: string;
  readonly formIdentityReferenceId?: string | null;
  readonly raw: MetaLeadGraphPayload;
  readonly fields: readonly MetaLeadField[];
  readonly normalized: NormalizedMetaLead;
  readonly encryptedRawPayload: string;
  readonly rawPayloadDigest: string;
  readonly phoneFingerprint?: string | null;
  readonly emailFingerprint?: string | null;
  readonly freshnessSeconds?: number;
  readonly retentionUntil: Date;
  readonly handoffDestination?: MetaLeadHandoffDestination;
}): Promise<PersistNormalizedMetaLeadStorageResult> {
  return prisma.$transaction(async (tx) => {
    const attemptRows = await tx.$queryRawUnsafe<AttemptRow[]>(
      `SELECT "id","receiptId","providerLeadId","environment","connectionKey","retrievalStatus","retrievalAttempt","normalizedLeadId"
       FROM "MetaLeadProcessingAttempt" WHERE "id"=$1 AND "receiptId"=$2 FOR UPDATE`,
      input.processingAttemptId, input.canonicalReceiptId,
    );
    const attempt = attemptRows[0];
    if (!attempt) throw new Error('META_LEAD_ATTEMPT_NOT_FOUND');
    if (attempt.providerLeadId !== input.raw.id) throw new Error('META_LEAD_ATTEMPT_PROVIDER_MISMATCH');
    if (attempt.environment !== input.environment || attempt.connectionKey !== input.connectionKey) throw new Error('META_LEAD_ATTEMPT_SCOPE_MISMATCH');
    if (attempt.retrievalStatus === 'FETCHED' && attempt.normalizedLeadId) {
      const handoff = await createOrGetMetaLeadHandoff({ tx, leadId: attempt.normalizedLeadId, destination: input.handoffDestination });
      return Object.freeze({
        leadId: attempt.normalizedLeadId, leadgenId: input.raw.id, created: false, duplicate: true,
        duplicateReason: 'LEADGEN_ID' as const, canonicalLeadId: attempt.normalizedLeadId,
        processingAttemptId: attempt.id, handoffId: handoff.id, handoffIdempotencyKey: handoff.idempotencyKey,
      });
    }
    if (attempt.retrievalStatus !== 'FETCHING') throw new Error('META_LEAD_RETRIEVAL_TRANSITION_INVALID');

    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `meta-lead-provider:${input.raw.id}`);
    if (input.phoneFingerprint) await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `meta-lead-phone:${input.phoneFingerprint}`);
    if (input.emailFingerprint) await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `meta-lead-email:${input.emailFingerprint}`);

    const candidates = await tx.$queryRawUnsafe<LeadCandidate[]>(
      `SELECT "id","leadgenId","environment","connectionKey","normalizedPhoneHash","normalizedEmailHash","phoneFingerprint","emailFingerprint"
       FROM "MetaLead"
       WHERE "leadgenId"=$1
          OR ($2::text IS NOT NULL AND "phoneFingerprint"=$2)
          OR ($3::text IS NOT NULL AND "emailFingerprint"=$3)
          OR ($4::text IS NOT NULL AND "normalizedPhoneHash"=$4 AND ("environment" IS NULL OR ("environment"=$6::"MetaPlatformEnvironment" AND "connectionKey"=$7)))
          OR ($5::text IS NOT NULL AND "normalizedEmailHash"=$5 AND ("environment" IS NULL OR ("environment"=$6::"MetaPlatformEnvironment" AND "connectionKey"=$7)))
       ORDER BY CASE WHEN "leadgenId"=$1 THEN 0 WHEN "phoneFingerprint"=$2 THEN 1 WHEN "emailFingerprint"=$3 THEN 2 WHEN "normalizedPhoneHash"=$4 THEN 3 ELSE 4 END,
                "createdAt" ASC
       LIMIT 20`,
      input.raw.id, input.phoneFingerprint ?? null, input.emailFingerprint ?? null,
      input.normalized.phoneHash ?? null, input.normalized.emailHash ?? null, input.environment, input.connectionKey,
    );
    const byProvider = candidates.find((row) => row.leadgenId === input.raw.id);
    const byPhone = input.phoneFingerprint
      ? candidates.find((row) => row.phoneFingerprint === input.phoneFingerprint)
      : input.normalized.phoneHash ? candidates.find((row) => row.normalizedPhoneHash === input.normalized.phoneHash) : undefined;
    const byEmail = input.emailFingerprint
      ? candidates.find((row) => row.emailFingerprint === input.emailFingerprint)
      : input.normalized.emailHash ? candidates.find((row) => row.normalizedEmailHash === input.normalized.emailHash) : undefined;
    const duplicateReason: MetaLeadDuplicateReason | undefined = byProvider ? 'LEADGEN_ID' : byPhone ? 'PHONE' : byEmail ? 'EMAIL' : undefined;
    const duplicateCandidate = byProvider ?? byPhone ?? byEmail;
    if (byProvider?.environment && (byProvider.environment !== input.environment || byProvider.connectionKey !== input.connectionKey)) {
      throw new Error('META_LEAD_PROVIDER_SCOPE_CONFLICT');
    }

    let leadId = duplicateCandidate?.id ?? crypto.randomUUID();
    let created = !duplicateCandidate;
    if (!duplicateCandidate || duplicateReason === 'LEADGEN_ID') {
      const sourceCreatedAt = parseDate(input.raw.created_time);
      const rows = await tx.$queryRawUnsafe<Array<{ id: string; inserted: boolean }>>(
        `INSERT INTO "MetaLead" (
          "id","leadgenId","provider","environment","connectionKey","pageIdentityReferenceId","formIdentityReferenceId",
          "formId","pageId","adId","adName","adsetId","adsetName","campaignId","campaignName","isOrganic","platform","partnerName","retailerItemId",
          "rawFields","rawPayloadEncrypted","rawPayloadDigest","normalizedData","normalizedPhoneHash","normalizedEmailHash",
          "phoneFingerprint","emailFingerprint","fingerprintVersion","phoneMasked","emailMasked","fullName","city","area","productInterest","isTestLead",
          "status","retrievalStatus","receivedAt","sourceCreatedAt","freshnessSeconds","fetchedAt","retentionUntil","createdAt","updatedAt"
        ) VALUES (
          $1,$2,'META'::"MetaSocialWebhookProvider",$3::"MetaPlatformEnvironment",$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
          CAST($19 AS JSONB),$20,$21,CAST($22 AS JSONB),$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,
          'NEW'::"MetaLeadStatus",'FETCHED'::"MetaLeadRetrievalStatus",NOW(),$35,$36,NOW(),$37,NOW(),NOW()
        )
        ON CONFLICT ("leadgenId") DO UPDATE SET
          "environment"=COALESCE("MetaLead"."environment",EXCLUDED."environment"),
          "connectionKey"=COALESCE("MetaLead"."connectionKey",EXCLUDED."connectionKey"),
          "pageIdentityReferenceId"=COALESCE(EXCLUDED."pageIdentityReferenceId","MetaLead"."pageIdentityReferenceId"),
          "formIdentityReferenceId"=COALESCE(EXCLUDED."formIdentityReferenceId","MetaLead"."formIdentityReferenceId"),
          "formId"=COALESCE(EXCLUDED."formId","MetaLead"."formId"),"pageId"=COALESCE(EXCLUDED."pageId","MetaLead"."pageId"),
          "adId"=COALESCE(EXCLUDED."adId","MetaLead"."adId"),"adName"=COALESCE(EXCLUDED."adName","MetaLead"."adName"),
          "adsetId"=COALESCE(EXCLUDED."adsetId","MetaLead"."adsetId"),"adsetName"=COALESCE(EXCLUDED."adsetName","MetaLead"."adsetName"),
          "campaignId"=COALESCE(EXCLUDED."campaignId","MetaLead"."campaignId"),"campaignName"=COALESCE(EXCLUDED."campaignName","MetaLead"."campaignName"),
          "isOrganic"=EXCLUDED."isOrganic","platform"=EXCLUDED."platform","partnerName"=EXCLUDED."partnerName","retailerItemId"=EXCLUDED."retailerItemId",
          "rawFields"=EXCLUDED."rawFields","rawPayloadEncrypted"=EXCLUDED."rawPayloadEncrypted","rawPayloadDigest"=EXCLUDED."rawPayloadDigest",
          "normalizedData"=EXCLUDED."normalizedData","normalizedPhoneHash"=EXCLUDED."normalizedPhoneHash","normalizedEmailHash"=EXCLUDED."normalizedEmailHash",
          "phoneFingerprint"=EXCLUDED."phoneFingerprint","emailFingerprint"=EXCLUDED."emailFingerprint","fingerprintVersion"=EXCLUDED."fingerprintVersion",
          "phoneMasked"=EXCLUDED."phoneMasked","emailMasked"=EXCLUDED."emailMasked","fullName"=EXCLUDED."fullName","city"=EXCLUDED."city",
          "area"=EXCLUDED."area","productInterest"=EXCLUDED."productInterest","isTestLead"=COALESCE(EXCLUDED."isTestLead","MetaLead"."isTestLead"),
          "retrievalStatus"='FETCHED',"sourceCreatedAt"=COALESCE(EXCLUDED."sourceCreatedAt","MetaLead"."sourceCreatedAt"),
          "freshnessSeconds"=EXCLUDED."freshnessSeconds","fetchedAt"=NOW(),"lastError"=NULL,
          "retentionUntil"=GREATEST("MetaLead"."retentionUntil",EXCLUDED."retentionUntil"),"updatedAt"=NOW()
        RETURNING "id", (xmax = 0) AS inserted`,
        leadId, input.raw.id, input.environment, input.connectionKey, input.pageIdentityReferenceId, input.formIdentityReferenceId ?? null,
        input.raw.form_id ?? input.formId ?? null, input.pageId, input.raw.ad_id ?? null, input.raw.ad_name ?? null,
        input.raw.adset_id ?? null, input.raw.adset_name ?? null, input.raw.campaign_id ?? null, input.raw.campaign_name ?? null,
        input.raw.is_organic ?? null, input.raw.platform ?? null, input.raw.partner_name ?? null, input.raw.retailer_item_id ?? null,
        JSON.stringify(safeFields(input.fields)), input.encryptedRawPayload, input.rawPayloadDigest, JSON.stringify(safeNormalized(input.normalized)),
        input.normalized.phoneHash ?? null, input.normalized.emailHash ?? null, input.phoneFingerprint ?? null, input.emailFingerprint ?? null,
        input.phoneFingerprint || input.emailFingerprint ? META_LEAD_FINGERPRINT_VERSION : null,
        input.normalized.phoneMasked ?? null, input.normalized.emailMasked ?? null, input.normalized.fullName ?? null,
        input.normalized.city ?? null, input.normalized.area ?? null, input.normalized.productInterest ?? null, isTestLead(input.raw),
        sourceCreatedAt, input.freshnessSeconds ?? null, input.retentionUntil,
      );
      leadId = rows[0]?.id ?? leadId;
      created = Boolean(rows[0]?.inserted);
    } else {
      const matched = duplicateReason === 'PHONE'
        ? input.phoneFingerprint ?? input.normalized.phoneHash ?? null
        : input.emailFingerprint ?? input.normalized.emailHash ?? null;
      const duplicateRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO "MetaLeadDuplicate" ("id","sourceLeadgenId","canonicalLeadId","reason","matchedValueHash","receiptId","canonicalReceiptId","createdAt")
         VALUES ($1,$2,$3,$4::"MetaLeadDuplicateReason",$5,$6,$7,NOW())
         ON CONFLICT ("sourceLeadgenId") DO UPDATE SET
           "receiptId"=EXCLUDED."receiptId","canonicalReceiptId"=EXCLUDED."canonicalReceiptId"
         WHERE "MetaLeadDuplicate"."canonicalLeadId"=EXCLUDED."canonicalLeadId" AND "MetaLeadDuplicate"."reason"=EXCLUDED."reason"
         RETURNING "id"`,
        crypto.randomUUID(), input.raw.id, leadId, duplicateReason, matched, input.legacyReceiptId, input.canonicalReceiptId,
      );
      if (!duplicateRows[0]) throw new Error('META_LEAD_DUPLICATE_MAPPING_CONFLICT');
    }

    const receiptRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `UPDATE "MetaSocialWebhookReceipt" SET "normalizedLeadId"=$2,
         "replaySourceType"='NORMALIZED_LEAD'::"MetaSocialWebhookReplaySourceType",
         "replaySourceId"=$2,
         "replaySourceExpiresAt"=(SELECT "retentionUntil" FROM "MetaLead" WHERE "id"=$2),
         "replayEligibility"=CASE WHEN "state"='DEAD_LETTERED'::"MetaSocialWebhookReceiptState" THEN 'APPROVAL_REQUIRED'::"MetaSocialWebhookReplayEligibility" ELSE "replayEligibility" END,
         "updatedAt"=NOW()
       WHERE "id"=$1 AND "platform"='LEAD_ADS'::"MetaSocialWebhookPlatform"
         AND ("normalizedLeadId" IS NULL OR "normalizedLeadId"=$2)
       RETURNING "id"`, input.canonicalReceiptId, leadId,
    );
    if (!receiptRows[0]) throw new Error('META_LEAD_RECEIPT_LINK_CONFLICT');

    const attemptUpdated = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `UPDATE "MetaLeadProcessingAttempt" SET
        "pageId"=$2,"formId"=$3,"pageIdentityReferenceId"=$4,"formIdentityReferenceId"=$5,
        "retrievalStatus"='FETCHED'::"MetaLeadRetrievalStatus","nextRetrievalAt"=NULL,
        "normalizedLeadId"=$6,"duplicateReason"=$7::"MetaLeadDuplicateReason","isTestLead"=$8,
        "failureCode"=NULL,"failureCategory"=NULL,"failureSummary"=NULL,"updatedAt"=NOW()
       WHERE "id"=$1 AND ("normalizedLeadId" IS NULL OR "normalizedLeadId"=$6)
       RETURNING "id"`,
      input.processingAttemptId, input.pageId, input.formId ?? null, input.pageIdentityReferenceId,
      input.formIdentityReferenceId ?? null, leadId, duplicateReason ?? null, isTestLead(input.raw),
    );
    if (!attemptUpdated[0]) throw new Error('META_LEAD_ATTEMPT_LINK_CONFLICT');

    const handoff = await createOrGetMetaLeadHandoff({ tx, leadId, destination: input.handoffDestination });
    return Object.freeze({
      leadId, leadgenId: input.raw.id, created, duplicate: Boolean(duplicateReason), duplicateReason,
      canonicalLeadId: leadId, processingAttemptId: input.processingAttemptId,
      handoffId: handoff.id, handoffIdempotencyKey: handoff.idempotencyKey,
    });
  });
}

export type MetaLeadHandoffExecutionRow = Readonly<{
  id: string;
  leadId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
  attemptCount: number;
}>;

export async function claimMetaLeadHandoff(input: {
  readonly handoffId: string;
  readonly now?: Date;
}): Promise<MetaLeadHandoffExecutionRow> {
  const rows = await prisma.$queryRawUnsafe<MetaLeadHandoffExecutionRow[]>(
    `WITH locked AS (
       SELECT "id" FROM "MetaLeadHandoff" WHERE "id"=$1 FOR UPDATE
     ), updated AS (
       UPDATE "MetaLeadHandoff" SET
         "status"='PROCESSING'::"MetaLeadHandoffStatus",
         "attemptCount"="attemptCount"+1,
         "lastAttemptAt"=$2,
         "nextRetryAt"=NULL,
         "failureCode"=NULL,
         "failureSummary"=NULL,
         "updatedAt"=NOW()
       WHERE "id" IN (SELECT "id" FROM locked)
         AND "status" IN ('PENDING'::"MetaLeadHandoffStatus",'FAILED'::"MetaLeadHandoffStatus")
         AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= $2)
       RETURNING "id","leadId","status","attemptCount"
     )
     SELECT "id","leadId","status","attemptCount" FROM updated
     UNION ALL
     SELECT h."id",h."leadId",h."status",h."attemptCount"
       FROM "MetaLeadHandoff" h
       WHERE h."id"=$1 AND h."status" IN ('COMPLETED'::"MetaLeadHandoffStatus",'BLOCKED'::"MetaLeadHandoffStatus")
         AND NOT EXISTS (SELECT 1 FROM updated)`,
    input.handoffId,
    input.now ?? new Date(),
  );
  if (!rows[0]) throw Object.assign(new Error('META_LEAD_HANDOFF_BUSY_OR_NOT_READY'), { code: 'META_LEAD_HANDOFF_BUSY_OR_NOT_READY', retryable: true });
  return rows[0];
}

export async function completeMetaLeadHandoff(input: {
  readonly handoffId: string;
  readonly targetType?: string;
  readonly targetId?: string;
}): Promise<void> {
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE "MetaLeadHandoff" SET
       "status"='COMPLETED'::"MetaLeadHandoffStatus",
       "targetType"=COALESCE($2,"targetType"),
       "targetId"=COALESCE($3,"targetId"),
       "completedAt"=COALESCE("completedAt",NOW()),
       "nextRetryAt"=NULL,
       "failureCode"=NULL,
       "failureSummary"=NULL,
       "updatedAt"=NOW()
     WHERE "id"=$1 AND "status" IN ('PROCESSING'::"MetaLeadHandoffStatus",'COMPLETED'::"MetaLeadHandoffStatus")`,
    input.handoffId,
    input.targetType ?? null,
    input.targetId ?? null,
  );
  if (!updated) throw new Error('META_LEAD_HANDOFF_COMPLETE_CONFLICT');
}

export async function failMetaLeadHandoff(input: {
  readonly handoffId: string;
  readonly failureCode: string;
  readonly failureSummary: string;
  readonly terminal: boolean;
  readonly now?: Date;
}): Promise<void> {
  const safe = sanitizeMetaLeadFailure({ code: input.failureCode, summary: input.failureSummary });
  const now = input.now ?? new Date();
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE "MetaLeadHandoff" SET
       "status"=CASE WHEN $2 THEN 'BLOCKED'::"MetaLeadHandoffStatus" ELSE 'FAILED'::"MetaLeadHandoffStatus" END,
       "failureCode"=$3,
       "failureSummary"=$4,
       "nextRetryAt"=CASE WHEN $2 THEN NULL ELSE $5 + INTERVAL '5 minutes' END,
       "updatedAt"=NOW()
     WHERE "id"=$1 AND "status"='PROCESSING'::"MetaLeadHandoffStatus"`,
    input.handoffId,
    input.terminal,
    safe.code,
    safe.summary,
    now,
  );
  if (!updated) throw new Error('META_LEAD_HANDOFF_FAILURE_CONFLICT');
}

export async function blockMetaLeadHandoff(input: {
  readonly handoffId: string;
  readonly reasonCode: string;
  readonly reasonSummary: string;
}): Promise<void> {
  const safe = sanitizeMetaLeadFailure({ code: input.reasonCode, summary: input.reasonSummary });
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE "MetaLeadHandoff" SET
       "status"='BLOCKED'::"MetaLeadHandoffStatus",
       "failureCode"=$2,
       "failureSummary"=$3,
       "nextRetryAt"=NULL,
       "updatedAt"=NOW()
     WHERE "id"=$1 AND "status" <> 'COMPLETED'::"MetaLeadHandoffStatus"`,
    input.handoffId,
    safe.code,
    safe.summary,
  );
  if (!updated) throw new Error('META_LEAD_HANDOFF_BLOCK_CONFLICT');
}

export async function cleanupMetaTestLeadsStorage(input: {
  readonly olderThan?: Date;
  readonly limit?: number;
} = {}): Promise<Readonly<{ cleaned: number }>> {
  const olderThan = input.olderThan ?? new Date(Date.now() - 7 * 86_400_000);
  const limit = Math.max(1, Math.min(input.limit ?? 250, 1_000));
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `WITH candidates AS (
       SELECT l."id" FROM "MetaLead" l
       WHERE l."isTestLead"=true AND l."receivedAt" < $1
         AND l."convertedOrderId" IS NULL
       ORDER BY l."receivedAt" ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED
     )
     UPDATE "MetaLead" l SET
       "rawFields"='[]'::jsonb,
       "rawPayloadEncrypted"=NULL,
       "normalizedData"='{"testLeadCleaned":true}'::jsonb,
       "normalizedPhoneHash"=NULL,
       "normalizedEmailHash"=NULL,
       "phoneFingerprint"=NULL,
       "emailFingerprint"=NULL,
       "phoneMasked"=NULL,
       "emailMasked"=NULL,
       "fullName"='Phase31 Test Lead (cleaned)',
       "city"=NULL,
       "area"=NULL,
       "productInterest"=NULL,
       "status"='LOST'::"MetaLeadStatus",
       "lastError"=NULL,
       "updatedAt"=NOW()
     WHERE l."id" IN (SELECT "id" FROM candidates)
     RETURNING l."id"`,
    olderThan,
    limit,
  );
  return Object.freeze({ cleaned: rows.length });
}
