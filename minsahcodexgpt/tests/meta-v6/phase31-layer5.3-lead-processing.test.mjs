import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  classifyMetaLeadProcessingFailure,
  executeMetaLeadCrmHandoff,
} from '../../lib/meta-platform/domains/leads/process-lead.ts';
import { getMetaLeadRuntimeMode } from '../../lib/meta-platform/domains/leads/feature-flags.ts';

test('Lead access taxonomy is retry-safe and redacts PII', () => {
  const failure = classifyMetaLeadProcessingFailure({ code: 'META_PAGE_ACCESS_TOKEN_REQUIRED', message: 'email a@b.com phone +8801712345678 token EAabcabcabcabcabcabc' });
  assert.equal(failure.classification, 'ACCESS');
  assert.equal(failure.retryable, true);
  assert.doesNotMatch(failure.safeSummary, /a@b\.com|8801712345678|EAabc/);
});

test('CRM handoff executes once and completed replay is a no-op', async () => {
  let runs = 0;
  let completed = 0;
  const first = await executeMetaLeadCrmHandoff({
    handoffId: 'handoff-1', leadId: 'lead-1',
    claim: async () => ({ id: 'handoff-1', leadId: 'lead-1', status: 'PROCESSING', attemptCount: 1 }),
    run: async () => { runs += 1; return { assignedToId: 'admin-1' }; },
    complete: async ({ targetType, targetId }) => { completed += 1; assert.equal(targetType, 'META_LEAD_ASSIGNMENT'); assert.equal(targetId, 'admin-1'); },
    fail: async () => assert.fail('should not fail'),
  });
  assert.equal(first.status, 'COMPLETED');
  const replay = await executeMetaLeadCrmHandoff({
    handoffId: 'handoff-1', leadId: 'lead-1',
    claim: async () => ({ id: 'handoff-1', leadId: 'lead-1', status: 'COMPLETED', attemptCount: 1 }),
    run: async () => { runs += 1; }, complete: async () => { completed += 1; }, fail: async () => undefined,
  });
  assert.equal(replay.status, 'ALREADY_COMPLETED');
  assert.equal(runs, 1);
  assert.equal(completed, 1);
});

test('CRM handoff failure is classified and persisted before retry', async () => {
  let recorded;
  await assert.rejects(() => executeMetaLeadCrmHandoff({
    handoffId: 'handoff-2', leadId: 'lead-2',
    claim: async () => ({ id: 'handoff-2', leadId: 'lead-2', status: 'PROCESSING', attemptCount: 1 }),
    run: async () => { throw Object.assign(new Error('temporary +8801712345678'), { code: 'CRM_TIMEOUT' }); },
    complete: async () => assert.fail('should not complete'),
    fail: async (value) => { recorded = value; },
  }), /temporary/);
  assert.equal(recorded.failure.classification, 'TRANSIENT');
  assert.equal(recorded.terminal, false);
  assert.doesNotMatch(recorded.failure.safeSummary, /8801712345678/);
});

test('domain runtime is default and legacy is explicit rollback only', () => {
  assert.equal(getMetaLeadRuntimeMode({}), 'DOMAIN');
  assert.equal(getMetaLeadRuntimeMode({ META_PHASE31_LEAD_RUNTIME: 'LEGACY_ROLLBACK' }), 'LEGACY_ROLLBACK');
  assert.equal(getMetaLeadRuntimeMode({ META_PHASE31_LEAD_RUNTIME: 'legacy' }), 'DOMAIN');
});

test('production worker and manual sync route through Lead domain paths', () => {
  const worker = fs.readFileSync('workers/meta-lead.worker.ts', 'utf8');
  const runtime = fs.readFileSync('lib/meta-platform/domains/leads/runtime.ts', 'utf8');
  const formSync = fs.readFileSync('lib/meta-platform/domains/leads/form-sync.ts', 'utf8');
  assert.match(worker, /processMetaLeadReceiptProduction/);
  assert.match(worker, /syncMetaLeadFormProduction/);
  assert.doesNotMatch(worker, /fetchFormLeads/);
  assert.match(runtime, /executeMetaLeadCrmHandoff/);
  assert.match(runtime, /claimMetaLeadHandoff/);
  assert.match(formSync, /enqueueMetaLeadProcessingJob/);
  assert.match(formSync, /createVerifiedMetaWebhookReceipt/);
});
