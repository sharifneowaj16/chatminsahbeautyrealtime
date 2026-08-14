import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
let passed = 0; let failed = 0;
function expect(label, condition) {
  if (condition) { passed += 1; console.log(`PASS ${label}`); }
  else { failed += 1; console.error(`FAIL ${label}`); }
}
function exists(file) { return fs.existsSync(path.join(root, file)); }

const requiredFiles = [
  'app/api/webhooks/meta/instagram/route.ts',
  'lib/meta/instagram/verify.ts', 'lib/meta/instagram/webhook.ts', 'lib/meta/instagram/conversations.ts',
  'lib/meta/instagram/messages.ts', 'lib/meta/instagram/attachments.ts', 'lib/meta/instagram/profiles.ts',
  'lib/meta/instagram/assignment.ts', 'lib/meta/instagram/policy.ts', 'workers/meta-instagram.worker.ts',
  'app/admin/meta/instagram/page.tsx', 'app/api/admin/meta/instagram/conversations/route.ts',
  'app/api/admin/meta/instagram/conversations/[conversationId]/reply/route.ts',
  'app/api/admin/meta/instagram/conversations/[conversationId]/links/route.ts',
  'prisma/migrations/20260718060000_meta_v6_phase14_instagram_social_crm/migration.sql',
];
for (const file of requiredFiles) expect(`required file ${file}`, exists(file));

const schema = read('prisma/schema.prisma');
for (const token of ['model MetaInstagramWebhookReceipt', 'model MetaConversation', 'model MetaMessage', 'model MetaMessageAttachment', 'model MetaConversationLink', 'model MetaInstagramReplyAttempt']) expect(`schema contains ${token}`, schema.includes(token));
for (const token of ['MetaInstagramWebhookStatus', 'MetaInstagramConversationStatus', 'MetaInstagramReplyEligibility']) expect(`typed enum ${token}`, schema.includes(`enum ${token}`));
expect('message provider ID scoped unique', schema.includes('MetaMessage_scope_provider_key') && schema.includes('providerMessageId'));
expect('receipt event key unique', /model MetaInstagramWebhookReceipt[\s\S]*eventKey\s+String\s+@unique/.test(schema));
expect('reply idempotency scoped unique', schema.includes('MetaInstagramReplyAttempt_scope_idempotency_key'));
expect('retention fields persisted', (schema.match(/retentionUntil/g) || []).length >= 2);

const verify = read('lib/meta/instagram/verify.ts');
const sharedSignature = read('lib/meta-platform/transports/webhook/signature.ts');
const sharedRouteBoundary = read('lib/meta-platform/transports/webhook/route-handler.ts');
expect('HMAC SHA-256 signature verification', verify.includes('verifyMetaWebhookSignature') && sharedSignature.includes("createHmac('sha256'") && sharedSignature.includes('timingSafeEqual'));
expect('signature prefix enforced', sharedSignature.includes("/^sha256=[a-f0-9]{64}$/i"));
const route = read('app/api/webhooks/meta/instagram/route.ts');
expect('webhook uses raw request body', route.includes('readAndVerifyMetaWebhookRequest') && sharedRouteBoundary.includes('await input.request.text()'));
expect('webhook verifies before shared envelope parsing', route.indexOf('if (!transport.ok)') < route.lastIndexOf('parseAndNormalizeMetaWebhookNotifications'));
expect('webhook payload size capped', route.includes('META_WEBHOOK_DEFAULT_MAX_BYTES') && sharedRouteBoundary.includes("code: 'PAYLOAD_TOO_LARGE', httpStatus: 413"));
expect('invalid signature returns 401', sharedRouteBoundary.includes("return code === 'APP_SECRET_MISSING' ? 503 : 401"));
expect('raw payload not written by route', !route.includes('rawPayload:'));

const webhook = read('lib/meta/instagram/webhook.ts');
const webhookHandoff = read('lib/meta-platform/transports/webhook/handoff.ts');
expect('message events normalized', webhook.includes("eventType: 'MESSAGE'"));
expect('comment private replies normalized', webhook.includes("eventType: 'COMMENT'") && webhook.includes("messageType: 'COMMENT_PRIVATE_REPLY'"));
expect('event-key deduplication', webhookHandoff.includes('const seen = new Map<string, MetaWebhookHandoffRecord>()') && webhookHandoff.includes("code: 'DUPLICATE_IN_DELIVERY'") && webhookHandoff.includes('seen.set(eventKey, record)') && !webhook.includes('new Map(normalized.map'));
expect('platform IDs preserved', webhook.includes('platformMessageId'));

const policy = read('lib/meta/instagram/policy.ts');
expect('24-hour reply policy', policy.includes('24 * 60 * 60 * 1000'));
expect('account ownership gate', policy.includes('ACCOUNT_MISMATCH'));
expect('permission gate', policy.includes('PERMISSION_MISSING'));
expect('private reply one-shot gate', policy.includes('PRIVATE_REPLY_ALREADY_SENT'));
expect('both Instagram permission families supported', policy.includes('instagram_manage_messages') && policy.includes('instagram_business_manage_messages'));

