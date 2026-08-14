import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { resolveTrackingDecision } from '../../lib/privacy/consent-resolver';
import { hashPiiEmail, hashPiiPhone, hashNormalizedPii } from '../../lib/privacy/pii-hash';
import { findRawPiiPaths, redactOperationalPayload, redactPiiString } from '../../lib/privacy/pii-redaction';
import { isRetentionExpired, retentionUntilForTarget } from '../../lib/privacy/retention';
import { TRACKING_POLICY_VERSION } from '../../lib/privacy/consent-types';

const NOW = new Date('2026-07-17T15:00:00.000Z');

test('unknown consent is fail-closed for advertising', () => {
  const decision = resolveTrackingDecision({ eventName: 'PageView', consentState: 'UNKNOWN', now: NOW });
  assert.equal(decision.allowPixel, false);
  assert.equal(decision.allowCapiEvent, false);
  assert.equal(decision.reason, 'CONSENT_UNKNOWN');
  assert.equal(decision.policyVersion, TRACKING_POLICY_VERSION);
});

test('granted state without a consent version is not valid approval', () => {
  const decision = resolveTrackingDecision({ eventName: 'Purchase', consentState: 'GRANTED', now: NOW });
  assert.equal(decision.allowCapiEvent, false);
  assert.equal(decision.allowAdvancedMatching, false);
});

test('versioned explicit grant allows Pixel, CAPI and advanced matching', () => {
  const decision = resolveTrackingDecision({
    eventName: 'Purchase', consentState: 'GRANTED', consentVersion: '2026-07-17', now: NOW,
  });
  assert.equal(decision.allowPixel, true);
  assert.equal(decision.allowCapiEvent, true);
  assert.equal(decision.allowAdvancedMatching, true);
  assert.equal(decision.reason, 'CONSENT_GRANTED');
  assert.equal(decision.allowedUserDataFields.includes('em'), true);
  assert.equal(decision.retentionUntil, '2026-10-15T15:00:00.000Z');
});

test('denial and withdrawal always take precedence', () => {
  for (const state of ['DENIED', 'WITHDRAWN'] as const) {
    const decision = resolveTrackingDecision({
      eventName: 'AddToCart', consentState: state, consentVersion: '2026-07-17', now: NOW,
    });
    assert.equal(decision.allowPixel, false);
    assert.equal(decision.allowCapiEvent, false);
    assert.equal(decision.allowedUserDataFields.length, 0);
  }
});

test('internal, test, bot and deletion traffic is suppressed even with consent', () => {
  const flags = ['internalTraffic', 'testTraffic', 'botTraffic', 'deletionRequested'] as const;
  for (const flag of flags) {
    const decision = resolveTrackingDecision({
      eventName: 'Purchase', consentState: 'GRANTED', consentVersion: '2026-07-17', [flag]: true,
    });
    assert.equal(decision.allowCapiEvent, false);
  }
});

test('email and Bangladesh phone are normalized before SHA-256 hashing', () => {
  assert.equal(hashPiiEmail('  USER @Example.COM '), hashNormalizedPii('user@example.com'));
  assert.equal(hashPiiPhone('+880 1712-345678'), hashNormalizedPii('8801712345678'));
});

test('already hashed PII is not double hashed', () => {
  const hash = hashPiiEmail('user@example.com');
  assert.ok(hash);
  assert.equal(hashNormalizedPii(hash), hash);
});

test('operational redaction removes raw identifiers and secrets', () => {
  const input = {
    email: 'customer@example.com',
    nested: { note: 'Call 01712345678', authorization: 'Bearer abcdefghijklmnop' },
  };
  const redacted = redactOperationalPayload(input) as Record<string, unknown>;
  assert.equal(redacted.email, '[REDACTED]');
  assert.deepEqual(findRawPiiPaths(redacted), []);
  assert.equal(redactPiiString('mail customer@example.com'), 'mail [REDACTED_EMAIL]');
});

test('retention dates are mandatory and expire deterministically', () => {
  const until = retentionUntilForTarget('META_EVENT_OUTBOX', NOW);
  assert.equal(until.toISOString(), '2026-10-15T15:00:00.000Z');
  assert.equal(isRetentionExpired(until, new Date('2026-10-15T14:59:59.000Z')), false);
  assert.equal(isRetentionExpired(until, new Date('2026-10-15T15:00:00.000Z')), true);
  assert.equal(isRetentionExpired(null, NOW), true);
});

test('schema and migration enforce conservative historical consent policy', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const migration = fs.readFileSync('prisma/migrations/20260717040000_meta_v6_phase6_privacy_governance/migration.sql', 'utf8');
  assert.match(schema, /nonEssentialTrackingAllowed Boolean @default\(false\)/);
  assert.match(schema, /enum TrackingConsentState/);
  assert.match(schema, /model TrackingConsentRecord/);
  assert.match(schema, /model DataDeletionRequest/);
  assert.match(schema, /model PrivacyAuditLog/);
  assert.match(migration, /HISTORICAL_CONSENT_UNVERSIONED/);
  assert.match(migration, /"nonEssentialTrackingAllowed" = false/);
});

test('outbox stores versioned policy metadata and retention', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const repository = fs.readFileSync('lib/meta/capi/outbox-repository.ts', 'utf8');
  for (const field of ['policyVersion', 'policyReason', 'consentState', 'consentVersion', 'allowAdvancedMatching', 'retentionUntil']) {
    assert.match(schema, new RegExp(field));
    assert.match(repository, new RegExp(field));
  }
});

test('deletion and privacy workers are durable and resumable', () => {
  const jobs = fs.readFileSync('lib/privacy/jobs.ts', 'utf8');
  const scheduler = fs.readFileSync('lib/privacy/scheduler.ts', 'utf8');
  const worker = fs.readFileSync('workers/privacy-governance.worker.ts', 'utf8');
  for (const job of ['PRIVACY_RETENTION_CLEANUP', 'PRIVACY_DELETION_PROCESSOR', 'TRACKING_SUPPRESSION_SYNC', 'PII_AUDIT_SCAN']) {
    assert.match(jobs, new RegExp(job));
    assert.match(worker, new RegExp(job));
  }
  assert.match(scheduler, /deletion-recovery-5m/);
  assert.match(worker, /maxStalledCount: 2/);
});
