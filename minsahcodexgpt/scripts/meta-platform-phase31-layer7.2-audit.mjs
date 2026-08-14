import { read, runAudit } from './meta-platform-phase31-layer7-audit-lib.mjs';
const repo = read('lib/meta-platform/admin/inbox-repository.ts');
const messages = read('app/api/admin/inbox/messages/route.ts');
const reply = read('app/api/admin/inbox/reply/route.ts');
const domain = read('lib/meta-platform/domains/facebook/admin-reply.ts');
const ui = read('app/components/admin/SocialMediaInboxChat.tsx');
runAudit('Layer 7.2 audit', [
  ['durable SocialMessage read', repo.includes('socialMessage.findMany')],
  ['cursor pagination', repo.includes('encodeMetaAdminCursor')],
  ['read permission', messages.includes('META_SOCIAL_VIEW')],
  ['reply mutation guard', reply.includes('requireAdminMutationPermission')],
  ['reply delegated to domain', reply.includes('requestFacebookAdminReplyProduction') && domain.includes('requestFacebookAdminReplyProduction') && domain.includes('evaluateFacebookAdminReplyEligibility')],
  ['no direct fetch in UI route', !reply.includes('fetch(')],
  ['admin UI uses admin endpoint', ui.includes('/api/admin/inbox/messages') && !ui.includes('/api/social/messages')],
]);
