import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');
const json = (path) => JSON.parse(read(path));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

const itemLogs = [
  'layer5.1-lead-audit.log', 'layer5.2-lead-domain.log', 'layer5.3-lead-processing.log',
  'layer5.4-test-lead.log', 'layer5.5-instagram-audit.log', 'layer5.6-instagram-inbound.log',
  'layer5.7-instagram-standard-reply.log', 'layer5.8-instagram-private-reply.log',
  'layer5.9-instagram-media.log', 'layer5.10-facebook-page-domain.log',
  'layer5.11-facebook-inbox-bridge.log',
].map((name) => `evidence/phase31-meta-social-crm/logs/${name}`);

test('all sequential Layer 5 item gates have executed PASS evidence', () => {
  for (const path of itemLogs) {
    const content = read(path);
    assert.doesNotMatch(content, /\[FAIL\]|# fail [1-9]|not ok \d/i, path);
    assert.match(content, /PASS|# pass [1-9]/, path);
  }
  const progress = json('.ai/layer-progress.json');
  const state = json('.ai/project-state.json');
  const completedLayer = Number(String(state.checkpoint.completed_through).match(/Layer (\d+)/)?.[1] ?? 0);
  const activeLayer = Number(String(state.next_item.id).split('.')[0]);
  assert.ok(completedLayer >= 5, `checkpoint regressed below Layer 5: ${state.checkpoint.completed_through}`);
  assert.equal(state.checkpoint.layer_status, 'PASS');
  assert.ok(activeLayer >= 6, `active layer regressed below Layer 6: ${state.next_item.id}`);
  assert.equal(progress.layer, activeLayer);
  assert.equal(progress.current_item, state.next_item.id);
  assert.equal(state.execution_policy.active_layer, activeLayer);
  assert.equal(state.execution_policy.current_item, state.next_item.id);
  assert.ok(progress.completed_previous_layer.layer >= 5);
  assert.match(progress.completed_previous_layer.status, /^COMPLETE(?:_REMEDIATED)?$/);
});

test('Lead, Instagram, Page and Facebook services are wired to production workers and routes', () => {
  const leadWorker = read('workers/meta-lead.worker.ts');
  const instagramWorker = read('workers/meta-instagram.worker.ts');
  const socialWorker = read('workers/meta-social.worker.ts');
  const instagramRoute = read('app/api/admin/meta/instagram/conversations/[conversationId]/reply/route.ts');
  const facebookRoute = read('app/api/admin/inbox/sync/route.ts');
  const pageRoute = read('app/api/admin/meta/leads/subscribe/route.ts');
  assert.match(leadWorker, /processMetaLeadReceiptProduction/);
  assert.match(instagramWorker, /processInstagramInboundReceiptProduction/);
  assert.match(instagramWorker, /executeInstagramStandardReplyProduction/);
  assert.match(instagramWorker, /executeInstagramPrivateReplyProduction/);
  assert.match(socialWorker, /executeFacebookInboxSyncProduction/);
  assert.match(instagramRoute, /requestInstagramStandardReplyProduction/);
  assert.match(instagramRoute, /requestInstagramPrivateReplyProduction/);
  assert.match(facebookRoute, /requestFacebookInboxSyncProduction/);
  assert.match(pageRoute, /subscribeMetaPageLeadgenProduction/);
});

test('legacy authority exists only behind explicit rollback boundaries', () => {
  const leadProduction = read('lib/meta-platform/domains/leads/production.ts');
  const leadCutover = read('lib/meta-platform/domains/leads/cutover.ts');
  const instagramProduction = read('lib/meta-platform/domains/instagram/production.ts');
  const instagramCutover = read('lib/meta-platform/domains/instagram/cutover.ts');
  const outbound = read('lib/meta-platform/domains/instagram/feature-flags.ts');
  const pages = read('lib/meta-platform/domains/pages/feature-flags.ts');
  const facebookFlags = read('lib/meta-platform/domains/facebook/feature-flags.ts');
  const facebookCutover = read('lib/meta-platform/domains/facebook/cutover.ts');
  const facebookSharedCutover = read('packages/meta-facebook-cutover-contract/src/index.ts');
  for (const content of [leadCutover, instagramCutover, outbound, pages, facebookFlags, facebookSharedCutover]) {
    assert.match(content, /LEGACY_ROLLBACK/);
  }
  assert.match(leadProduction, /executeMetaLeadCutover/);
  assert.match(instagramProduction, /getMetaInstagramCutoverStatus/);
  assert.match(facebookFlags, /getMetaFacebookRealtimeCutoverStatus/);
  assert.match(facebookCutover, /resolveFacebookRealtimeCutover/);
});

test('safe projections, queue contracts and generic fields exclude raw PII and secrets', () => {
  const leadProjection = read('lib/meta-platform/domains/leads/safe-projection.ts');
  const leadMapper = `${read('lib/meta-platform/domains/leads/normalize-lead.ts')}\n${read('lib/meta-platform/domains/leads/lead-mapper.ts')}`;
  const queueEnvelope = read('lib/meta-platform/queue/social-job-envelope.ts');
  const queuePayload = read('lib/jobs/job-types.ts');
  const media = read('lib/meta-platform/domains/instagram/media-policy.ts');
  const facebook = read('lib/meta-platform/domains/facebook/inbox-sync.ts');
  assert.match(leadMapper, /METADATA_ONLY|SENSITIVE_VALUE|SENSITIVE_NAME/);
  assert.doesNotMatch(leadProjection, /contact\.email|contact\.phone|rawFields/);
  assert.match(queueEnvelope, /SOCIAL_JOB_SECRET_OR_PII_FIELD_FORBIDDEN/);
  assert.match(queuePayload, /FORBIDDEN_PAYLOAD_KEYS/);
  assert.doesNotMatch(media.slice(media.indexOf('toInstagramAttachmentSafeProjection'), media.indexOf('evaluateInstagramOutboundAttachmentPolicy')), /sourceUrl:|fileName:|storageKey:|metadata:/);
  assert.doesNotMatch(facebook.slice(facebook.indexOf('export type FacebookInboxSafeSummary'), facebook.indexOf('export function summarizeFacebookInboxPlan')), /senderName|content|externalUrl|accessToken/);
});

test('replay safety, kill switches, dedupe and reconciliation remain explicit', () => {
  const lead = read('lib/meta-platform/domains/leads/process-lead.ts');
  const inbound = read('lib/meta-platform/domains/instagram/conversations.ts');
  const reply = read('lib/meta-platform/domains/instagram/send-reply.ts');
  const privateReply = read('lib/meta-platform/domains/instagram/private-reply.ts');
  const standardRuntime = read('lib/meta-platform/domains/instagram/standard-reply-runtime.ts');
  const privateRuntime = read('lib/meta-platform/domains/instagram/private-reply-runtime.ts');
  const facebook = read('lib/meta-platform/domains/facebook/legacy-bridge.ts');
  assert.match(lead, /ALREADY_COMPLETED/);
  assert.match(inbound, /emitRealtime: created/);
  assert.match(inbound, /scheduleAttachments: created && input\.attachmentCount > 0/);
  assert.match(inbound, /deduplicated: !created/);
  assert.match(reply, /UNKNOWN_OUTCOME|RECONCILIATION_REQUIRED/);
  assert.match(privateReply, /INSTAGRAM_PRIVATE_REPLY_ALREADY_SENT_OR_BLOCKED/);
  assert.match(standardRuntime, /process\.env/);
  assert.match(privateRuntime, /process\.env/);
  assert.equal((facebook.match(/persistFacebookInboxMessage\(/g) ?? []).length, 1);
});

test('Layer 5 release audits are reproducible from an extracted ZIP without Git metadata', () => {
  const itemAudit = read('scripts/meta-platform-phase31-layer5.11-facebook-inbox-audit.mjs');
  const releaseAudit = read('scripts/meta-platform-phase31-layer5.12-release-gate-audit.mjs');
  assert.doesNotMatch(itemAudit, /node:child_process/);
  assert.doesNotMatch(releaseAudit, /node:child_process/);
  assert.match(itemAudit, /d3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce/);
  assert.match(releaseAudit, /d3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce/);
});

test('schema and Layer 4 authoritative checkpoint remain unchanged', () => {
  assert.equal(sha256('prisma/schema.prisma'), 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');
  assert.equal(sha256('phase31_layer4_verification.log'), '790d595a9287e452627d5aafe9379c819fc8e8f00192549a370452659acfdba3');
  assert.match(read('phase31_layer4_verification.log'), /Layer 4\.8|4\.8/);
});
