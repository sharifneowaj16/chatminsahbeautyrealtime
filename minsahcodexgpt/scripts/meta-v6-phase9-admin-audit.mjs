#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
const has = (file, ...tokens) => { const source = read(file); return source && tokens.every((token) => source.includes(token)); };
const auditModel = read('prisma/schema.prisma').match(/model MetaAdminAudit \{[\s\S]*?\n\}/)?.[0] ?? '';

const checks = [
  ['P9-01', 'Typed risk enum', has('prisma/schema.prisma', 'enum MetaAdminActionRisk', 'CRITICAL')],
  ['P9-02', 'Typed approval lifecycle', has('prisma/schema.prisma', 'enum MetaAdminApprovalStatus', 'EXECUTING', 'EXECUTED', 'EXPIRED')],
  ['P9-03', 'Typed audit outcome', has('prisma/schema.prisma', 'enum MetaAdminAuditOutcome', 'DENIED')],
  ['P9-04', 'Approval model', has('prisma/schema.prisma', 'model MetaAdminApproval', 'payloadHash', 'requestedById', 'approvedById')],
  ['P9-05', 'Immutable audit model', auditModel.includes('beforeData') && auditModel.includes('afterData') && auditModel.includes('createdAt') && !auditModel.includes('updatedAt')],
  ['P9-06', 'Forward migration', has('prisma/migrations/20260718010000_meta_v6_phase9_admin_operations/migration.sql', 'CREATE TABLE "MetaAdminApproval"', 'CREATE TABLE "MetaAdminAudit"')],
  ['P9-07', 'Separated permissions', has('lib/auth/admin-permissions.ts', 'META_OPS_VIEW', 'META_OPS_OPERATE', 'META_OPS_APPROVE', 'META_OPS_AUDIT')],
  ['P9-08', 'Recursive redaction', has('lib/meta/admin/redaction.ts', 'REDACTED_EMAIL', 'REDACTED_PHONE', 'authorization')],
  ['P9-09', 'Canonical payload hash', has('lib/meta/admin/policy.ts', 'canonicalize', 'sha256', 'buildMetaAdminPayloadHash')],
  ['P9-10', 'Dangerous action policy', has('lib/meta/admin/policy.ts', 'META_EVENT_REPLAY', 'META_JOB_CANCEL', 'requiresApproval: true')],
  ['P9-11', 'Two-person high-risk rule', has('lib/meta/admin/service.ts', 'SELF_APPROVAL_BLOCKED', 'different approver')],
  ['P9-12', 'Optimistic approval claim', has('lib/meta/admin/service.ts', 'updateMany', "status: 'EXECUTING'", 'APPROVAL_ALREADY_CONSUMED')],
  ['P9-13', 'Exact payload approval binding', has('lib/meta/admin/service.ts', 'payloadHash', 'APPROVAL_MISMATCH')],
  ['P9-14', 'Success/failure audit wrapper', has('lib/meta/admin/service.ts', "outcome: 'SUCCEEDED'", "outcome: error instanceof MetaAdminActionError ? 'DENIED' : 'FAILED'")],
  ['P9-15', 'Operations summary API with shaped failures', (() => {
    const source = read('app/api/admin/meta/operations/summary/route.ts');
    return ['META_OPS_VIEW', 'metaCatalogSyncItem.groupBy', 'metaEventOutbox.groupBy', 'metaJobAudit.groupBy', 'metaLead.groupBy', 'describeMetaFailure'].every((token) => source.includes(token))
      && !/events:\s*failedEventRows\.map\(\(item\) => \(\{\s*\.\.\.item/.test(source)
      && !/jobs:\s*failedJobRows\.map\(\(item\) => \(\{\s*\.\.\.item/.test(source)
      && !/lastError:\s*(connectionRow|item)\.lastError/.test(source);
  })()],
  ['P9-16', 'Approval list/request API', has('app/api/admin/meta/approvals/route.ts', 'META_OPS_OPERATE', 'createMetaAdminApproval', 'META_APPROVAL_REQUEST')],
  ['P9-17', 'Approval review API', has('app/api/admin/meta/approvals/[approvalId]/route.ts', 'META_OPS_APPROVE', 'reviewMetaAdminApproval')],
  ['P9-18', 'Audit log API and safe admin identity shape', has('app/api/admin/meta/audit-logs/route.ts', 'META_OPS_AUDIT', 'redactMetaAdminData') && !read('lib/meta/admin/service.ts').includes('select: { id: true, name: true, email: true }')],
  ['P9-19', 'Event replay approval gate', has('app/api/admin/meta/events/route.ts', 'requireSuperAdmin', 'META_EVENT_REPLAY', 'approvalId', 'executeMetaAdminAction')],
  ['P9-20', 'Job replay/cancel approval gates', has('app/api/admin/meta/jobs/route.ts', 'requireSuperAdmin', 'META_JOB_REPLAY', 'META_JOB_CANCEL', 'approvalId')],
  ['P9-21', 'Catalog sync audited', has('app/api/admin/meta/catalogs/sync/route.ts', 'META_CATALOG_SYNC', 'auditId')],
  ['P9-22', 'Connection recheck audited', has('app/api/admin/meta/connection/route.ts', 'META_CONNECTION_RECHECK', 'auditId')],
  ['P9-23', 'Lead mutation audited', has('app/api/admin/meta/leads/[leadId]/route.ts', 'META_LEAD_UPDATE', 'beforeData', 'auditId')],
  ['P9-24', 'Final-state display policy', has('lib/meta/admin/status.ts', 'awaiting final provider state', 'FAILED_PERMANENT')],
  ['P9-25', 'Human-readable failure hints', has('lib/meta/admin/status.ts', 'Token is invalid or expired', 'rate limiting', 'request payload is invalid')],
  ['P9-26', 'Unified admin route', has('app/admin/meta/page.tsx', 'Meta Operations Center', 'Overview', 'Approvals', 'Audit logs')],
  ['P9-27', 'Approval controls in UI', has('app/admin/meta/page.tsx', 'Request replay approval', 'Execute approved action', 'onDecide')],
  ['P9-28', 'Legacy tools preserved', has('app/admin/meta/page.tsx', '/admin/meta-business', 'Legacy Meta tools')],
  ['P9-29', 'Navigation entry', has('app/admin/AdminLayoutWrapper.tsx', "href: '/admin/meta'", 'META_OPS_VIEW')],
  ['P9-30', 'Semantic test suite', has('tests/meta-v6/phase9-admin-operations.test.ts', 'submitted states are pending', 'dangerous replay endpoints')],
];
const failures = checks.filter(([, , ok]) => !ok);
for (const [id, label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${label}`);
console.log(`\nPhase 09 static audit: ${checks.length - failures.length}/${checks.length} passed`);
if (failures.length) process.exit(1);