const messages = read('lib/meta/instagram/messages.ts');
expect('receipt claim is atomic', messages.includes('updateMany') && messages.includes("status: 'PROCESSING'"));
expect('message persistence is idempotent', messages.includes('persistInstagramInboundMessageStorage'));
expect('account mismatch ignored', messages.includes('INSTAGRAM_ACCOUNT_MISMATCH') && messages.includes("status: 'IGNORED'"));
expect('provider reply is policy checked before send', messages.indexOf('evaluateInstagramReplyPolicy') < messages.indexOf('sendProviderReply'));
expect('outbound reply ledger persisted', messages.includes('createOrGetInstagramReplyAttemptStorage'));
expect('reply failure is redacted', messages.includes('redactMetaAdminData'));
expect('attachment storage is private-path scoped', messages.includes('downloadInstagramAttachment'));
expect('retention cleanup exists', messages.includes('runInstagramRetention'));

const jobs = read('lib/jobs/job-types.ts');
expect('dedicated Instagram queue', jobs.includes("INSTAGRAM: 'meta-instagram'"));
expect('job contains receipt ID only', jobs.includes("type: 'instagram_message'; receiptId: string") && !jobs.includes("type: 'instagram_message'; raw"));
expect('job payload validation requires receipt', jobs.includes('INSTAGRAM_RECEIPT_ID_REQUIRED'));
const worker = read('workers/meta-instagram.worker.ts');
expect('worker processes message receipts', worker.includes('processInstagramWebhookReceipt'));
expect('worker runs retention cleanup', worker.includes('runInstagramRetention'));

const permissions = read('lib/auth/admin-permissions.ts');
expect('social view permission defined', permissions.includes("META_SOCIAL_VIEW: 'meta_social_view'"));
expect('social operate permission defined', permissions.includes("META_SOCIAL_OPERATE: 'meta_social_operate'"));
expect('social link permission defined', permissions.includes("META_SOCIAL_LINK: 'meta_social_link'"));
const adminRoutes = [
  'app/api/admin/meta/instagram/conversations/route.ts',
  'app/api/admin/meta/instagram/conversations/[conversationId]/route.ts',
  'app/api/admin/meta/instagram/conversations/[conversationId]/reply/route.ts',
  'app/api/admin/meta/instagram/conversations/[conversationId]/links/route.ts',
  'app/api/admin/meta/instagram/health/route.ts',
];
for (const file of adminRoutes) expect(`${file} has permission guard`, read(file).includes('requireAdminPermission'));
expect('reply mutation is immutable-audited', read(adminRoutes[2]).includes('executeMetaAdminAction') && read(adminRoutes[2]).includes('META_INSTAGRAM_REPLY'));
expect('CRM links require explicit verification method', read('lib/meta/instagram/conversations.ts').includes('INSTAGRAM_LINK_VERIFICATION_REQUIRED'));
expect('unsafe fuzzy identity matching absent', !read('lib/meta/instagram/conversations.ts').includes('levenshtein') && !read('lib/meta/instagram/conversations.ts').includes('fuzzy'));

const page = read('app/admin/meta/instagram/page.tsx');
expect('admin inbox shows assignment', page.includes('Save workflow') && page.includes('assignedToId'));
expect('admin inbox shows CRM links', page.includes('Verified CRM links'));
expect('admin inbox includes policy-aware reply', page.includes('Reply within the supported policy window'));
expect('Operations Center links Instagram CRM', read('app/admin/meta/page.tsx').includes("id: 'instagram'") && read('app/admin/meta/page.tsx').includes('/admin/meta/instagram'));

const packageJson = JSON.parse(read('package.json'));
expect('phase14 semantic script exists', packageJson.scripts['test:meta-v6-phase14']?.includes('phase14-instagram-social-crm.test.ts'));
expect('phase14 combined gate exists', packageJson.scripts['qa:meta-v6-phase14']?.includes('meta-v6-phase14-instagram-audit.mjs'));
expect('Instagram worker script exists', packageJson.scripts['worker:meta-instagram'] === 'tsx workers/meta-instagram.worker.ts');
expect('all-workers includes Instagram', packageJson.scripts['worker:all']?.includes('worker:meta-instagram'));

const envExample = read('.env.example');
expect('Instagram access token documented', envExample.includes('META_INSTAGRAM_ACCESS_TOKEN='));
expect('Instagram retention documented', envExample.includes('META_INSTAGRAM_RETENTION_DAYS=180'));
expect('Instagram messaging permission documented', envExample.includes('instagram_manage_messages'));
const envManifest = JSON.parse(read('config/env.manifest.json'));
expect('Instagram access token is production-recommended', envManifest.recommendedProduction.includes('META_INSTAGRAM_ACCESS_TOKEN'));
expect('Instagram retention is integer-validated', envManifest.integers.includes('META_INSTAGRAM_RETENTION_DAYS'));

console.log(`\nPhase 14 Instagram static audit: ${passed}/${passed + failed} passed`);
if (failed) process.exit(1);
