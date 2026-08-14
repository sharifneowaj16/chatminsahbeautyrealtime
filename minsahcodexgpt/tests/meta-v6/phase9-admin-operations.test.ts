import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildMetaAdminPayloadHash, getMetaAdminActionPolicy } from '@/lib/meta/admin/policy';
import { redactMetaAdminData } from '@/lib/meta/admin/redaction';
import { describeMetaFailure, describeMetaProviderState } from '@/lib/meta/admin/status';

test('approval payload hash is stable across object key order and does not depend on raw secrets', () => {
  const left = buildMetaAdminPayloadHash({ outboxId: 'evt-1', nested: { b: 2, a: 1 }, accessToken: 'secret-a' });
  const right = buildMetaAdminPayloadHash({ accessToken: 'secret-b', nested: { a: 1, b: 2 }, outboxId: 'evt-1' });
  assert.equal(left, right);
  assert.equal(left.length, 64);
});

test('dangerous actions require approval while routine health checks stay directly operable', () => {
  assert.equal(getMetaAdminActionPolicy('META_EVENT_REPLAY').requiresApproval, true);
  assert.equal(getMetaAdminActionPolicy('META_JOB_CANCEL').requiresApproval, true);
  assert.equal(getMetaAdminActionPolicy('META_CATALOG_DELETE').risk, 'CRITICAL');
  assert.equal(getMetaAdminActionPolicy('META_CONNECTION_RECHECK').requiresApproval, false);
  assert.equal(getMetaAdminActionPolicy('META_CATALOG_SYNC').requiresApproval, false);
});

test('recursive admin redaction removes secrets and direct PII but preserves masked fields', () => {
  const safe = redactMetaAdminData({
    accessToken: 'token', appSecret: 'secret', phone: '01712345678', email: 'person@example.com',
    phoneMasked: '*******5678', nested: { authorization: 'Bearer abc.def', note: 'contact person@example.com' },
  }) as Record<string, unknown>;
  assert.equal(safe.accessToken, '[REDACTED]');
  assert.equal(safe.appSecret, '[REDACTED]');
  assert.equal(safe.phone, '[REDACTED]');
  assert.equal(safe.email, '[REDACTED]');
  assert.equal(safe.phoneMasked, '*******5678');
  assert.doesNotMatch(JSON.stringify(safe), /abc\.def|person@example\.com|01712345678/);
});

test('submitted states are pending, never final success', () => {
  assert.deepEqual(describeMetaProviderState('SUBMITTED'), { status: 'SUBMITTED', final: false, pending: true, label: 'SUBMITTED — awaiting final provider state' });
  assert.equal(describeMetaProviderState('SENT').final, true);
  assert.equal(describeMetaProviderState('FAILED_PERMANENT').final, true);
  assert.equal(describeMetaProviderState('PROCESSING').pending, true);
});

test('failure descriptions remain human-readable and redact provider details', () => {
  const result = describeMetaFailure({ code: 190, message: 'OAuth token invalid for person@example.com', accessToken: 'secret' });
  assert.match(result.hint, /Token is invalid or expired/);
  assert.doesNotMatch(JSON.stringify(result), /person@example\.com|\"accessToken\":\"secret\"/);
});

test('schema and migration provide typed approval lifecycle and immutable audit storage', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const migration = fs.readFileSync('prisma/migrations/20260718010000_meta_v6_phase9_admin_operations/migration.sql', 'utf8');
  for (const token of ['enum MetaAdminActionRisk', 'enum MetaAdminApprovalStatus', 'enum MetaAdminAuditOutcome', 'model MetaAdminApproval', 'model MetaAdminAudit']) assert.match(schema, new RegExp(token));
  assert.match(schema, /status\s+MetaAdminApprovalStatus\s+@default\(PENDING\)/);
  assert.match(schema, /model MetaAdminAudit[\s\S]*createdAt[\s\S]*@@index\(\[actorId, createdAt\]\)/);
  assert.doesNotMatch(schema.match(/model MetaAdminAudit \{[\s\S]*?\n\}/)?.[0] ?? '', /updatedAt/);
  assert.match(migration, /CREATE TYPE "MetaAdminApprovalStatus"/);
  assert.match(migration, /MetaAdminApproval_requestedById_fkey/);
});

