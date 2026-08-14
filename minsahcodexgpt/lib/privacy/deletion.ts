import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import { TRACKING_POLICY_VERSION } from './consent-types';
import { retentionUntilForTarget } from './retention';
import { appendPrivacyAudit } from './audit';

export type DataDeletionRequestStatus = 'RECEIVED' | 'VERIFIED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export async function createDataDeletionRequest(input: {
  userId?: string | null;
  externalRef?: string | null;
  source: 'META_CALLBACK' | 'ACCOUNT' | 'SUPPORT' | 'ADMIN';
  confirmationCode: string;
}) {
  const id = crypto.randomUUID();
  const retentionUntil = retentionUntilForTarget('DELETION_AUDIT');
  await prisma.$executeRawUnsafe(
    `INSERT INTO "DataDeletionRequest"
      ("id", "userId", "externalRef", "source", "confirmationCode", "status", "policyVersion", "requestedAt", "retentionUntil", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,'RECEIVED'::"DataDeletionRequestStatus",$6,NOW(),$7,NOW())`,
    id, input.userId ?? null, input.externalRef ?? null, input.source,
    input.confirmationCode, TRACKING_POLICY_VERSION, retentionUntil
  );
  await appendPrivacyAudit({
    action: 'DATA_DELETION_REQUESTED', actorType: input.source === 'META_CALLBACK' ? 'META_CALLBACK' : 'USER',
    subjectUserId: input.userId, requestId: id, policyVersion: TRACKING_POLICY_VERSION,
    details: { source: input.source, externalRefPresent: Boolean(input.externalRef) }, retentionUntil,
  });
  return { id, confirmationCode: input.confirmationCode, status: 'RECEIVED' as const };
}

export async function markDeletionRequestStatus(input: {
  id: string;
  status: DataDeletionRequestStatus;
  error?: Record<string, unknown> | null;
}) {
  await prisma.$executeRawUnsafe(
    `UPDATE "DataDeletionRequest"
     SET "status"=$2::"DataDeletionRequestStatus", "error"=$3::jsonb,
         "completedAt"=CASE WHEN $2='COMPLETED' THEN NOW() ELSE "completedAt" END,
         "updatedAt"=NOW() WHERE "id"=$1`,
    input.id, input.status, input.error ? JSON.stringify(input.error) : null
  );
}
