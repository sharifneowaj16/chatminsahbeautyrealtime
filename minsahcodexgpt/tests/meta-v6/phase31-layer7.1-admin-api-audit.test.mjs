import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root = new URL('../../', import.meta.url);
const source = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const exists = (path) => fs.existsSync(new URL(path, root));

test('Layer 7 audit report inventories admin/API boundaries', () => {
  assert.equal(exists('evidence/phase31-meta-social-crm/09-admin-api-audit.md'), true);
  const report = source('evidence/phase31-meta-social-crm/09-admin-api-audit.md');
  for (const token of ['/api/admin/inbox/messages', '/api/admin/meta/instagram', '/api/admin/meta/leads', '/api/admin/meta/health', '/api/admin/meta/jobs']) assert.match(report, new RegExp(token.replaceAll('/', '\\/')));
  for (const token of ['Authorization', 'Redaction', 'Pagination', 'Mutation boundary', 'Legacy ownership']) assert.match(report, new RegExp(token, 'i'));
});

test('shared admin presentation contracts and mutation guard exist', () => {
  for (const path of ['lib/meta-platform/admin/contracts.ts', 'lib/auth/admin-csrf.ts', 'app/api/admin/_utils.ts', 'lib/adminFetch.ts']) assert.equal(exists(path), true, path);
  const contracts = source('lib/meta-platform/admin/contracts.ts');
  assert.match(contracts, /assertMetaAdminSafeDto/);
  assert.match(contracts, /parseMetaAdminLimit/);
  assert.match(contracts, /metaAdminNoStoreHeaders/);
  const utils = source('app/api/admin/_utils.ts');
  assert.match(utils, /requireAdminMutationPermission/);
  assert.match(utils, /requireSuperAdminMutation/);
});
