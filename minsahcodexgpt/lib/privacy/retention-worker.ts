import 'server-only';
import prisma from '@/lib/prisma';
import { findRawPiiPaths } from './pii-redaction';
import { appendPrivacyAudit } from './audit';
import { TRACKING_POLICY_VERSION } from './consent-types';
import { retentionUntilForTarget } from './retention';

export async function runPrivacyRetentionCleanup(limit = 500) {
  const take = Math.max(1, Math.min(limit, 5_000));
  const outboxDeleted = await prisma.$executeRawUnsafe(
    `DELETE FROM "MetaEventOutbox" WHERE "id" IN (
      SELECT "id" FROM "MetaEventOutbox"
      WHERE "retentionUntil" <= NOW() AND "status" IN ('SENT','FAILED_PERMANENT','SUPPRESSED')
      ORDER BY "retentionUntil" ASC LIMIT $1
    )`, take
  );
  const consentDeleted = await prisma.$executeRawUnsafe(
    `DELETE FROM "TrackingConsentRecord" WHERE "id" IN (
      SELECT "id" FROM "TrackingConsentRecord" WHERE "retentionUntil" <= NOW()
      ORDER BY "retentionUntil" ASC LIMIT $1
    )`, take
  );
  const leadsRedacted = await prisma.$executeRawUnsafe(
    `UPDATE "MetaLead" SET "rawPayloadEncrypted"=NULL,"updatedAt"=NOW()
     WHERE "id" IN (SELECT "id" FROM "MetaLead" WHERE "rawPayloadEncrypted" IS NOT NULL
       AND "fetchedAt" < NOW() - INTERVAL '90 days' ORDER BY "fetchedAt" ASC LIMIT $1)`, take
  );
  const leadReceiptsRedacted = await prisma.$executeRawUnsafe(
    `UPDATE "MetaWebhookReceipt" SET "payload"=NULL,"payloadEncrypted"=NULL,"updatedAt"=NOW()
     WHERE "id" IN (SELECT "id" FROM "MetaWebhookReceipt" WHERE "cleanupAfter" <= NOW()
       AND ("payload" IS NOT NULL OR "payloadEncrypted" IS NOT NULL)
       ORDER BY "cleanupAfter" ASC LIMIT $1)`, take
  );
  return { outboxDeleted, consentDeleted, leadsRedacted, leadReceiptsRedacted };
}

export async function runPiiAuditScan(limit = 250) {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; safePayload: unknown }>>(
    `SELECT "id", "safePayload" FROM "MetaEventOutbox"
     WHERE "safePayload" IS NOT NULL ORDER BY "createdAt" DESC LIMIT $1`,
    Math.max(1, Math.min(limit, 1_000))
  );
  const findings = rows.flatMap((row) => findRawPiiPaths(row.safePayload).map((path) => ({ outboxId: row.id, path })));
  await appendPrivacyAudit({
    action: 'PII_AUDIT_SCAN_COMPLETED', actorType: 'SYSTEM', policyVersion: TRACKING_POLICY_VERSION,
    details: { scanned: rows.length, findingCount: findings.length, sample: findings.slice(0, 25) },
    retentionUntil: retentionUntilForTarget('DELETION_AUDIT'),
  });
  return { scanned: rows.length, findings };
}

export async function syncTrackingSuppressions(limit = 500) {
  const suppressed = await prisma.$executeRawUnsafe(
    `UPDATE "MetaEventOutbox" SET "status"='SUPPRESSED'::"MetaEventOutboxStatus",
       "suppressReason"=COALESCE("suppressReason", "policyReason"), "updatedAt"=NOW()
     WHERE "id" IN (SELECT "id" FROM "MetaEventOutbox"
       WHERE "status" IN ('PENDING','DISPATCHED','RETRY_SCHEDULED')
       AND ("consentState" IN ('DENIED','WITHDRAWN','UNKNOWN') OR "policyReason" <> 'CONSENT_GRANTED')
       ORDER BY "createdAt" ASC LIMIT $1)`,
    Math.max(1, Math.min(limit, 5_000))
  );
  return { suppressed };
}
