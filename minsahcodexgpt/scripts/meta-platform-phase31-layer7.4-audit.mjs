import { read, runAudit } from './meta-platform-phase31-layer7-audit-lib.mjs';
const repo = read('lib/meta/leads/repository.ts');
const trace = read('lib/meta-platform/admin/lead-status.ts');
const list = read('app/api/admin/meta/leads/route.ts');
const detail = read('app/api/admin/meta/leads/[leadId]/route.ts');
runAudit('Layer 7.4 audit', [
  ['test lead visible', repo.includes('isTestLead')],
  ['receipt trace', trace.includes('metaSocialWebhookReceipt')],
  ['processing trace', trace.includes('metaLeadProcessingAttempt')],
  ['handoff trace', trace.includes('metaLeadHandoff')],
  ['duplicate trace', trace.includes('metaLeadDuplicate')],
  ['safe list DTO', list.includes('assertMetaAdminSafeDto')],
  ['privileged lead actions', list.includes('requireSuperAdminMutation') && detail.includes('requireSuperAdminMutation')],
  ['no raw encrypted fields in routes', !/(encryptedData|fieldData|rawPayload)/.test(list + detail)],
]);
