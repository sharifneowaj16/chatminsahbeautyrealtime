import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const root = new URL('../../', import.meta.url);
const source = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const exists = (path) => fs.existsSync(new URL(path, root));

test('all Layer 7 evidence files exist', () => {
  for (const path of [
    'evidence/phase31-meta-social-crm/09-admin-api-audit.md',
    'evidence/phase31-meta-social-crm/09-admin-api.md',
    ...['7.1','7.2','7.3','7.4','7.5','7.6','7.7','7.8'].map((id) => `evidence/phase31-meta-social-crm/items/phase31_layer${id}_result.md`),
  ]) assert.equal(exists(path), true, path);
});

test('completed item gate logs contain PASS and no failing test summary', () => {
  for (const id of ['7.1','7.2','7.3','7.4','7.5','7.6','7.7']) {
    const path = `evidence/phase31-meta-social-crm/logs/phase31_layer${id}_gate.log`;
    assert.equal(exists(path), true, path);
    const log = source(path);
    assert.match(log, /PASS|# pass [1-9]/);
    assert.doesNotMatch(log, /# fail [1-9]|^not ok/m);
  }
});

test('Layer 7 package scripts are registered', () => {
  const pkg = JSON.parse(source('package.json'));
  for (const id of ['7.1','7.2','7.3','7.4','7.5','7.6','7.7','7.8']) {
    assert.equal(typeof pkg.scripts[`test:meta-v6-phase31-layer${id}`], 'string');
    assert.equal(typeof pkg.scripts[`qa:meta-platform-phase31-layer${id}`], 'string');
    assert.equal(typeof pkg.scripts[`qa:phase31-meta-layer${id}`], 'string');
  }
  assert.equal(typeof pkg.scripts['qa:phase31-meta-layer7'], 'string');
});

test('Prisma schema remains unchanged for presentation-only Layer 7', () => {
  const digest = crypto.createHash('sha256').update(fs.readFileSync(new URL('prisma/schema.prisma', root))).digest('hex');
  assert.equal(digest, 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');
});

test('sensitive DTO scanner and no-store headers are applied to primary Layer 7 routes', () => {
  for (const path of [
    'app/api/admin/inbox/messages/route.ts', 'app/api/admin/inbox/reply/route.ts',
    'app/api/admin/meta/instagram/health/route.ts', 'app/api/admin/meta/instagram/conversations/route.ts',
    'app/api/admin/meta/leads/route.ts', 'app/api/admin/meta/health/route.ts', 'app/api/admin/meta/jobs/route.ts',
  ]) {
    const text = source(path);
    assert.match(text, /assertMetaAdminSafeDto/);
    assert.match(text, /metaAdminNoStoreHeaders/);
  }
});