test('permission matrix separates viewing, operating, approval and audit access', () => {
  const source = fs.readFileSync('lib/auth/admin-permissions.ts', 'utf8');
  for (const token of ['META_OPS_VIEW', 'META_OPS_OPERATE', 'META_OPS_APPROVE', 'META_OPS_AUDIT']) assert.match(source, new RegExp(token));
  const adminBlock = source.match(/ADMIN:\s*\[[\s\S]*?\],\n\s*MANAGER/)?.[0] ?? '';
  const managerBlock = source.match(/MANAGER:\s*\[[\s\S]*?\],\n\s*STAFF/)?.[0] ?? '';
  assert.match(adminBlock, /META_OPS_VIEW/);
  assert.match(adminBlock, /META_OPS_AUDIT/);
  assert.doesNotMatch(adminBlock, /META_OPS_OPERATE|META_OPS_APPROVE/);
  assert.match(managerBlock, /META_OPS_VIEW/);
  assert.doesNotMatch(managerBlock, /META_OPS_OPERATE/);
});

test('approval and audit identities omit administrator email addresses', () => {
  const service = fs.readFileSync('lib/meta/admin/service.ts', 'utf8');
  assert.match(service, /requestedBy: \{ select: \{ id: true, name: true \} \}/);
  assert.match(service, /actor: \{ select: \{ id: true, name: true \} \}/);
  assert.doesNotMatch(service, /select: \{ id: true, name: true, email: true \}/);
});

test('dangerous replay endpoints claim exact approvals and return mutation audit IDs', () => {
  const events = fs.readFileSync('app/api/admin/meta/events/route.ts', 'utf8');
  const jobs = fs.readFileSync('app/api/admin/meta/jobs/route.ts', 'utf8');
  for (const source of [events, jobs]) {
    assert.match(source, /executeMetaAdminAction/);
    assert.match(source, /approvalId/);
    assert.match(source, /auditId/);
    assert.match(source, /requireSuperAdmin/);
  }
  assert.match(events, /META_EVENT_REPLAY/);
  assert.match(jobs, /META_JOB_REPLAY/);
  assert.match(jobs, /META_JOB_CANCEL/);
});

test('operations API aggregates final-state sources and exposes only shaped failure summaries', () => {
  const route = fs.readFileSync('app/api/admin/meta/operations/summary/route.ts', 'utf8');
  for (const token of ['metaCatalogSyncItem.groupBy', 'metaEventOutbox.groupBy', 'metaJobAudit.groupBy', 'metaLead.groupBy', 'metaAdminApproval.groupBy', 'describeMetaProviderState', 'describeMetaFailure']) assert.match(route, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(route, /META_OPS_VIEW/);
  assert.match(route, /failure: connectionRow\.lastError \? describeMetaFailure/);
  assert.match(route, /failure: describeMetaFailure\(item\.lastError\)/);
  assert.doesNotMatch(route, /events:\s*failedEventRows\.map\(\(item\) => \(\{\s*\.\.\.item/);
  assert.doesNotMatch(route, /jobs:\s*failedJobRows\.map\(\(item\) => \(\{\s*\.\.\.item/);
  assert.doesNotMatch(route, /lastError:\s*(connectionRow|item)\.lastError/);
});

test('admin operations UI exposes all phase-nine control-plane sections', () => {
  const page = fs.readFileSync('app/admin/meta/page.tsx', 'utf8');
  for (const label of ['Overview', 'Connection', 'Catalog', 'Events', 'Leads', 'Jobs', 'Approvals', 'Attribution', 'Audit logs']) assert.match(page, new RegExp(label));
  assert.match(page, /Request replay approval/);
  assert.match(page, /Execute approved action/);
  assert.match(page, /Submission acceptance is displayed as pending/);
});
