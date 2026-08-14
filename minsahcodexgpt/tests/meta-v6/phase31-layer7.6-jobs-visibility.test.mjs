import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluateMetaJobReplayEligibility, projectMetaJobAuditForAdmin } from '../../lib/meta-platform/admin/jobs-dto.ts';
const source = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('job DTO exposes traceability without payload or raw error', () => {
  const dto = projectMetaJobAuditForAdmin({ id: 'j1', queueName: 'social', jobName: 'lead-process', status: 'DEAD_LETTER', attempts: 3, maxAttempts: 3, payload: { accessToken: 'secret' }, rateLimitState: { secret: true }, lastError: { code: 'META_TIMEOUT', message: 'safe timeout', rawPayload: { token: 'secret' } } });
  const text = JSON.stringify(dto);
  assert.doesNotMatch(text, /payload|rateLimitState|accessToken|rawPayload/);
  assert.match(text, /META_TIMEOUT/);
});

test('replay policy blocks recursion and unknown outcomes', () => {
  assert.equal(evaluateMetaJobReplayEligibility({ status: 'DEAD_LETTER', jobName: 'lead-process' }).allowed, true);
  assert.equal(evaluateMetaJobReplayEligibility({ status: 'DEAD_LETTER', jobName: 'social-event-replay' }).reasonCode, 'REPLAY_RECURSION_BLOCKED');
  assert.equal(evaluateMetaJobReplayEligibility({ status: 'FAILED', jobName: 'lead-process', lastError: { code: 'UNKNOWN_WRITE_OUTCOME' } }).reasonCode, 'UNKNOWN_OUTCOME_RECONCILIATION_REQUIRED');
});

test('jobs and operations routes are bounded, durable and sanitized', () => {
  const route = source('app/api/admin/meta/jobs/route.ts');
  assert.match(route, /parseMetaAdminLimit/);
  assert.match(route, /listMetaAdminJobs/);
  assert.match(route, /assertMetaAdminSafeDto/);
  const status = source('lib/meta-platform/admin/jobs-status.ts');
  assert.match(status, /metaJobAudit\.findMany/);
  assert.match(status, /groupBy/);
  assert.doesNotMatch(status, /select:\s*\{[^}]*payload/s);
  const ops = source('app/api/admin/meta/operations/summary/route.ts');
  assert.match(ops, /projectMetaAdminFailure/);
  assert.match(ops, /assertMetaAdminSafeDto/);
});
