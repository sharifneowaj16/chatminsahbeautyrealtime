import { projectMetaAdminFailure, safeMetaAdminCode, safeMetaAdminText, toMetaAdminIso } from './contracts.ts';

const REPLAYABLE = new Set(['DEAD_LETTER', 'FAILED', 'CANCELLED']);

function truthy(value: unknown): boolean {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

export function getMetaAdminActionControls(env: NodeJS.ProcessEnv = process.env) {
  const globalKilled = truthy(env.META_PLATFORM_GLOBAL_KILL_SWITCH) || truthy(env.META_ADMIN_ACTIONS_KILL_SWITCH);
  const replayKilled = globalKilled || truthy(env.META_ADMIN_REPLAY_KILL_SWITCH);
  const cancelKilled = globalKilled || truthy(env.META_ADMIN_CANCEL_KILL_SWITCH);
  return Object.freeze({
    replay: Object.freeze({ enabled: !replayKilled, reasonCode: replayKilled ? 'REPLAY_KILL_SWITCH_ACTIVE' : 'ENABLED' }),
    cancel: Object.freeze({ enabled: !cancelKilled, reasonCode: cancelKilled ? 'CANCEL_KILL_SWITCH_ACTIVE' : 'ENABLED' }),
  });
}

function containsUnknownOutcome(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return /UNKNOWN[_ -]?(WRITE|OUTCOME)|RECONCILIATION[_ -]?REQUIRED/i.test(value);
  if (Array.isArray(value)) return value.some(containsUnknownOutcome);
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>)
    .some(([key, nested]) => containsUnknownOutcome(key) || containsUnknownOutcome(nested));
  return false;
}

export function evaluateMetaJobReplayEligibility(input: Readonly<{
  status: unknown;
  jobName: unknown;
  lastError?: unknown;
  replayEnabled?: boolean;
}>) {
  const status = safeMetaAdminCode(input.status, 'UNKNOWN');
  const jobName = String(input.jobName ?? '');
  const allowed = input.replayEnabled !== false
    && REPLAYABLE.has(status)
    && jobName !== 'social-event-replay'
    && !containsUnknownOutcome(input.lastError);
  const reasonCode = input.replayEnabled === false
    ? 'REPLAY_KILL_SWITCH_ACTIVE'
    : !REPLAYABLE.has(status)
      ? 'JOB_STATUS_NOT_REPLAYABLE'
      : jobName === 'social-event-replay'
        ? 'REPLAY_RECURSION_BLOCKED'
        : containsUnknownOutcome(input.lastError)
          ? 'UNKNOWN_OUTCOME_RECONCILIATION_REQUIRED'
          : 'ELIGIBLE_WITH_APPROVAL';
  return Object.freeze({ allowed, reasonCode, approvalRequired: true, dedupeEnforced: true });
}

export function projectMetaJobAuditForAdmin(value: unknown, controls = getMetaAdminActionControls()) {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.freeze({
    id: String(row.id ?? ''),
    queueName: safeMetaAdminText(row.queueName, 100),
    jobName: safeMetaAdminText(row.jobName, 100),
    externalJobId: typeof row.externalJobId === 'string' ? row.externalJobId.slice(0, 255) : null,
    idempotencyKey: typeof row.idempotencyKey === 'string' ? row.idempotencyKey.slice(0, 255) : null,
    correlationId: typeof row.correlationId === 'string' ? row.correlationId.slice(0, 255) : null,
    status: safeMetaAdminCode(row.status, 'UNKNOWN'),
    attempts: Number(row.attempts ?? 0),
    maxAttempts: Number(row.maxAttempts ?? 0),
    progress: typeof row.progress === 'number' ? row.progress : null,
    sourceId: typeof row.sourceId === 'string' ? row.sourceId.slice(0, 255) : null,
    failure: projectMetaAdminFailure(row.lastError),
    replayOfId: typeof row.replayOfId === 'string' ? row.replayOfId.slice(0, 255) : null,
    replayCount: Number(row.replayCount ?? 0),
    requestedBy: typeof row.requestedBy === 'string' ? row.requestedBy.slice(0, 255) : null,
    nextRunAt: toMetaAdminIso(row.nextRunAt),
    startedAt: toMetaAdminIso(row.startedAt),
    completedAt: toMetaAdminIso(row.completedAt),
    lastHeartbeatAt: toMetaAdminIso(row.lastHeartbeatAt),
    createdAt: toMetaAdminIso(row.createdAt),
    updatedAt: toMetaAdminIso(row.updatedAt),
    replayEligibility: evaluateMetaJobReplayEligibility({
      status: row.status, jobName: row.jobName, lastError: row.lastError, replayEnabled: controls.replay.enabled,
    }),
    cancelEligibility: Object.freeze({
      allowed: controls.cancel.enabled && ['QUEUED', 'RUNNING', 'RETRYING'].includes(safeMetaAdminCode(row.status, 'UNKNOWN')),
      reasonCode: !controls.cancel.enabled ? controls.cancel.reasonCode : ['QUEUED', 'RUNNING', 'RETRYING'].includes(safeMetaAdminCode(row.status, 'UNKNOWN')) ? 'ELIGIBLE_WITH_APPROVAL' : 'JOB_STATUS_NOT_CANCELLABLE',
      approvalRequired: true,
    }),
  });
}
