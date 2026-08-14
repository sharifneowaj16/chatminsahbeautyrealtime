import { exists, read, runAudit } from './meta-platform-phase31-layer7-audit-lib.mjs';
const report = exists('evidence/phase31-meta-social-crm/09-admin-api-audit.md') ? read('evidence/phase31-meta-social-crm/09-admin-api-audit.md') : '';
const contracts = read('lib/meta-platform/admin/contracts.ts');
const utils = read('app/api/admin/_utils.ts');
runAudit('Layer 7.1 audit', [
  ['audit report exists', Boolean(report)],
  ['inbox inventory present', report.includes('/api/admin/inbox/messages')],
  ['Instagram inventory present', report.includes('/api/admin/meta/instagram')],
  ['lead inventory present', report.includes('/api/admin/meta/leads')],
  ['jobs inventory present', report.includes('/api/admin/meta/jobs')],
  ['safe DTO scanner exists', contracts.includes('assertMetaAdminSafeDto')],
  ['bounded pagination helper exists', contracts.includes('parseMetaAdminLimit')],
  ['mutation guard exists', utils.includes('requireAdminMutationPermission')],
]);
