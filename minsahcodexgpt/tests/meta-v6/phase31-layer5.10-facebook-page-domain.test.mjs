import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { evaluateMetaPagePermissions } from '../../lib/meta-platform/domains/pages/permissions.ts';
import { assertMetaPageHealthReady, evaluateMetaPageHealth } from '../../lib/meta-platform/domains/pages/page-identity.ts';
import { getMetaPageDomainRuntimeMode } from '../../lib/meta-platform/domains/pages/feature-flags.ts';

const now = new Date('2026-07-26T18:00:00.000Z');
const readiness = {
  status: 'HEALTHY',
  tokenRef: 'secret-ref:page',
  token: { configured: true, valid: true, expiresAt: '2026-08-26T18:00:00.000Z', dataAccessExpiresAt: '2026-09-26T18:00:00.000Z' },
  permissions: { checked: true, granted: ['pages_manage_metadata', 'leads_retrieval', 'pages_messaging', 'pages_read_engagement'], declined: [], missing: [] },
  assets: {
    page: { configured: true, ok: true, status: 'HEALTHY', id: 'page-1' },
    app: { configured: true, ok: true, status: 'HEALTHY', id: 'app-1' },
    business: { configured: true, ok: true, status: 'HEALTHY', id: 'business-1' },
    instagramAccount: { configured: true, ok: true, status: 'HEALTHY', id: 'ig-1' },
  },
  lastCheckedAt: '2026-07-26T17:55:00.000Z',
};

function evaluate(overrides = {}) {
  return evaluateMetaPageHealth({
    operation: 'LEADGEN_SUBSCRIBE',
    expectedPageId: 'page-1',
    expectedAppId: 'app-1',
    expectedBusinessId: 'business-1',
    expectedInstagramAccountId: 'ig-1',
    readiness,
    now,
    ...overrides,
  });
}

test('page health verifies token, Page, app, business, Instagram binding and operation permissions', () => {
  const healthy = evaluate();
  assert.equal(healthy.ready, true);
  assert.equal(healthy.reasonCode, 'HEALTHY');
  assert.doesNotThrow(() => assertMetaPageHealthReady(healthy));
  assert.equal(evaluate({ expectedPageId: 'page-other' }).reasonCode, 'META_PAGE_IDENTITY_MISMATCH');
  assert.equal(evaluate({ expectedAppId: 'app-other' }).reasonCode, 'META_APP_IDENTITY_MISMATCH');
  assert.equal(evaluate({ expectedBusinessId: 'business-other' }).reasonCode, 'META_BUSINESS_IDENTITY_MISMATCH');
  assert.equal(evaluate({ expectedInstagramAccountId: 'ig-other' }).reasonCode, 'META_INSTAGRAM_PAGE_BINDING_MISMATCH');
});

test('expired or unverified token and data access fail closed', () => {
  assert.equal(evaluate({ readiness: { ...readiness, token: { ...readiness.token, valid: false }, status: 'INVALID_TOKEN' } }).reasonCode, 'META_PAGE_TOKEN_UNVERIFIED');
  assert.equal(evaluate({ readiness: { ...readiness, token: { ...readiness.token, expiresAt: now.toISOString() } } }).reasonCode, 'META_PAGE_TOKEN_EXPIRED');
  assert.equal(evaluate({ readiness: { ...readiness, token: { ...readiness.token, dataAccessExpiresAt: now.toISOString() } } }).reasonCode, 'META_PAGE_DATA_ACCESS_EXPIRED');
});

test('permissions are operation-specific and revoked permissions are visible safely', () => {
  const inbox = evaluateMetaPagePermissions({ operation: 'FACEBOOK_INBOX_SYNC', permissions: readiness.permissions });
  assert.equal(inbox.allowed, true);
  const missing = evaluateMetaPagePermissions({ operation: 'LEADGEN_SUBSCRIBE', permissions: { checked: true, granted: ['pages_manage_metadata'], declined: ['leads_retrieval'] } });
  assert.equal(missing.allowed, false);
  assert.deepEqual(missing.missing, ['leads_retrieval']);
  assert.deepEqual(missing.declined, ['leads_retrieval']);
  assert.equal(evaluate({ readiness: { ...readiness, permissions: { checked: true, granted: ['pages_manage_metadata'], declined: ['leads_retrieval'] } } }).reasonCode, 'META_PAGE_PERMISSION_MISSING');
});

test('page health projection contains no raw token or secret values', () => {
  const projection = evaluate();
  const json = JSON.stringify(projection);
  assert.doesNotMatch(json, /secret-ref:page|access_token|app_secret|pageAccessToken/);
  assert.equal(projection.token.configured, true);
});

test('production lead subscription route uses Page domain and shared Graph transport', () => {
  const route = fs.readFileSync('app/api/admin/meta/leads/subscribe/route.ts', 'utf8');
  const runtime = fs.readFileSync('lib/meta-platform/domains/pages/runtime.ts', 'utf8');
  const legacy = fs.readFileSync('lib/meta-business/leads.ts', 'utf8');
  const connectionRoute = fs.readFileSync('app/api/admin/meta/connection/route.ts', 'utf8');
  assert.match(route, /subscribeMetaPageLeadgenProduction/);
  assert.doesNotMatch(route, /requestData: body/);
  assert.match(runtime, /createMetaGraphClient/);
  assert.match(runtime, /evaluateMetaPageHealth/);
  assert.match(runtime, /subscribed_apps/);
  assert.match(runtime, /LEGACY_ROLLBACK/);
  assert.match(legacy, /subscribePageToLeadgenLegacy/);
  assert.match(connectionRoute, /bootstrapSafe/);
  assert.doesNotMatch(connectionRoute, /bootstrap, pageHealth/);
  assert.equal(getMetaPageDomainRuntimeMode({}), 'DOMAIN');
  assert.equal(getMetaPageDomainRuntimeMode({ META_PHASE31_PAGE_DOMAIN_RUNTIME: 'LEGACY_ROLLBACK' }), 'LEGACY_ROLLBACK');
});
