import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const bridge = read('lib/meta-platform/domains/facebook/legacy-bridge.ts');
const domain = read('lib/meta-platform/domains/facebook/inbox-sync.ts');
const flags = read('lib/meta-platform/domains/facebook/feature-flags.ts');
const cutover = read('lib/meta-platform/domains/facebook/cutover.ts');
const legacy = read('lib/facebook/inboxSync.ts');
const repo = read('lib/meta-platform/repositories/facebook-inbox.ts');
const worker = read('workers/meta-social.worker.ts');
const route = read('app/api/admin/social/facebook/sync/route.ts');
const compatibilityRoute = read('app/api/admin/inbox/sync/route.ts');
const tsconfig = read('tsconfig.phase31-layer5.json');
let passed = 0;
const checks = [];
function check(name, condition) {
  checks.push({ name, condition: Boolean(condition) });
  if (condition) passed += 1;
  console.log(`${condition ? '[PASS]' : '[FAIL]'} ${name}`);
}

check('Facebook inbox domain planner exists', domain.includes('planFacebookInboxSnapshot'));
check('domain planner deduplicates provider message IDs before side effects', domain.includes('seenProviderMessages.has(providerMessageId)') && domain.includes('duplicateProviderMessages += 1'));
check('safe summary exposes digest and counts only', domain.includes('FacebookInboxSafeSummary') && !domain.slice(domain.indexOf('export type FacebookInboxSafeSummary'), domain.indexOf('export function summarizeFacebookInboxPlan')).includes('senderName'));
check('runtime modes are safe LEGACY SHADOW PLATFORM rollback and blocked', flags.includes("'LEGACY' | 'SHADOW' | 'PLATFORM' | 'LEGACY_ROLLBACK' | 'BLOCKED'") && cutover.includes('getMetaFacebookRealtimeCutoverStatus'));
check('production bridge uses central Graph transport facade', bridge.includes('createMetaGraphClient') && !bridge.includes('createLegacyMetaGraphClient'));
check('production bridge validates current Page permission health', bridge.includes("operation: 'FACEBOOK_INBOX_SYNC'") && bridge.indexOf('assertMetaPageHealthReady') < bridge.indexOf('fetchFacebookInboxSnapshot({'));
check('platform Facebook repository owns authoritative persistence', bridge.includes('persistFacebookInboxMessage') && repo.includes('platform_externalId'));
check('duplicate-safe persistence uses provider external ID unique boundary', repo.includes("platform: 'facebook'") && repo.includes('externalId: input.message.providerMessageId'));
check('SHADOW compares same snapshot without legacy execution or dual persistence', bridge.includes('summarizeLegacyFacebookInboxSnapshot(snapshot)') && !bridge.slice(bridge.indexOf("if (mode === 'SHADOW')"), bridge.indexOf('let createdMessages')).includes('syncRecentFacebookInboxLegacy') && (bridge.match(/persistFacebookInboxMessage\(/g) ?? []).length === 1);
check('legacy direct sync is isolated from main-app platform bridge', !bridge.includes('syncRecentFacebookInboxLegacy') && legacy.includes('syncRecentFacebookInboxLegacy'));
check('production social worker executes Facebook inbox domain', worker.includes('META_JOB_NAMES.FACEBOOK_PAGE_INBOX_SYNC') && worker.includes('executeFacebookInboxSyncProduction'));
check('canonical admin route queues production sync with permission guard', route.includes('META_SOCIAL_OPERATE') && route.includes('requestFacebookInboxSyncProduction'));
check('active UI compatibility route is platform-backed, not realtime proxy', compatibilityRoute.includes('requestFacebookInboxSyncProduction') && !compatibilityRoute.includes('REALTIME_SERVICE_URL') && !compatibilityRoute.includes('REPLY_API_SECRET'));
check('queue request contains references only', bridge.includes("kind: 'FACEBOOK_PAGE_SYNC_REQUEST'") && !/payloadRef[\s\S]{0,500}(accessToken|messageText|email|phone)/i.test(bridge));
check('safe progress excludes sender names and provider payloads', !/(senderName|messageText|rawPayload|accessToken)/.test(bridge.slice(bridge.indexOf('export type FacebookInboxSyncProgress'), bridge.indexOf('function boundedInt'))));
check('focused strict TypeScript includes Facebook domain files', tsconfig.includes('domains/facebook/inbox-sync.ts') && tsconfig.includes('domains/facebook/feature-flags.ts'));
check(
  'Prisma schema unchanged from the verified Layer 4 checkpoint',
  sha256('prisma/schema.prisma') === 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce',
);

console.log(`Layer 5.11 Facebook inbox bridge audit: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
