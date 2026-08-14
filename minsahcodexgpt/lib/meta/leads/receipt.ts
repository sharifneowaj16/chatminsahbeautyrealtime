import 'server-only';
import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import {
  createOrGetMetaSocialWebhookReceipt,
  linkMetaSocialWebhookLegacyReceipt,
} from '@/lib/meta-platform/repositories/prisma-webhook-receipts';
import { persistMetaLeadWebhookProviderIdentity } from '@/lib/meta-platform/repositories/webhook-provider-identities';
import {
  resolveMetaPlatformEnvironment,
  resolveMetaSocialConnectionKey,
} from '@/lib/meta-platform/repositories/webhook-receipts';
import { encryptMetaLeadPayload } from './crypto';
import { getMetaLeadConfig, requireMetaLeadEncryptionSecret } from './config';
import type { MetaLeadNotification, MetaWebhookProcessingStatus } from './types';

export type MetaWebhookReceiptRow = {
  id: string;
  eventKey: string;
  correlationId: string;
  leadgenId: string | null;
  pageId: string | null;
  formId: string | null;
  status: MetaWebhookProcessingStatus;
  attemptCount: number;
  receivedAt: Date;
  processedAt: Date | null;
};

function safeError(error: unknown) {
  const candidate = error as { code?: unknown; message?: unknown; httpStatus?: unknown };
  return {
    code: typeof candidate?.code === 'string' || typeof candidate?.code === 'number' ? String(candidate.code) : 'META_LEAD_WEBHOOK_ERROR',
    message: typeof candidate?.message === 'string' ? candidate.message.replace(/EA[A-Za-z0-9_-]{20,}/g, '[REDACTED]').slice(0, 500) : 'Webhook processing failed',
    httpStatus: typeof candidate?.httpStatus === 'number' ? candidate.httpStatus : undefined,
  };
}

export async function createVerifiedMetaWebhookReceipt(input: {
  notification: MetaLeadNotification;
  rawPayload: unknown;
}) {
  const config = getMetaLeadConfig();
  const id = crypto.randomUUID();
  const correlationId = `meta-webhook:${input.notification.payloadDigest.slice(0, 24)}`;
  const environment = resolveMetaPlatformEnvironment();
  const connectionKey = resolveMetaSocialConnectionKey();
  const canonical = await createOrGetMetaSocialWebhookReceipt({
    platform: 'LEAD_ADS',
    environment,
    connectionKey,
    providerDeliveryId: input.notification.leadgenId,
    providerEventKey: input.notification.eventKey,
    payloadDigest: input.notification.payloadDigest,
    correlationId,
    safeMetadata: {
      objectType: input.notification.objectType,
      eventType: 'LEADGEN',
      eventKind: 'LEADGEN',
      routingTarget: 'LEAD_ADS',
      pageId: input.notification.pageId,
      formId: input.notification.formId ?? null,
      leadgenId: input.notification.leadgenId,
      providerTimestamp: input.notification.createdTime ?? null,
      signatureOk: true,
    },
  });
  await persistMetaLeadWebhookProviderIdentity({
    receiptId: canonical.receipt.id,
    environment,
    connectionKey,
    pageId: input.notification.pageId,
    formId: input.notification.formId,
    pageConfigured: Boolean(config.pageId && config.pageId === input.notification.pageId),
    formAllowlisted: Boolean(input.notification.formId && config.allowedFormIds.has(input.notification.formId)),
  });
  const encrypted = encryptMetaLeadPayload(input.rawPayload, requireMetaLeadEncryptionSecret());
  const cleanupAfter = new Date(Date.now() + config.webhookRetentionDays * 86_400_000);
  const safePayload = JSON.stringify({
    object: input.notification.objectType,
    pageId: input.notification.pageId,
    leadgenId: input.notification.leadgenId,
    formId: input.notification.formId ?? null,
    adId: input.notification.adId ?? null,
    createdTime: input.notification.createdTime ?? null,
    payloadDigest: input.notification.payloadDigest,
  });
  const rows = await prisma.$queryRawUnsafe<MetaWebhookReceiptRow[]>(
    `INSERT INTO "MetaWebhookReceipt"
      ("id","objectType","externalId","eventKey","correlationId","signatureOk","payload","payloadDigest","payloadEncrypted","pageId","formId","leadgenId","status","verifiedAt","cleanupAfter","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,true,CAST($6 AS JSONB),$7,$8,$9,$10,$11,'VERIFIED'::"MetaWebhookProcessingStatus",NOW(),$12,NOW(),NOW())
     ON CONFLICT ("eventKey") DO UPDATE SET "updatedAt"=NOW()
     RETURNING "id","eventKey","correlationId","leadgenId","pageId","formId","status","attemptCount","receivedAt","processedAt"`,
    id, input.notification.objectType, input.notification.leadgenId, input.notification.eventKey, correlationId, safePayload,
    input.notification.payloadDigest, encrypted, input.notification.pageId, input.notification.formId ?? null,
    input.notification.leadgenId, cleanupAfter
  );
  const receipt = rows[0]!;
  const canonicalReceipt = await linkMetaSocialWebhookLegacyReceipt({
    receiptId: canonical.receipt.id,
    legacyReceiptType: 'MetaWebhookReceipt',
    legacyReceiptId: receipt.id,
  });
  return { receipt, created: rows[0]?.id === id, canonicalReceipt };
}

