import 'server-only';
import prisma from '@/lib/prisma';
import { anonymizeUserDataById } from '@/lib/user-data-deletion';
import { markDeletionRequestStatus } from './deletion';
import { appendPrivacyAudit } from './audit';
import { TRACKING_POLICY_VERSION } from './consent-types';
import { retentionUntilForTarget } from './retention';

export async function processDataDeletionRequest(requestId: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    userId: string | null;
    status: string;
  }>>(
    `SELECT "id","userId","status" FROM "DataDeletionRequest" WHERE "id"=$1 LIMIT 1`,
    requestId
  );
  const request = rows[0];
  if (!request) return { ok: false, skipped: true, reason: 'REQUEST_NOT_FOUND' };
  if (request.status === 'COMPLETED') return { ok: true, skipped: true, reason: 'ALREADY_COMPLETED' };

  await markDeletionRequestStatus({ id: request.id, status: 'PROCESSING' });
  try {
    if (request.userId) await anonymizeUserDataById(request.userId);
    await prisma.$executeRawUnsafe(
      `UPDATE "TrackingConsentRecord" SET "state"='WITHDRAWN'::"TrackingConsentState", "withdrawnAt"=NOW()
       WHERE "userId"=$1 AND "state"='GRANTED'::"TrackingConsentState"`,
      request.userId
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "MetaEventOutbox" SET "status"='SUPPRESSED'::"MetaEventOutboxStatus",
       "suppressReason"='DELETION_REQUESTED', "updatedAt"=NOW()
       WHERE "orderId" IN (SELECT "id" FROM "Order" WHERE "userId"=$1)
       AND "status" IN ('PENDING','DISPATCHED','RETRY_SCHEDULED')`,
      request.userId
    );
    await markDeletionRequestStatus({ id: request.id, status: 'COMPLETED' });
    await appendPrivacyAudit({
      action: 'DATA_DELETION_COMPLETED', actorType: 'SYSTEM', subjectUserId: request.userId,
      requestId: request.id, policyVersion: TRACKING_POLICY_VERSION,
      details: { userFound: Boolean(request.userId) }, retentionUntil: retentionUntilForTarget('DELETION_AUDIT'),
    });
    return { ok: true, requestId: request.id };
  } catch (error) {
    const safeError = { code: 'DELETION_PROCESSING_FAILED' };
    await markDeletionRequestStatus({ id: request.id, status: 'FAILED', error: safeError });
    throw error;
  }
}
