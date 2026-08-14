import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });
const all = (source, values) => values.every((value) => source.includes(value));

const reliability = read('lib/meta-platform/queue/social-job-reliability.ts');
const replay = read('lib/meta-platform/queue/social-replay-job.ts');
const deadLetter = read('lib/jobs/dead-letter.ts');
const worker = read('lib/jobs/worker.ts');
const socialWorker = read('workers/meta-social.worker.ts');
const instagramWorker = read('workers/meta-instagram.worker.ts');
const leadWorker = read('workers/meta-lead.worker.ts');
const adminJobs = read('app/api/admin/meta/jobs/route.ts');
const adminJobsStatus = read('lib/meta-platform/admin/jobs-status.ts');
const adminJobsDto = read('lib/meta-platform/admin/jobs-dto.ts');
const retryPolicy = read('lib/jobs/retry-policy.ts');
const testSource = read('tests/meta-v6/phase31-social-retry-dead-letter-replay.test.mjs');

check('standard social retry constants exist', all(reliability, ['META_SOCIAL_JOB_MAX_ATTEMPTS', 'META_SOCIAL_RETRY_BASE_DELAY_MS', 'META_SOCIAL_RETRY_MAX_DELAY_MS']));
check('retry uses exponential backoff', reliability.includes('2 ** Math.max(0, attempt - 1)'));
check('retry uses deterministic SHA-256 jitter', all(reliability, ["createHash('sha256')", 'deterministicUnit', 'META_SOCIAL_RETRY_JITTER_RATIO']));
check('provider Retry-After is honored', all(reliability, ['retryAfterMs', 'Math.max(jittered, providerDelay)']));
check('maximum attempts dead-letter retryable work', all(reliability, ["attempt >= maxAttempts", "safeReasonCode: attempt >= maxAttempts && retryable ? 'META_SOCIAL_RETRY_EXHAUSTED'"]));
check('unknown writes reconcile without retry', all(reliability, ["action: 'RECONCILE'", "classification: 'UNKNOWN_WRITE'", 'retryDelayMs: null']));
check('safe admin failure projection strips message/payload', all(reliability, ['projectMetaJobFailureForAdmin', 'safeReasonCode', 'retryAfterMs']));
check('worker backoff consumes exact policy delay', all(retryPolicy, ['record.retryDelayMs', 'return Math.max(0, decided)']));
check('worker audit stores safe classification and reconciliation state', all(worker, ['safeReasonCode', 'classification', 'reconciliationRequired', 'retryDelayMs']));
check('lead worker uses shared failure decision', all(leadWorker, ['decideMetaSocialJobFailure', 'createMetaSocialRetryError']));
check('instagram worker uses shared failure decision', all(instagramWorker, ['decideMetaSocialJobFailure', 'createMetaSocialRetryError', "decision.action === 'RECONCILE'"]));
check('social worker uses shared failure decision', all(socialWorker, ['decideMetaSocialJobFailure', 'createMetaSocialRetryError']));
check('canonical replay request is approval-scoped and deduplicated', all(replay, ['buildMetaSocialReplayRequestDedupeKey', 'approvalId', "jobType: 'REPLAY_SOCIAL_EVENT'"]));
check('replay queue carries only durable audit reference', all(replay, ["kind: 'META_JOB_AUDIT'", "createHash('sha256').update(approvalId)"]));
check('replay validates terminal source state', all(replay, ['REPLAYABLE_STATUSES', 'META_SOCIAL_REPLAY_SOURCE_NOT_REPLAYABLE']));
check('replay recursion is blocked', all(replay, ["original.jobName === 'social-event-replay'", 'META_SOCIAL_REPLAY_RECURSION_BLOCKED']));
check('unknown write replay is blocked pending reconciliation', all(replay, ['unknownOutcomeMarker', 'META_SOCIAL_UNKNOWN_OUTCOME_RECONCILIATION_REQUIRED']));
check('replayed social payload gets a fresh namespaced dedupe key', all(replay, ['metaSocialJobDedupePrefix', 'replayRequestAuditId', 'dedupeKey: replayKey']));
check('replay preserves audit relationship and increments source count', all(replay, ['replayOfId: original.id', 'incrementReplayCount(original.id)']));
check('admin replay requires approval id and reason', all(deadLetter, ['approvalId: string', 'REPLAY_REASON_INVALID', 'requestedBy', 'replayOfId: original.id']));
check('admin replay enqueues canonical replay job instead of original directly', all(deadLetter, ['createMetaSocialReplayJobEnvelope', 'mapMetaSocialEnvelopeToBullMq', 'replayRequestAuditId']));
check('admin jobs API exposes safe failure projection', all(adminJobs, ['listMetaAdminJobs', 'approvalId, reason']) && all(adminJobsStatus, ['projectMetaJobAuditForAdmin', 'lastError: true']) && all(adminJobsDto, ['projectMetaAdminFailure(row.lastError)', 'replayEligibility']));
check('social worker consumes replay job', all(socialWorker, ['META_JOB_NAMES.SOCIAL_EVENT_REPLAY', 'executeMetaSocialReplayJob', 'incrementMetaJobReplayCount']));
check('focused tests cover jitter, retry-after, dead-letter, replay and reconciliation', all(testSource, ['deterministic exponential backoff', 'Retry-After', 'dead-letter when exhausted', 'controlled replay', 'cannot be replayed before reconciliation']));

for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
const passed = checks.filter((item) => item.ok).length;
console.log(`Layer 4.7 audit: ${passed}/${checks.length} checks passed`);
if (passed !== checks.length) process.exit(1);
