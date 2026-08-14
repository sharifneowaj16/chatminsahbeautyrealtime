import 'server-only';
import crypto from 'node:crypto';
import { getMetaJobAuditById } from './audit-repository';
import { enqueueMetaJob } from './queues';
import { createMetaSocialReplayJobEnvelope, mapMetaSocialEnvelopeToBullMq } from '../meta-platform/queue';
import { getMetaAdminActionControls } from '../meta-platform/admin/jobs-dto';

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;
const REPLAYABLE_STATUSES = new Set(['DEAD_LETTER', 'FAILED', 'CANCELLED']);

function requiredId(value: unknown, code: string): string {
  if (typeof value !== 'string' || !SAFE_ID_PATTERN.test(value)) throw new TypeError(code);
  return value;
}

function containsUnknownOutcome(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return /UNKNOWN[_ -]?(WRITE|OUTCOME)|RECONCILIATION[_ -]?REQUIRED/i.test(value);
  if (Array.isArray(value)) return value.some(containsUnknownOutcome);
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>)
    .some(([key, nested]) => containsUnknownOutcome(key) || containsUnknownOutcome(nested));
  return false;
}

export async function replayMetaDeadLetter(input: {
  auditId: string;
  requestedBy: string;
  approvalId: string;
  reason?: string;
  environment?: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
}) {
  const auditId = requiredId(input.auditId, 'META_JOB_REPLAY_AUDIT_ID_INVALID');
  const requestedBy = requiredId(input.requestedBy, 'META_JOB_REPLAY_ACTOR_INVALID');
  const approvalId = requiredId(input.approvalId, 'META_JOB_REPLAY_APPROVAL_ID_INVALID');
  const reason = input.reason?.trim() ?? '';
  const controls = getMetaAdminActionControls();
  if (!controls.replay.enabled) return { ok: false as const, reason: controls.replay.reasonCode };
  if (reason.length < 3 || reason.length > 500) return { ok: false as const, reason: 'REPLAY_REASON_INVALID' };

  const original = await getMetaJobAuditById(auditId);
  if (!original) return { ok: false as const, reason: 'JOB_AUDIT_NOT_FOUND' };
  if (!REPLAYABLE_STATUSES.has(original.status)) return { ok: false as const, reason: 'JOB_NOT_REPLAYABLE' };
  if (original.jobName === 'social-event-replay') return { ok: false as const, reason: 'REPLAY_RECURSION_BLOCKED' };
  if (containsUnknownOutcome(original.lastError)) {
    return { ok: false as const, reason: 'UNKNOWN_OUTCOME_RECONCILIATION_REQUIRED' };
  }

  const correlationId = `meta-replay-${crypto.randomUUID()}`;
  const envelope = createMetaSocialReplayJobEnvelope({
    originalAuditId: original.id,
    approvalId,
    correlationId,
    environment: input.environment,
  });
  const mapped = mapMetaSocialEnvelopeToBullMq(envelope);
  const replayRequest = await enqueueMetaJob({
    queueName: mapped.queueName,
    jobName: mapped.jobName,
    payload: mapped.payload,
    sourceId: original.id,
    requestedBy,
    replayOfId: original.id,
    options: mapped.options,
  });
  return {
    ok: true as const,
    originalAuditId: original.id,
    replayRequestAuditId: replayRequest.auditId,
    replayRequestJobId: replayRequest.jobId,
    idempotencyKey: replayRequest.idempotencyKey,
    status: replayRequest.status,
  };
}
