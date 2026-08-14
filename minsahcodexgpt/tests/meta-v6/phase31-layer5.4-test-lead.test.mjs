import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  createMetaTestLeadEvidence,
  createMetaTestLeadFixture,
  resolveMetaTestLeadPolicy,
} from '../../lib/meta-platform/domains/leads/test-lead.ts';

test('provider and admin test leads are isolated from CRM', () => {
  for (const policy of [
    resolveMetaTestLeadPolicy({ providerMarker: true, source: 'PROVIDER_MARKER' }),
    resolveMetaTestLeadPolicy({ source: 'ADMIN_TEST_CREATE' }),
  ]) {
    assert.equal(policy.isTestLead, true);
    assert.equal(policy.isolateFromCrm, true);
    assert.equal(policy.suppressAssignment, true);
    assert.equal(policy.suppressNotifications, true);
    assert.equal(policy.cleanupAfterDays, 7);
  }
});

test('normal and explicitly false provider leads remain normal', () => {
  assert.equal(resolveMetaTestLeadPolicy({ providerMarker: false }).isTestLead, false);
  assert.equal(resolveMetaTestLeadPolicy({}).isolateFromCrm, false);
});

test('test fixture is synthetic and evidence excludes contact values', () => {
  const fixture = createMetaTestLeadFixture('ABC-123');
  assert.match(fixture.email, /@example\.invalid$/);
  assert.equal(fixture.productInterest, 'PHASE31_TEST_ONLY');
  const evidence = createMetaTestLeadEvidence({ providerLeadId: 'lead-test-1', pageId: 'page-1', formId: 'form-1', createdAt: new Date('2026-07-26T00:00:00Z') });
  const serialized = JSON.stringify(evidence);
  assert.doesNotMatch(serialized, /example\.invalid|15550000000|fullName|email|phone/);
  assert.equal(evidence.cleanupEligibleAt, '2026-08-02T00:00:00.000Z');
});

test('production runtime blocks test handoff and suppresses notifications', () => {
  const runtime = fs.readFileSync('lib/meta-platform/domains/leads/runtime.ts', 'utf8');
  assert.match(runtime, /resolveMetaTestLeadPolicy/);
  assert.match(runtime, /blockMetaLeadHandoff/);
  assert.match(runtime, /TEST_LEAD_ISOLATED/);
  assert.match(runtime, /if \(!testLeadPolicy\.suppressNotifications\)/);
});

test('admin test route uses domain creation and cleanup paths', () => {
  const route = fs.readFileSync('app/api/admin/meta/leads/test/route.ts', 'utf8');
  const runtime = fs.readFileSync('lib/meta-platform/domains/leads/test-lead-runtime.ts', 'utf8');
  assert.match(route, /createMetaTestLeadProduction/);
  assert.match(route, /cleanupMetaTestLeadsProduction/);
  assert.match(runtime, /\/test_leads/);
  assert.match(runtime, /enqueueMetaLeadProcessingJob/);
  assert.doesNotMatch(route, /field_data|example\.invalid|15550000000/);
});
