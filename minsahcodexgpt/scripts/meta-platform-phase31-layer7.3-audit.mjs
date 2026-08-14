import { read, runAudit } from './meta-platform-phase31-layer7-audit-lib.mjs';
const dto = read('lib/meta-platform/admin/instagram-dto.ts');
const status = read('lib/meta-platform/admin/instagram-status.ts');
const list = read('app/api/admin/meta/instagram/conversations/route.ts');
const detail = read('app/api/admin/meta/instagram/conversations/[conversationId]/route.ts');
const reply = read('app/api/admin/meta/instagram/conversations/[conversationId]/reply/route.ts');
runAudit('Layer 7.3 audit', [
  ['safe Instagram projector', dto.includes('projectInstagramConversationForAdmin')],
  ['reply eligibility projected', dto.includes('projectInstagramReplyEligibility')],
  ['receipt status included', status.includes('metaSocialWebhookReceipt')],
  ['job status included', status.includes('metaJobAudit')],
  ['bounded list and pageInfo', list.includes('parseMetaAdminLimit') && list.includes('pageInfo')],
  ['detail mutation guard', detail.includes('requireAdminMutationPermission')],
  ['reply mutation guard and DTO scan', reply.includes('requireAdminMutationPermission') && reply.includes('assertMetaAdminSafeDto')],
  ['raw policy fields omitted from projector output', !/return[\s\S]{0,300}policyData/.test(dto)],
]);
