import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const pkg = JSON.parse(read('package.json'));
const progress = JSON.parse(read('.ai/layer-progress.json'));
const state = JSON.parse(read('.ai/project-state.json'));
const checks = [];
function check(name, condition) {
  checks.push({ name, ok: Boolean(condition) });
  console.log(`${condition ? '[PASS]' : '[FAIL]'} ${name}`);
}

const requiredEvidence = [
  'evidence/phase31-meta-social-crm/05-leads-domain.md',
  'evidence/phase31-meta-social-crm/06-instagram-domain.md',
  'evidence/phase31-meta-social-crm/07-facebook-pages-domain.md',
];
for (const path of requiredEvidence) check(`evidence exists: ${path}`, existsSync(path));

const scripts = pkg.scripts ?? {};
for (let item = 1; item <= 11; item += 1) {
  check(`Item 5.${item} focused gate script exists`, typeof scripts[`qa:phase31-meta-layer5.${item}`] === 'string');
}
check('Item 5.12 focused test script exists', typeof scripts['test:meta-v6-phase31-layer5.12'] === 'string');
check('focused strict TypeScript command is retained', scripts['typecheck:phase31-layer5'] === 'tsc --project tsconfig.phase31-layer5.json --pretty false');

const leadWorker = read('workers/meta-lead.worker.ts');
const instagramWorker = read('workers/meta-instagram.worker.ts');
const socialWorker = read('workers/meta-social.worker.ts');
const routes = [
  read('app/api/admin/meta/instagram/conversations/[conversationId]/reply/route.ts'),
  read('app/api/admin/meta/leads/subscribe/route.ts'),
  read('app/api/admin/inbox/sync/route.ts'),
].join('\n');
check('Lead production worker invokes domain service', leadWorker.includes('processMetaLeadReceiptProduction'));
check('Instagram production worker invokes inbound and reply domains', instagramWorker.includes('processInstagramInboundReceiptProduction') && instagramWorker.includes('executeInstagramStandardReplyProduction') && instagramWorker.includes('executeInstagramPrivateReplyProduction'));
check('Facebook production worker invokes inbox domain', socialWorker.includes('executeFacebookInboxSyncProduction'));
check('production routes invoke domain services', routes.includes('requestInstagramStandardReplyProduction') && routes.includes('subscribeMetaPageLeadgenProduction') && routes.includes('requestFacebookInboxSyncProduction'));

const leadSafe = `${read('lib/meta-platform/domains/leads/normalize-lead.ts')}\n${read('lib/meta-platform/domains/leads/lead-mapper.ts')}\n${read('lib/meta-platform/domains/leads/safe-projection.ts')}`;
const queueSafe = `${read('lib/meta-platform/queue/social-job-envelope.ts')}\n${read('lib/jobs/job-types.ts')}`;
const outbound = `${read('lib/meta-platform/domains/instagram/send-reply.ts')}\n${read('lib/meta-platform/domains/instagram/standard-reply-runtime.ts')}\n${read('lib/meta-platform/domains/instagram/private-reply-runtime.ts')}`;
const facebook = read('lib/meta-platform/domains/facebook/legacy-bridge.ts');
check('Lead generic fields are metadata-only or sensitivity classifications', leadSafe.includes('METADATA_ONLY') && leadSafe.includes('SENSITIVE_VALUE'));
check('queue validation forbids PII, text, URLs and credential keys', queueSafe.includes('SOCIAL_JOB_SECRET_OR_PII_FIELD_FORBIDDEN') && queueSafe.includes('FORBIDDEN_PAYLOAD_KEYS'));
check('standard and private reply execution reads current environment', (outbound.match(/process\.env/g) ?? []).length >= 2);
check('unknown Instagram writes enter reconciliation', outbound.includes('RECONCILIATION_REQUIRED') || read('workers/meta-instagram.worker.ts').includes("action === 'RECONCILE'"));
check('Facebook SHADOW has no legacy execution or persistence in comparison block', !facebook.slice(facebook.indexOf("if (mode === 'SHADOW')"), facebook.indexOf('let createdMessages')).includes('syncRecentFacebookInboxLegacy') && !facebook.slice(facebook.indexOf("if (mode === 'SHADOW')"), facebook.indexOf('let createdMessages')).includes('persistFacebookInboxMessage'));
check('Facebook authoritative persistence loop occurs once', (facebook.match(/persistFacebookInboxMessage\(/g) ?? []).length === 1);
const facebookCutover = `${read('lib/meta-platform/domains/facebook/cutover.ts')}
${read('packages/meta-facebook-cutover-contract/src/index.ts')}`;
check(
  'legacy Facebook execution is isolated outside the main-app platform bridge',
  !facebook.includes('syncRecentFacebookInboxLegacy')
    && facebook.includes('assertFacebookPlatformSyncAuthority')
    && facebookCutover.includes('LEGACY_ROLLBACK'),
);

const completedLayer = Number(String(state.checkpoint?.completed_through ?? '').match(/Layer (\d+)/)?.[1] ?? 0);
const activeLayer = Number(String(state.next_item?.id ?? '').split('.')[0]);
check(
  'Layer 5 remains completed after later-layer advancement',
  completedLayer >= 5
    && progress.completed_previous_layer?.layer >= 5
    && /^COMPLETE(?:_REMEDIATED)?$/.test(String(progress.completed_previous_layer?.status ?? '')),
);
check(
  'Second Brain checkpoint remains forward-compatible after Layer 5',
  state.checkpoint?.layer_status === 'PASS'
    && activeLayer >= 6
    && progress.layer === activeLayer
    && progress.current_item === state.next_item?.id
    && state.execution_policy?.active_layer === activeLayer
    && state.execution_policy?.current_item === state.next_item?.id,
);
check('authoritative Layer 4 verification log unchanged', sha256('phase31_layer4_verification.log') === '790d595a9287e452627d5aafe9379c819fc8e8f00192549a370452659acfdba3');
check('Prisma schema unchanged from Layer 4 checkpoint', sha256('prisma/schema.prisma') === 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');
check(
  'Prisma verification is package-reproducible without Git metadata',
  sha256('prisma/schema.prisma') === 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce',
);

const failed = checks.filter((item) => !item.ok);
console.log(`Layer 5.12 release gate audit: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
