import crypto from 'node:crypto';
import prisma from '@/lib/prisma';
import { TRACKING_POLICY_VERSION, type TrackingConsentState } from './consent-types';
import { hashNormalizedPii } from './pii-hash';
import { retentionUntilForTarget } from './retention';
import { appendPrivacyAudit } from './audit';

export async function recordTrackingConsent(input: {
  state: TrackingConsentState;
  version: string;
  source: string;
  userId?: string | null;
  visitorId?: string | null;
}) {
  const id = crypto.randomUUID();
  const visitorHash = hashNormalizedPii(input.visitorId ? `visitor:${input.visitorId}` : undefined);
  const retentionUntil = retentionUntilForTarget('TRACKING_CONSENT_RECORD');
  const withdrawnAt = input.state === 'WITHDRAWN' ? new Date() : null;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO "TrackingConsentRecord"
        ("id","userId","visitorId","state","version","source","policyVersion","recordedAt","withdrawnAt","retentionUntil")
       VALUES ($1,$2,$3,$4::"TrackingConsentState",$5,$6,$7,NOW(),$8,$9)`,
      id, input.userId ?? null, visitorHash ?? null, input.state, input.version,
      input.source, TRACKING_POLICY_VERSION, withdrawnAt, retentionUntil
    );
    if (visitorHash && ['DENIED', 'WITHDRAWN'].includes(input.state)) {
      await tx.$executeRawUnsafe(
        `INSERT INTO "TrackingSuppression"
          ("id","identityHash","reason","source","policyVersion","active","createdAt")
         VALUES ($1,$2,$3,$4,$5,true,NOW())
         ON CONFLICT ("identityHash") DO UPDATE SET
           "reason"=EXCLUDED."reason", "source"=EXCLUDED."source",
           "policyVersion"=EXCLUDED."policyVersion", "active"=true`,
        crypto.randomUUID(), visitorHash, input.state === 'WITHDRAWN' ? 'CONSENT_WITHDRAWN' : 'CONSENT_DENIED',
        input.source, TRACKING_POLICY_VERSION
      );
    } else if (visitorHash && input.state === 'GRANTED') {
      await tx.$executeRawUnsafe(
        `UPDATE "TrackingSuppression" SET "active"=false WHERE "identityHash"=$1 AND "source"='CONSENT_UI'`,
        visitorHash
      );
    }
  });

  await appendPrivacyAudit({
    action: `TRACKING_CONSENT_${input.state}`,
    actorType: input.userId ? 'USER' : 'SYSTEM',
    subjectUserId: input.userId,
    requestId: id,
    policyVersion: TRACKING_POLICY_VERSION,
    details: { source: input.source, visitorHashPresent: Boolean(visitorHash), version: input.version },
    retentionUntil,
  });
  return { id, state: input.state, version: input.version, policyVersion: TRACKING_POLICY_VERSION };
}
