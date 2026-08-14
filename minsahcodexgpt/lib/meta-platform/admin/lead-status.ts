import 'server-only';

import prisma from '@/lib/prisma';
import {
  projectMetaAdminFailure,
  projectMetaAdminProviderId,
  safeMetaAdminCode,
  safeMetaAdminText,
  toMetaAdminIso,
} from './contracts';

type Delegate = { findFirst(args: unknown): Promise<unknown>; findMany(args: unknown): Promise<unknown> };
type Db = {
  metaSocialWebhookReceipt: Delegate;
  metaLeadProcessingAttempt: Delegate;
  metaLeadHandoff: Delegate;
  metaLeadDuplicate: Delegate;
};
const db = prisma as unknown as Db;

function row(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export async function getMetaLeadAdminTrace(leadId: string) {
  const [receiptValue, attemptsValue, handoffsValue, duplicatesValue] = await Promise.all([
    db.metaSocialWebhookReceipt.findFirst({
      where: { normalizedLeadId: leadId, platform: 'LEAD_ADS' },
      orderBy: { receivedAt: 'desc' },
      select: {
        id: true, state: true, receivedAt: true, firstSeenAt: true, lastSeenAt: true, duplicateCount: true,
        attemptCount: true, lastAttemptAt: true, nextRetryAt: true, processedAt: true, failedAt: true,
        deadLetteredAt: true, failureCode: true, failureCategory: true, failureSummary: true,
        correlationId: true, replayAttempt: true, replayEligibility: true, replayRequestedAt: true, replayCompletedAt: true,
        primaryIdentityReference: { select: { objectType: true, providerId: true, identityStatus: true, permissionHealth: true, lastVerifiedAt: true, revokedAt: true } },
      },
    }),
    db.metaLeadProcessingAttempt.findMany({
      where: { normalizedLeadId: leadId }, orderBy: { createdAt: 'asc' }, take: 50,
      select: {
        id: true, receiptId: true, providerLeadId: true, retrievalStatus: true, retrievalAttempt: true,
        lastRetrievalAt: true, nextRetrievalAt: true, duplicateReason: true, isTestLead: true,
        failureCode: true, failureCategory: true, failureSummary: true, createdAt: true, updatedAt: true,
      },
    }),
    db.metaLeadHandoff.findMany({
      where: { leadId }, orderBy: { createdAt: 'asc' }, take: 50,
      select: { id: true, destination: true, status: true, targetType: true, targetId: true, attemptCount: true, lastAttemptAt: true, nextRetryAt: true, failureCode: true, failureSummary: true, completedAt: true, createdAt: true, updatedAt: true },
    }),
    db.metaLeadDuplicate.findMany({
      where: { canonicalLeadId: leadId }, orderBy: { createdAt: 'asc' }, take: 100,
      select: { id: true, sourceLeadgenId: true, reason: true, receiptId: true, canonicalReceiptId: true, createdAt: true },
    }),
  ]);

  const receipt = receiptValue ? row(receiptValue) : null;
  const identity = receipt?.primaryIdentityReference ? row(receipt.primaryIdentityReference) : null;
  return Object.freeze({
    receipt: receipt ? Object.freeze({
      id: String(receipt.id ?? ''),
      state: safeMetaAdminCode(receipt.state, 'UNKNOWN'),
      receivedAt: toMetaAdminIso(receipt.receivedAt),
      firstSeenAt: toMetaAdminIso(receipt.firstSeenAt),
      lastSeenAt: toMetaAdminIso(receipt.lastSeenAt),
      duplicateCount: Number(receipt.duplicateCount ?? 0),
      attemptCount: Number(receipt.attemptCount ?? 0),
      lastAttemptAt: toMetaAdminIso(receipt.lastAttemptAt),
      nextRetryAt: toMetaAdminIso(receipt.nextRetryAt),
      processedAt: toMetaAdminIso(receipt.processedAt),
      failedAt: toMetaAdminIso(receipt.failedAt),
      deadLetteredAt: toMetaAdminIso(receipt.deadLetteredAt),
      correlationId: safeMetaAdminText(receipt.correlationId, 255),
      replayAttempt: Number(receipt.replayAttempt ?? 0),
      replayEligibility: safeMetaAdminCode(receipt.replayEligibility, 'NOT_ELIGIBLE'),
      replayRequestedAt: toMetaAdminIso(receipt.replayRequestedAt),
      replayCompletedAt: toMetaAdminIso(receipt.replayCompletedAt),
      failure: projectMetaAdminFailure({ code: receipt.failureCode, classification: receipt.failureCategory, failureSummary: receipt.failureSummary }),
      identity: identity ? Object.freeze({
        objectType: safeMetaAdminCode(identity.objectType, 'UNKNOWN'),
        providerId: projectMetaAdminProviderId(identity.providerId),
        identityStatus: safeMetaAdminCode(identity.identityStatus, 'UNKNOWN'),
        permissionHealth: safeMetaAdminCode(identity.permissionHealth, 'UNKNOWN'),
        lastVerifiedAt: toMetaAdminIso(identity.lastVerifiedAt),
        revokedAt: toMetaAdminIso(identity.revokedAt),
      }) : null,
    }) : null,
    fetchAttempts: Array.isArray(attemptsValue) ? attemptsValue.map((value) => {
      const item = row(value);
      return Object.freeze({
        id: String(item.id ?? ''), receiptId: String(item.receiptId ?? ''), providerLeadId: projectMetaAdminProviderId(item.providerLeadId),
        retrievalStatus: safeMetaAdminCode(item.retrievalStatus, 'UNKNOWN'), retrievalAttempt: Number(item.retrievalAttempt ?? 0),
        lastRetrievalAt: toMetaAdminIso(item.lastRetrievalAt), nextRetrievalAt: toMetaAdminIso(item.nextRetrievalAt),
        duplicateReason: item.duplicateReason ? safeMetaAdminCode(item.duplicateReason, 'UNKNOWN') : null,
        isTestLead: item.isTestLead === true,
        failure: projectMetaAdminFailure({ code: item.failureCode, classification: item.failureCategory, failureSummary: item.failureSummary }),
        createdAt: toMetaAdminIso(item.createdAt), updatedAt: toMetaAdminIso(item.updatedAt),
      });
    }) : [],
    handoffs: Array.isArray(handoffsValue) ? handoffsValue.map((value) => {
      const item = row(value);
      return Object.freeze({
        id: String(item.id ?? ''), destination: safeMetaAdminCode(item.destination, 'UNKNOWN'), status: safeMetaAdminCode(item.status, 'UNKNOWN'),
        targetType: safeMetaAdminText(item.targetType, 96), targetId: typeof item.targetId === 'string' ? item.targetId.slice(0, 255) : null,
        attemptCount: Number(item.attemptCount ?? 0), lastAttemptAt: toMetaAdminIso(item.lastAttemptAt), nextRetryAt: toMetaAdminIso(item.nextRetryAt),
        completedAt: toMetaAdminIso(item.completedAt), failure: projectMetaAdminFailure({ code: item.failureCode, failureSummary: item.failureSummary }),
        createdAt: toMetaAdminIso(item.createdAt), updatedAt: toMetaAdminIso(item.updatedAt),
      });
    }) : [],
    duplicates: Array.isArray(duplicatesValue) ? duplicatesValue.map((value) => {
      const item = row(value);
      return Object.freeze({
        id: String(item.id ?? ''), sourceLeadgenId: projectMetaAdminProviderId(item.sourceLeadgenId), reason: safeMetaAdminCode(item.reason, 'UNKNOWN'),
        receiptId: typeof item.receiptId === 'string' ? item.receiptId : null,
        canonicalReceiptId: typeof item.canonicalReceiptId === 'string' ? item.canonicalReceiptId : null,
        createdAt: toMetaAdminIso(item.createdAt),
      });
    }) : [],
  });
}

export function projectLegacyLeadWebhookFailureForAdmin(value: unknown) {
  const item = row(value);
  return Object.freeze({
    id: String(item.id ?? ''),
    eventKey: safeMetaAdminText(item.eventKey, 255),
    leadgenId: projectMetaAdminProviderId(item.leadgenId),
    pageId: projectMetaAdminProviderId(item.pageId),
    formId: projectMetaAdminProviderId(item.formId),
    status: safeMetaAdminCode(item.status, 'UNKNOWN'),
    attemptCount: Number(item.attemptCount ?? 0),
    receivedAt: toMetaAdminIso(item.receivedAt),
    lastAttemptAt: toMetaAdminIso(item.lastAttemptAt),
    processedAt: toMetaAdminIso(item.processedAt),
    failure: projectMetaAdminFailure(item.error),
  });
}
