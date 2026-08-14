import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Lead list and detail preserve test-lead visibility without raw contact data', () => {
  const repo = source('lib/meta/leads/repository.ts');
  assert.match(repo, /isTestLead/);
  const list = source('app/api/admin/meta/leads/route.ts');
  const detail = source('app/api/admin/meta/leads/[leadId]/route.ts');
  for (const text of [list, detail]) {
    assert.match(text, /assertMetaAdminSafeDto/);
    assert.match(text, /metaAdminNoStoreHeaders/);
    assert.doesNotMatch(text, /encryptedData|fieldData|rawPayload/);
  }
});

test('Lead status traces receipt through processing, handoff and duplicate records', () => {
  const status = source('lib/meta-platform/admin/lead-status.ts');
  for (const model of ['metaSocialWebhookReceipt', 'metaLeadProcessingAttempt', 'metaLeadHandoff', 'metaLeadDuplicate']) assert.match(status, new RegExp(model));
  assert.match(status, /projectMetaAdminFailure/);
  assert.match(status, /projectMetaAdminProviderId/);
});

test('Lead mutations are privileged and CSRF-safe', () => {
  assert.match(source('app/api/admin/meta/leads/route.ts'), /requireSuperAdminMutation/);
  assert.match(source('app/api/admin/meta/leads/[leadId]/route.ts'), /requireSuperAdminMutation/);
});
