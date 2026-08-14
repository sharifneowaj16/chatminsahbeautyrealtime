import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { buildAppSecretProof, isAppSecretProof } from '../../lib/meta/connection/appsecret-proof';
import { redactMetaSecrets } from '../../lib/meta/connection/errors';
import { debugMetaAccessToken } from '../../lib/meta/connection/token-debug';
import { compareMetaVersions, evaluateMetaVersionPolicy, loadMetaApiVersionPolicy } from '../../lib/meta/connection/version-policy';
import { checkMetaConnectionReadiness } from '../../lib/meta/connection/readiness';
import type { MetaConnectionBootstrap } from '../../lib/meta/connection/config';

const NOW = new Date('2026-07-17T16:50:20.000Z');
const TOKEN = 'EA_TEST_ACCESS_TOKEN_SHOULD_NEVER_BE_RETURNED_123456789';
const APP_SECRET = 'phase7-app-secret-never-returned';

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

const CONFIG: MetaConnectionBootstrap = {
  connectionName: 'primary',
  appId: '1234567890',
  accessToken: TOKEN,
  pageAccessToken: TOKEN,
  appSecret: APP_SECRET,
  businessId: 'business-1',
  catalogId: 'catalog-1',
  datasetId: 'dataset-1',
  pixelId: 'pixel-1',
  adAccountId: 'act_1001',
  pageId: 'page-1',
  instagramAccountId: 'ig-1',
  graphApiVersion: 'v24.0',
  tokenRef: 'secret-manager:meta/system-user',
  requiredPermissions: ['ads_management', 'business_management'],
};

function healthyFetch(): typeof fetch {
  return async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const authorization = new Headers(init?.headers).get('authorization');
    assert.ok(authorization?.startsWith('Bearer '));
    if (url.pathname.endsWith('/debug_token')) {
      assert.equal(authorization, `Bearer ${CONFIG.appId}|${APP_SECRET}`);
      return json({ data: { app_id: CONFIG.appId, is_valid: true, type: 'SYSTEM_USER', expires_at: 1800000000, data_access_expires_at: 1801000000, scopes: CONFIG.requiredPermissions } });
    }
    assert.equal(authorization, `Bearer ${TOKEN}`);
    assert.equal(isAppSecretProof(url.searchParams.get('appsecret_proof')), true);
    if (url.pathname.endsWith('/me/permissions')) {
      return json({ data: CONFIG.requiredPermissions.map((permission) => ({ permission, status: 'granted' })) });
    }
    const id = decodeURIComponent(url.pathname.split('/').at(-1) ?? '');
    return json({ id, name: `Asset ${id}` });
  };
}

test('appsecret_proof uses deterministic HMAC SHA-256', () => {
  const proof = buildAppSecretProof('token', 'secret');
  assert.equal(proof, 'e941110e3d2bfe82621f0e3e1434730d7305d106c5f68c87165d0b27a4611a4a');
  assert.equal(isAppSecretProof(proof), true);
});

test('secret redaction removes access tokens, bearer values and proof query values', () => {
  const source = `Bearer ${TOKEN} access_token=${TOKEN}&input_token=${TOKEN}&appsecret_proof=${'a'.repeat(64)}`;
  const redacted = redactMetaSecrets(source);
  assert.equal(redacted.includes(TOKEN), false);
  assert.equal(redacted.includes('a'.repeat(64)), false);
});

test('token debug verifies app association and does not return token or secret', async () => {
  const result = await debugMetaAccessToken({
    accessToken: TOKEN,
    appId: CONFIG.appId,
    appSecret: APP_SECRET,
    graphApiVersion: 'v24.0',
    fetchImpl: healthyFetch(),
  });
  assert.equal(result.valid, true);
  assert.equal(result.appIdMatches, true);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(TOKEN), false);
  assert.equal(serialized.includes(APP_SECRET), false);
});

test('token debug fails closed on app mismatch', async () => {
  const fetchImpl: typeof fetch = async () => json({ data: { app_id: 'different-app', is_valid: true, scopes: [] } });
  const result = await debugMetaAccessToken({ accessToken: TOKEN, appId: CONFIG.appId, appSecret: APP_SECRET, graphApiVersion: 'v24.0', fetchImpl });
  assert.equal(result.valid, false);
  assert.equal(result.appIdMatches, false);
  assert.equal(result.error?.code, 'META_TOKEN_APP_MISMATCH');
});

