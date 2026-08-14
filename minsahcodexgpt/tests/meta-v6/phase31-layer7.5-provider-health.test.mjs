import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('provider health covers scoped assets, revocation and safe remediation', () => {
  const health = source('lib/meta-platform/admin/provider-health.ts');
  for (const scope of ['APP', 'BUSINESS', 'PAGE', 'INSTAGRAM_ACCOUNT', 'AD_ACCOUNT', 'FORM']) assert.match(health, new RegExp(`'${scope}'`));
  assert.match(health, /revokedAt/);
  assert.match(health, /REAUTHORIZE_PROVIDER_ASSET/);
  assert.match(health, /REVIEW_REQUIRED_PERMISSIONS/);
  assert.match(health, /lastVerifiedAt/);
});

test('credential projections omit secret references and token values', () => {
  const health = source('lib/meta-platform/admin/provider-health.ts');
  assert.doesNotMatch(health, /select:\s*\{[^}]*secretRef/s);
  assert.doesNotMatch(health, /select:\s*\{[^}]*tokenRef/s);
  const route = source('app/api/admin/meta/health/route.ts');
  assert.match(route, /META_OPS_VIEW/);
  assert.match(route, /assertMetaAdminSafeDto/);
  assert.match(route, /metaAdminNoStoreHeaders/);
});
