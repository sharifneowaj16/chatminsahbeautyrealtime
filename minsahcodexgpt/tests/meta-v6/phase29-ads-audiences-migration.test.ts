import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

import { InMemoryMetaReadCacheStore } from '../../lib/meta-platform/reliability/cache';
import { compareMetaAdsCanonical, normalizeMetaTargeting } from '../../lib/meta-platform/domains/ads/normalization';
import {
  assertMetaAudienceConsentBatch,
  buildMetaAudienceHashedBatchDigest,
  hashMetaAudienceCustomers,
} from '../../lib/meta-platform/domains/audiences/hashing';
import { executeMetaPhase29Read } from '../../lib/meta-platform/migration/phase29-read';
import { resolveMetaPhase29ReadCutover, resolveMetaPhase29WriteCutover } from '../../lib/meta-platform/migration/phase29-cutover';
import { buildMetaAdminPayloadHash } from '../../lib/meta/admin/policy';
import { normalizeMetaAudienceMutation } from '../../lib/meta/audiences/safety';

test('Ads and audience read cutover progresses legacy -> shadow -> platform', () => {
  assert.equal(resolveMetaPhase29ReadCutover('ADS', {}).mode, 'LEGACY');
  assert.equal(resolveMetaPhase29ReadCutover('ADS', { META_PLATFORM_ADS_SHADOW: 'true' }).mode, 'SHADOW');
  assert.equal(resolveMetaPhase29ReadCutover('ADS', { META_PLATFORM_ADS_READS: 'true' }).mode, 'PLATFORM');
  assert.equal(resolveMetaPhase29ReadCutover('AUDIENCES', { META_PLATFORM_AUDIENCES_LEGACY_DISABLED: 'true' }).mode, 'PLATFORM');
});

test('writes fail closed on kill switch and after legacy disable without platform selection', () => {
  assert.equal(resolveMetaPhase29WriteCutover({ domain: 'ADS', env: {} }).mode, 'LEGACY');
  assert.equal(resolveMetaPhase29WriteCutover({ domain: 'ADS', env: { META_PLATFORM_ADS_WRITES: 'true' } }).mode, 'PLATFORM');
  assert.equal(resolveMetaPhase29WriteCutover({ domain: 'ADS', resourceId: 'cmp-test', env: { META_PLATFORM_ADS_TEST_ASSET_ID: 'cmp-test' } }).mode, 'PLATFORM_TEST');
  assert.equal(resolveMetaPhase29WriteCutover({ domain: 'ADS', env: { META_PLATFORM_ADS_KILL_SWITCH: 'true', META_PLATFORM_ADS_WRITES: 'true' } }).mode, 'BLOCKED');
  assert.equal(resolveMetaPhase29WriteCutover({ domain: 'AUDIENCES', env: { META_PLATFORM_AUDIENCES_LEGACY_DISABLED: 'true' } }).mode, 'BLOCKED');
});

test('shadow read returns legacy authority, canonical comparison and stale fallback metadata', async () => {
  const cache = new InMemoryMetaReadCacheStore();
  const shadow = await executeMetaPhase29Read({
    domain: 'ADS', cache, cacheKey: 'campaigns', env: { META_PLATFORM_ADS_SHADOW: 'true' },
    legacy: async () => ({ data: [{ id: '1', name: 'A' }] }),
    platform: async () => ({ data: [{ name: 'A', id: '1' }] }),
    now: new Date('2026-07-23T10:00:00.000Z'),
  });
  assert.equal(shadow.migration.mode, 'SHADOW');
  assert.equal(shadow.migration.shadowMatched, true);
  assert.deepEqual(shadow.value, { data: [{ id: '1', name: 'A' }] });

  const stale = await executeMetaPhase29Read({
    domain: 'ADS', cache, cacheKey: 'campaigns', env: { META_PLATFORM_ADS_READS: 'true', META_PLATFORM_ADS_READ_CACHE_FRESH_MS: '1000', META_PLATFORM_ADS_READ_CACHE_STALE_MS: '60000' },
    legacy: async () => { throw new Error('legacy not selected'); },
    platform: async () => { throw new Error('provider down'); },
    now: new Date('2026-07-23T10:00:02.000Z'),
  });
  assert.equal(stale.migration.stale, true);
  assert.equal(stale.migration.source, 'STALE_FALLBACK');
});

test('targeting normalization is deterministic and Bangladesh-safe by default', () => {
  assert.deepEqual(normalizeMetaTargeting(undefined), { age_min: 18, age_max: 65, geo_locations: { countries: ['BD'] } });
  assert.deepEqual(normalizeMetaTargeting({ age_min: 12, age_max: 80, geo_locations: { countries: ['us', 'BD', 'us'] } }), {
    age_min: 18, age_max: 65, geo_locations: { countries: ['BD', 'US'] },
  });
  assert.deepEqual(compareMetaAdsCanonical({ b: 2, a: 1 }, { a: 1, b: 2 }), []);
});

