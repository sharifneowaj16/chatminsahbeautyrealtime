import 'server-only';
import prisma from '@/lib/prisma';
import { enqueuePrivacyJob, PRIVACY_JOB_NAMES } from './jobs';

function windowKey(now: Date, minutes: number) {
  return Math.floor(now.getTime() / (minutes * 60_000));
}

export function buildPrivacySchedulePlan(now = new Date()) {
  const minute = now.getUTCMinutes();
  const hour = now.getUTCHours();
  return [
    { key: 'deletion-recovery-5m', due: minute % 5 === 0 },
    { key: 'suppression-sync-15m', due: minute % 15 === 0 },
    { key: 'retention-hourly', due: minute === 0 },
    { key: 'pii-audit-daily', due: hour === 3 && minute < 5 },
  ];
}

export async function schedulePrivacyGovernanceJobs(now = new Date()) {
  const plan = buildPrivacySchedulePlan(now);
  const accepted: unknown[] = [];
  if (plan.find((item) => item.key === 'deletion-recovery-5m')?.due) {
    const pending = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT "id" FROM "DataDeletionRequest"
       WHERE "status" IN ('RECEIVED','VERIFIED','FAILED')
       ORDER BY "requestedAt" ASC LIMIT 100`
    );
    for (const row of pending) {
      accepted.push(await enqueuePrivacyJob({
        type: PRIVACY_JOB_NAMES.DELETION_PROCESSOR,
        idempotencyKey: `deletion:${row.id}:${windowKey(now, 5)}`,
        requestId: row.id,
      }));
    }
  }
  if (plan.find((item) => item.key === 'suppression-sync-15m')?.due) {
    accepted.push(await enqueuePrivacyJob({
      type: PRIVACY_JOB_NAMES.SUPPRESSION_SYNC,
      idempotencyKey: `suppression:${windowKey(now, 15)}`,
      limit: 1000,
    }));
  }
  if (plan.find((item) => item.key === 'retention-hourly')?.due) {
    accepted.push(await enqueuePrivacyJob({
      type: PRIVACY_JOB_NAMES.RETENTION_CLEANUP,
      idempotencyKey: `retention:${windowKey(now, 60)}`,
      limit: 1000,
    }));
  }
  if (plan.find((item) => item.key === 'pii-audit-daily')?.due) {
    accepted.push(await enqueuePrivacyJob({
      type: PRIVACY_JOB_NAMES.PII_AUDIT_SCAN,
      idempotencyKey: `pii-audit:${now.toISOString().slice(0, 10)}`,
      limit: 500,
    }));
  }
  return { checkedAt: now.toISOString(), due: plan.filter((item) => item.due).map((item) => item.key), accepted };
}