export async function recordRejectedMetaWebhook(input: {
  payloadDigest: string;
  code: string;
  pageId?: string;
  leadgenId?: string;
}) {
  const id = crypto.randomUUID();
  const correlationId = `meta-webhook:${input.payloadDigest.slice(0, 24)}`;
  const eventKey = `rejected:${input.payloadDigest}:${input.leadgenId ?? 'unknown'}:${input.code}`;
  const canonical = await createOrGetMetaSocialWebhookReceipt({
    platform: 'LEAD_ADS',
    environment: resolveMetaPlatformEnvironment(),
    connectionKey: resolveMetaSocialConnectionKey(),
    providerDeliveryId: input.leadgenId ?? null,
    providerEventKey: eventKey,
    payloadDigest: input.payloadDigest,
    correlationId,
    initialState: 'BLOCKED',
    safeMetadata: {
      objectType: 'page',
      eventType: 'REJECTED',
      routingTarget: 'LEAD_ADS',
      pageId: input.pageId ?? null,
      leadgenId: input.leadgenId ?? null,
      signatureOk: false,
      rejectionCode: input.code,
    },
  });
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; eventKey: string; correlationId: string }>>(
    `INSERT INTO "MetaWebhookReceipt"
      ("id","objectType","externalId","eventKey","correlationId","signatureOk","payload","payloadDigest","pageId","leadgenId","status","error","cleanupAfter","createdAt","updatedAt")
     VALUES ($1,'page',$2,$3,$4,false,CAST($5 AS JSONB),$6,$7,$8,'REJECTED'::"MetaWebhookProcessingStatus",CAST($9 AS JSONB),NOW()+INTERVAL '30 days',NOW(),NOW())
     ON CONFLICT ("eventKey") DO UPDATE SET "updatedAt"=NOW()
     RETURNING "id","eventKey","correlationId"`,
    id, input.leadgenId ?? null, eventKey, correlationId, JSON.stringify({ pageId: input.pageId ?? null, leadgenId: input.leadgenId ?? null }),
    input.payloadDigest, input.pageId ?? null, input.leadgenId ?? null, JSON.stringify({ code: input.code })
  );
  const receipt = rows[0]!;
  const canonicalReceipt = await linkMetaSocialWebhookLegacyReceipt({
    receiptId: canonical.receipt.id,
    legacyReceiptType: 'MetaWebhookReceipt',
    legacyReceiptId: receipt.id,
  });
  return { ...receipt, created: rows[0]?.id === id, canonicalReceipt };
}

export async function markMetaWebhookReceipt(input: {
  receiptId: string;
  status: MetaWebhookProcessingStatus;
  error?: unknown;
  incrementAttempt?: boolean;
}) {
  const error = input.error === undefined ? null : JSON.stringify(safeError(input.error));
  await prisma.$executeRawUnsafe(
    `UPDATE "MetaWebhookReceipt" SET
      "status"=$2::"MetaWebhookProcessingStatus",
      "attemptCount"="attemptCount" + CASE WHEN $3::boolean THEN 1 ELSE 0 END,
      "lastAttemptAt"=CASE WHEN $3::boolean THEN NOW() ELSE "lastAttemptAt" END,
      "queuedAt"=CASE WHEN $2='QUEUED' THEN COALESCE("queuedAt",NOW()) ELSE "queuedAt" END,
      "processedAt"=CASE WHEN $2='PROCESSED' THEN NOW() ELSE "processedAt" END,
      "error"=CASE WHEN $4::text IS NULL THEN NULL ELSE CAST($4 AS JSONB) END,
      "updatedAt"=NOW()
     WHERE "id"=$1`,
    input.receiptId, input.status, Boolean(input.incrementAttempt), error
  );
}

export async function getMetaWebhookReceipt(receiptId: string) {
  const rows = await prisma.$queryRawUnsafe<MetaWebhookReceiptRow[]>(
    `SELECT "id","eventKey","correlationId","leadgenId","pageId","formId","status","attemptCount","receivedAt","processedAt"
     FROM "MetaWebhookReceipt" WHERE "id"=$1 LIMIT 1`, receiptId
  );
  return rows[0] ?? null;
}

export async function listRecoverableMetaLeadReceipts(limit = 100) {
  return prisma.$queryRawUnsafe<MetaWebhookReceiptRow[]>(
    `SELECT "id","eventKey","correlationId","leadgenId","pageId","formId","status","attemptCount","receivedAt","processedAt"
     FROM "MetaWebhookReceipt"
     WHERE "status" IN ('VERIFIED','FAILED') AND "leadgenId" IS NOT NULL AND "attemptCount" < 5
       AND ("lastAttemptAt" IS NULL OR "lastAttemptAt" < NOW() - INTERVAL '5 minutes')
     ORDER BY "receivedAt" ASC LIMIT $1`, Math.max(1, Math.min(limit, 500))
  );
}