test('audience customer rows require explicit consent and contain normalized SHA-256 identifiers only', () => {
  const batch = hashMetaAudienceCustomers({
    customers: [{ email: ' Customer@Example.COM ', phone: '01700000000', country: 'BD', externalId: 'user:1', consentStatus: 'GRANTED' }],
    requireExplicitConsent: true,
  });
  assertMetaAudienceConsentBatch(batch);
  assert.equal(batch.accepted, 1);
  assert.equal(batch.rejected, 0);
  assert.equal(batch.rows[0]?.[0], createHash('sha256').update('customer@example.com').digest('hex'));
  assert.equal(batch.rows[0]?.[1], createHash('sha256').update('8801700000000').digest('hex'));
  assert.equal(JSON.stringify(batch).includes('Customer@Example.COM'), false);

  const rejected = hashMetaAudienceCustomers({ customers: [{ email: 'no-consent@example.com' }], requireExplicitConsent: true });
  assert.equal(rejected.accepted, 0);
  assert.equal(rejected.rejected, 1);
  assert.throws(() => assertMetaAudienceConsentBatch(rejected), /NO_CONSENTED_IDENTITIES/);

  const noStrongIdentifier = hashMetaAudienceCustomers({
    customers: [{ country: 'BD', consent: true }],
    requireExplicitConsent: true,
  });
  assert.equal(noStrongIdentifier.accepted, 0);
  assert.equal(noStrongIdentifier.rejected, 1);

  const makeBatch = (tail: string) => ({
    schema: Object.freeze(['EMAIL', 'PHONE', 'FN', 'LN', 'CT', 'ST', 'ZIP', 'COUNTRY', 'EXTERN_ID']),
    rows: Object.freeze(Array.from({ length: 101 }, (_, index) => Object.freeze([
      createHash('sha256').update(index === 100 ? tail : `user-${index}`).digest('hex'),
      '', '', '', '', '', '', '', '',
    ]))),
    accepted: 101,
    rejected: 0,
    valueBased: false,
  });
  const firstBatch = makeBatch('tail-a');
  const secondBatch = makeBatch('tail-b');
  const firstDigest = buildMetaAudienceHashedBatchDigest(firstBatch);
  assert.notEqual(firstDigest, buildMetaAudienceHashedBatchDigest(secondBatch));
  assert.notEqual(
    buildMetaAdminPayloadHash({ batch: firstBatch }),
    buildMetaAdminPayloadHash({ batch: secondBatch }),
  );
  const normalized = normalizeMetaAudienceMutation({
    operation: 'SYNC_CUSTOM_AUDIENCE',
    resourceId: 'audience-1',
    payload: { mode: 'add', batch: firstBatch, batchDigest: firstDigest },
  });
  assert.equal(normalized.input.batchDigest, firstDigest);
  assert.throws(() => normalizeMetaAudienceMutation({
    operation: 'SYNC_CUSTOM_AUDIENCE',
    resourceId: 'audience-1',
    payload: { mode: 'add', batch: firstBatch, batchDigest: '0'.repeat(64) },
  }), (error: unknown) => Boolean(
    error && typeof error === 'object' && 'code' in error
    && error.code === 'META_AUDIENCE_BATCH_DIGEST_MISMATCH'
  ));

  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  assert.throws(() => buildMetaAdminPayloadHash(cyclic), /META_ADMIN_HASH_PAYLOAD_CYCLIC/);
});

test('legacy marketing and audience facades contain no direct SDK/token access', () => {
  for (const file of ['lib/meta-business/marketing.ts', 'lib/meta-business/audiences.ts']) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /facebook-nodejs-business-sdk|\bmetaSdk\b|getMetaApi|requireMetaConfig\(['"]accessToken/);
    assert.match(source, /phase29-(?:ads|audiences)-facade/);
  }
});

test('audience routes use exact approval workflow and never persist the raw request body', () => {
  const routeFiles = [
    'app/api/admin/meta/audiences/route.ts',
    'app/api/admin/meta/audiences/lookalike/route.ts',
    'app/api/admin/meta/audiences/retargeting/route.ts',
    'app/api/admin/meta/audiences/sync/route.ts',
  ];
  for (const file of routeFiles) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, /executeOrRequestApprovedMetaAudienceMutation/);
    assert.doesNotMatch(source, /requestData:\s*body|withMetaSyncLog/);
  }
  const policy = fs.readFileSync('lib/meta/admin/policy.ts', 'utf8');
  assert.match(policy, /META_AUDIENCE_MUTATION:\s*\{\s*risk:\s*'CRITICAL',\s*requiresApproval:\s*true/);
});
