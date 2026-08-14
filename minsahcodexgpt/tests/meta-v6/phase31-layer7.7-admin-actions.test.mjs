import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluateAdminCsrf } from '../../lib/auth/admin-csrf.ts';
import { getMetaAdminActionControls } from '../../lib/meta-platform/admin/jobs-dto.ts';
const source = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const request = ({ method = 'POST', origin = 'https://admin.example', marker = '1', authorization = '', fetchSite = 'same-origin' } = {}) => ({
  method,
  nextUrl: { origin: 'https://admin.example' },
  headers: { get(name) { const values = { origin, referer: '', 'x-admin-request': marker, authorization, 'sec-fetch-site': fetchSite }; return values[name.toLowerCase()] || null; } },
});

test('admin mutation CSRF contract allows bearer or same-origin marker and blocks cross-site', () => {
  assert.equal(evaluateAdminCsrf(request()).allowed, true);
  assert.equal(evaluateAdminCsrf(request({ marker: '', authorization: 'Bearer service-token' })).reasonCode, 'BEARER_AUTH');
  assert.equal(evaluateAdminCsrf(request({ origin: 'https://evil.example' })).allowed, false);
  assert.equal(evaluateAdminCsrf(request({ fetchSite: 'cross-site' })).reasonCode, 'ADMIN_CSRF_FETCH_SITE_BLOCKED');
});

test('replay and cancel controls honor global and narrow kill switches', () => {
  assert.equal(getMetaAdminActionControls({}).replay.enabled, true);
  assert.equal(getMetaAdminActionControls({ META_ADMIN_REPLAY_KILL_SWITCH: 'true' }).replay.enabled, false);
  assert.equal(getMetaAdminActionControls({ META_PLATFORM_GLOBAL_KILL_SWITCH: '1' }).cancel.enabled, false);
});

test('admin action routes require RBAC/CSRF and delegate side effects', () => {
  const jobs = source('app/api/admin/meta/jobs/route.ts');
  assert.match(jobs, /requireAdminMutationPermission/);
  assert.match(jobs, /executeMetaAdminAction/);
  assert.match(jobs, /cancelMetaAdminJob/);
  assert.match(jobs, /replayMetaDeadLetter/);
  assert.doesNotMatch(jobs, /new Redis|new Queue|fetch\s*\(/);
  assert.match(source('app/api/admin/meta/approvals/route.ts'), /requireAdminMutationPermission/);
  assert.match(source('app/api/admin/meta/approvals/[approvalId]/route.ts'), /requireAdminMutationPermission/);
  assert.match(source('app/api/admin/meta/events/route.ts'), /requireSuperAdminMutation/);
  const deadLetter = source('lib/jobs/dead-letter.ts');
  assert.match(deadLetter, /getMetaAdminActionControls/);
  assert.match(deadLetter, /controls\.replay\.enabled/);
});