test('version comparison and policy enforce minimum, warnings and target regression', () => {
  assert.ok(compareMetaVersions('v25.0', 'v24.0') > 0);
  const policy = loadMetaApiVersionPolicy();
  const v23 = evaluateMetaVersionPolicy({ configuredVersion: 'v23.0', sdkVersion: '24.0.1', now: NOW, policy });
  assert.equal(v23.status, 'ERROR');
  const v24 = evaluateMetaVersionPolicy({ configuredVersion: 'v24.0', sdkVersion: '24.0.1', now: NOW, policy });
  assert.equal(v24.status, 'VERSION_WARNING');
  assert.ok(v24.warnings.includes('GRAPH_API_VERSION_UPGRADE_AVAILABLE'));
  const v25 = evaluateMetaVersionPolicy({ configuredVersion: 'v25.0', sdkVersion: '24.0.1', now: NOW, policy });
  assert.equal(v25.status, 'VERSION_WARNING');
  assert.ok(v25.warnings.includes('TARGET_VERSION_REGRESSION_PENDING'));
});

test('full readiness verifies token, permissions and every configured asset through API', async () => {
  const result = await checkMetaConnectionReadiness({ config: CONFIG, fetchImpl: healthyFetch(), now: NOW, persist: false });
  assert.equal(result.status, 'VERSION_WARNING');
  assert.equal(result.token.valid, true);
  assert.equal(result.permissions.ok, true);
  for (const asset of Object.values(result.assets)) {
    assert.equal(asset.configured, true);
    assert.equal(asset.ok, true);
  }
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(TOKEN), false);
  assert.equal(serialized.includes(APP_SECRET), false);
});

test('missing token is unconfigured and does not call Meta', async () => {
  let called = false;
  const result = await checkMetaConnectionReadiness({
    config: { ...CONFIG, accessToken: undefined, pageAccessToken: undefined, tokenRef: undefined },
    fetchImpl: async () => { called = true; throw new Error('unexpected'); },
    now: NOW,
    persist: false,
  });
  assert.equal(called, false);
  assert.equal(result.status, 'UNCONFIGURED');
  assert.equal(result.token.configured, false);
});

test('wrong asset produces ASSET_NOT_FOUND without exposing request secrets', async () => {
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.pathname.endsWith('/debug_token')) return json({ data: { app_id: CONFIG.appId, is_valid: true, scopes: CONFIG.requiredPermissions } });
    if (url.pathname.endsWith('/me/permissions')) return json({ data: CONFIG.requiredPermissions.map((permission) => ({ permission, status: 'granted' })) });
    if (url.pathname.endsWith('/catalog-1')) return json({ error: { code: 100, message: `Unsupported get request. ${TOKEN}` } }, 400);
    const id = decodeURIComponent(url.pathname.split('/').at(-1) ?? '');
    assert.ok(new Headers(init?.headers).get('authorization'));
    return json({ id });
  };
  const result = await checkMetaConnectionReadiness({ config: CONFIG, fetchImpl, now: NOW, persist: false });
  assert.equal(result.status, 'ASSET_NOT_FOUND');
  assert.equal(result.assets.catalog.status, 'ASSET_NOT_FOUND');
  assert.equal(JSON.stringify(result).includes(TOKEN), false);
});

test('schema and migration persist connection checks and version policy', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const migration = fs.readFileSync('prisma/migrations/20260717050000_meta_v6_phase7_connection_health/migration.sql', 'utf8');
  for (const token of ['enum MetaConnectionStatus', 'model MetaConnection', 'model MetaConnectionCheck', 'model MetaApiVersionPolicy']) {
    assert.match(schema, new RegExp(token));
    assert.match(migration, new RegExp(token.replace('enum ', '').replace('model ', '')));
  }
  assert.match(migration, /official expiration remained TBD|without inventing an official expiration date/i);
});

test('connection jobs never carry access tokens or app secrets', () => {
  const types = fs.readFileSync('lib/jobs/job-types.ts', 'utf8');
  const queues = fs.readFileSync('lib/jobs/queues.ts', 'utf8');
  assert.match(types, /SECRET_IN_JOB_PAYLOAD/);
  assert.match(types, /checks: Array<'TOKEN' \| 'PERMISSIONS' \| 'ASSETS' \| 'VERSION'>/);
  assert.doesNotMatch(queues, /accessToken:\s*input/);
  assert.doesNotMatch(queues, /appSecret:\s*input/);
});

test('admin connection route is SUPER_ADMIN controlled and never accepts token rotation values', () => {
  const route = fs.readFileSync('app/api/admin/meta/connection/route.ts', 'utf8');
  assert.match(route, /requireSuperAdmin/);
  assert.match(route, /action must be recheck/);
  assert.doesNotMatch(route, /body\.accessToken/);
  assert.doesNotMatch(route, /body\.appSecret/);
});
