import { read, runAudit } from './meta-platform-phase31-layer7-audit-lib.mjs';
const dto = read('lib/meta-platform/admin/jobs-dto.ts');
const status = read('lib/meta-platform/admin/jobs-status.ts');
const route = read('app/api/admin/meta/jobs/route.ts');
const ops = read('app/api/admin/meta/operations/summary/route.ts');
runAudit('Layer 7.6 audit', [
  ['durable job query', status.includes('metaJobAudit.findMany')],
  ['status counts', status.includes('groupBy')],
  ['bounded cursor list', status.includes('encodeMetaAdminCursor') && route.includes('parseMetaAdminLimit')],
  ['replay eligibility projected', dto.includes('evaluateMetaJobReplayEligibility')],
  ['unknown outcome blocked', dto.includes('UNKNOWN_OUTCOME_RECONCILIATION_REQUIRED')],
  ['payload omitted from projection', !/\bpayload\s*:/.test(dto)],
  ['route DTO scan', route.includes('assertMetaAdminSafeDto')],
  ['operations failures sanitized', ops.includes('projectMetaAdminFailure') && ops.includes('assertMetaAdminSafeDto')],
]);
