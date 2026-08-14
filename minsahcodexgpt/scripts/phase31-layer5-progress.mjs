#!/usr/bin/env node
import fs from 'node:fs';

const [completedItem, nextItem, verificationLog] = process.argv.slice(2);
if (!completedItem || !nextItem || !verificationLog) {
  console.error('usage: node scripts/phase31-layer5-progress.mjs <completed-item> <next-item> <verification-log>');
  process.exit(1);
}

const items = {
  '5.1': { title: 'Lead Ads legacy-domain audit and migration map', output: 'evidence/phase31-meta-social-crm/05-leads-legacy-audit.md', objective: 'Audit every legacy Lead Ads path and freeze the exact 5.2-5.4 migration split.', paths: ['lib/meta/leads/', 'lib/meta-business/leads.ts', 'workers/meta-lead.worker.ts'] },
  '5.2': { title: 'Lead normalize and mapping domain', output: 'lib/meta-platform/domains/leads/normalize-lead.ts', objective: 'Create the canonical Lead field mapper with sensitive contact separation, safe projections and PII-safe generic fields.', paths: ['lib/meta-platform/domains/leads/', 'tests/meta-v6/phase31-layer5.2-lead-domain.test.mjs'] },
  '5.3': { title: 'Lead processing and CRM handoff domain', output: 'lib/meta-platform/domains/leads/process-lead.ts', objective: 'Move production receipt processing and manual Lead import into the canonical Lead domain with replay-safe CRM handoff and a feature-flagged rollback boundary.', paths: ['lib/meta-platform/domains/leads/process-lead.ts', 'workers/meta-lead.worker.ts', 'lib/meta-business/leads.ts'] },
  '5.4': { title: 'Meta test-lead domain and evidence path', output: 'lib/meta-platform/domains/leads/test-lead.ts', objective: 'Isolate test Leads from normal CRM handling, add cleanup policy and expose only PII-safe evidence.', paths: ['lib/meta-platform/domains/leads/test-lead.ts', 'lib/meta-platform/domains/leads/process-lead.ts'] },
  '5.5': { title: 'Instagram legacy-domain audit and migration map', output: 'evidence/phase31-meta-social-crm/05-instagram-legacy-audit.md', objective: 'Audit every Instagram route, worker, provider call, persistence path, reply policy and attachment flow before migration.', paths: ['lib/meta/instagram/', 'workers/meta-instagram.worker.ts', 'app/api/webhooks/meta/instagram/route.ts'] },
  '5.6': { title: 'Instagram inbound conversation domain', output: 'lib/meta-platform/domains/instagram/conversations.ts', objective: 'Create and wire the canonical inbound conversation domain with duplicate-safe persistence and side-effect emission.', paths: ['lib/meta-platform/domains/instagram/', 'workers/meta-instagram.worker.ts'] },
  '5.7': { title: 'Instagram standard reply domain', output: 'lib/meta-platform/domains/instagram/send-reply.ts', objective: 'Create and wire standard reply validation, current kill-switch enforcement, idempotency and unknown-write reconciliation.', paths: ['lib/meta-platform/domains/instagram/send-reply.ts', 'app/api/admin/meta/instagram/conversations/[conversationId]/reply/route.ts', 'workers/meta-instagram.worker.ts'] },
  '5.8': { title: 'Instagram private reply domain', output: 'lib/meta-platform/domains/instagram/private-reply.ts', objective: 'Create and wire private reply policy, one-shot persistence, current kill-switch enforcement and unknown-write reconciliation.', paths: ['lib/meta-platform/domains/instagram/private-reply.ts', 'workers/meta-instagram.worker.ts'] },
  '5.9': { title: 'Instagram attachment/media domain integration', output: 'lib/meta-platform/domains/instagram/media-policy.ts', objective: 'Integrate inbound and outbound attachment policy, validation scheduling, quarantine and safe projections.', paths: ['lib/meta-platform/domains/instagram/media-policy.ts', 'lib/meta-platform/queue/social-attachment-validation-job.ts'] },
  '5.10': { title: 'Facebook Page identity and permission domain', output: 'lib/meta-platform/domains/pages/page-identity.ts', objective: 'Create and wire Page identity, token health and permission checks for Facebook and Lead subscription operations.', paths: ['lib/meta-platform/domains/pages/', 'app/api/admin/meta/leads/subscribe/route.ts'] },
  '5.11': { title: 'Legacy Facebook inbox sync bridge', output: 'lib/meta-platform/domains/facebook/legacy-bridge.ts', objective: 'Replace authoritative legacy Facebook inbox Graph access with a feature-flagged platform bridge and comparison-safe shadow mode.', paths: ['lib/meta-platform/domains/facebook/', 'lib/facebook/inboxSync.ts', 'app/api/admin/social/facebook/sync/route.ts'] },
  '5.12': { title: 'Layer 5 domain release gate', output: 'evidence/phase31-meta-social-crm/05-layer5-domain-release-gate.md', objective: 'Execute the cumulative production-wiring, strict TypeScript, security, replay, policy, regression and Second Brain release gate.', paths: ['scripts/meta-platform-phase31-layer5.12-release-gate-audit.mjs', 'tests/meta-v6/phase31-layer5-release-gate.test.mjs'] },
  '6.1': { title: 'Realtime Facebook service audit', output: 'evidence/phase31-meta-social-crm/06-realtime-facebook-service-audit.md', objective: 'Audit realtime Facebook direct Graph calls, signature verification, inbox processing, retries, dead letters, media, token health, replay, event payloads, WebSocket schemas and main-app state mismatches.', paths: ['realtime-service/src/facebook/', 'realtime-service/src/routes/webhook.router.ts'] },
};
const completed = items[completedItem];
const next = items[nextItem];
if (!completed || !next) throw new Error('unknown item transition');
if (!fs.existsSync(verificationLog)) throw new Error(`verification log missing: ${verificationLog}`);

const statePath = '.ai/project-state.json';
const progressPath = '.ai/layer-progress.json';
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
const expected = progress.items.find((item) => item.status !== 'COMPLETE')?.id;
if (expected !== completedItem) throw new Error(`sequential gate violation: expected ${expected}, got ${completedItem}`);
const completedRow = progress.items.find((item) => item.id === completedItem);
if (!completedRow) throw new Error(`progress item missing: ${completedItem}`);
completedRow.status = 'COMPLETE';
progress.current_item = nextItem;
progress.status = nextItem.startsWith('5.') ? 'IN_PROGRESS' : 'COMPLETE';

const now = new Date().toISOString();
state.updated_at = now;
state.checkpoint.completed_through = `Phase 31 Layer ${completedItem}`;
state.checkpoint.layer_status = nextItem.startsWith('5.') ? 'IN_PROGRESS' : 'PASS';
state.checkpoint.implementation_scope = `Phase 31 completed through item ${completedItem}; focused gate evidence recorded.`;
state.checkpoint.verification_log = verificationLog;
state.checkpoint.verification_summary = {
  ...(state.checkpoint.verification_summary ?? {}),
  [`layer_${completedItem.replace('.', '_')}`]: `PASS — ${verificationLog}`,
};
state.next_item = {
  id: nextItem,
  title: next.title,
  execution_mode: 'SEQUENTIAL_ITEM_GATE',
  expected_schema_change: false,
  expected_migration: false,
  objective: next.objective,
  required_primary_paths: next.paths,
  required_output: next.output,
  package_after_item: false,
  package_after_layer_gate: true,
};
state.execution_policy.active_layer = Number(nextItem.split('.')[0]);
state.execution_policy.current_item = nextItem;
fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
fs.writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`);

const progressRows = progress.items.map((item) => `| ${item.id} | ${item.title} | \`${item.status}\` |`).join('\n');
fs.writeFileSync('CURRENT_LAYER.md', `# CURRENT_LAYER.md — Phase 31 Layer ${progress.layer}\n\n\`\`\`yaml\nactive_phase: 31\nactive_layer: ${state.execution_policy.active_layer}\nlayer_title: "${progress.title}"\nlayer_status: ${progress.status}\ncompleted_previous_checkpoint: "${state.checkpoint.completed_through}"\ncurrent_item: "${nextItem}"\nexecution_policy: SEQUENTIAL_ITEM_GATES\nsame_session_continuation_allowed: true\npackage_frequency: PER_COMPLETED_LAYER\n\`\`\`\n\n## Layer objective\n\nMove Lead Ads, Instagram and Facebook Page business logic into shared MetaPlatform domain services while preserving durable receipt, queue, idempotency, policy, reconciliation and rollback behavior.\n\n## Progress board\n\n| Item | Scope | Status |\n|---|---|---|\n${progressRows}\n\n## Item gate contract\n\nEach numbered item requires working implementation or the required audit artifact, focused executed evidence, schema/migration status, a concise result and the exact next item. No item ZIP is required.\n\n## Layer 5 artifact contract\n\nOnly after Item 5.12 passes, create:\n\n\`\`\`text\nminsahbeauty_phase31_layer5_complete.zip\nminsahbeauty_phase31_layer5_complete.zip.sha256\nphase31_layer5_verification.log\nevidence/phase31-meta-social-crm/05-layer5-domain-release-gate.md\n\`\`\`\n`);

fs.writeFileSync('CURRENT_TASK.md', `# CURRENT_TASK.md — Phase 31 Layer ${nextItem}\n\n\`\`\`yaml\nactive_phase: 31\nactive_layer: ${state.execution_policy.active_layer}\nactive_item: "${nextItem}"\ntitle: "${next.title}"\nstatus: NOT_STARTED\nprevious_checkpoint: "${state.checkpoint.completed_through}"\nverification_log: "${verificationLog}"\nexecution_mode: SEQUENTIAL_ITEM_GATE\nsame_session_next_item_allowed_after_gate: true\npackage_frequency: PER_COMPLETED_LAYER\nschema_change_expected: false\nmigration_expected: false\n\`\`\`\n\n## Objective\n\n${next.objective}\n\n## Required production boundary\n\n- New domain code must be invoked by actual workers, routes or runtime adapters when this item changes runtime behavior.\n- Legacy authority may remain only behind an explicit feature-flagged rollback boundary.\n- Queue payloads, safe projections, logs and generic custom fields must exclude raw PII, tokens and secrets.\n- Focused tests and strict TypeScript compilation must pass before advancement.\n\n## Required item output\n\n\`\`\`text\n${next.output}\nfocused test/audit command evidence\nconcise Item ${nextItem} result\nupdated checkpoint/progress files\n\`\`\`\n\nDo **not** create a Layer ${nextItem} ZIP. Full packaging occurs only after Item 5.12.\n\n## Done criteria\n\n- The item objective is implemented and production wiring is tested where applicable.\n- Prisma schema remains unchanged unless source evidence first proves necessity; any change includes migration.sql and recovery.sql.\n- Item ${nextItem} is marked COMPLETE only after focused evidence passes.\n- The exact next item is recorded after the gate.\n`);

fs.writeFileSync('AI_CONTEXT.md', `# AI_CONTEXT.md — Minsah Beauty Live Project Context\n\n## Project identity\n\nMinsah Beauty is the main Bangladesh beauty e-commerce, operations and growth platform. Phase 31 migrates Meta Pages, Lead Ads, Instagram, webhooks and realtime/social CRM into the shared Meta v6 platform.\n\n## Verified current checkpoint\n\n| Field | Current value |\n|---|---|\n| Active phase | Phase 31 |\n| Phase status | \`IN_PROGRESS\` |\n| Completed through | Layer ${completedItem} |\n| Active layer | **Layer ${state.execution_policy.active_layer}** |\n| Current item | **${nextItem} — ${next.title}** |\n| Verified archive | \`${state.checkpoint.verified_archive}\` |\n| Current evidence log | \`${verificationLog}\` |\n| Full Phase 31 complete | **No** |\n| Runtime/provider evidence | Pending Layer 9 |\n\nThe authoritative clean base remains the verified archive above. Current source has additionally passed focused gates through Item ${completedItem}. No unexecuted full build, lint, database, Redis, realtime or live-provider PASS is claimed.\n\n## Execution and packaging policy\n\nWork proceeds through sequential numbered-item gates. Packaging is per completed layer, not per item. Layer 5 artifacts are created only after 5.12.\n\n## Current item boundary\n\n${next.objective}\n\nExpected schema change: **NO**. Expected migration: **NO**.\n\n## Truthfulness and security boundary\n\nNo command PASS without execution evidence; no raw email, phone, token, secret or webhook PII in logs, queue payloads, safe projections or generic custom fields; no legacy deletion before feature-flagged rollback proof.\n`);

const secondBrain = fs.readFileSync('SECOND_BRAIN.md', 'utf8').replace(/## 4\. Current checkpoint[\s\S]*?## 5\. Checkpoint mutation rule/, `## 4. Current checkpoint\n\n\`\`\`text\nPhase 31: IN_PROGRESS\nCompleted through: Layer ${completedItem}\nVerified archive: ${state.checkpoint.verified_archive}\nEvidence log: ${verificationLog}\nActive layer: Layer ${state.execution_policy.active_layer}\nCurrent item: ${nextItem} — ${next.title}\nLayer packaging: only after the active layer release gate\n\`\`\`\n\n## 5. Checkpoint mutation rule`);
fs.writeFileSync('SECOND_BRAIN.md', secondBrain);

const agents = fs.readFileSync('AGENTS.md', 'utf8').replace(/## Current verified checkpoint[\s\S]*?## Mandatory execution rules/, `## Current verified checkpoint\n\n\`\`\`text\nProject: Minsah Beauty main project\nProgram: Meta v6 unified platform, Phases 19-33\nActive phase: Phase 31\nCompleted through: Layer ${completedItem}\nVerified archive: ${state.checkpoint.verified_archive}\nEvidence log: ${verificationLog}\nActive layer: Layer ${state.execution_policy.active_layer}\nCurrent item: ${nextItem} — ${next.title}\nPackaging: full project package after the active layer release gate, not after every item\n\`\`\`\n\n## Mandatory execution rules`);
fs.writeFileSync('AGENTS.md', agents);

const phases = fs.readFileSync('phases.md', 'utf8').replace(/\*\*Status:\*\* `IN_PROGRESS`[^\n]*/, `**Status:** \`IN_PROGRESS\` — Phase 31 focused item gates are complete through Layer ${completedItem}. The authoritative clean base is \`${state.checkpoint.verified_archive}\`; current evidence is \`${verificationLog}\`. **Active Layer: ${state.execution_policy.active_layer}. Exact current item: Layer ${nextItem} — ${next.title}.** Layer packaging remains per completed layer. Full dependency-backed build/lint/database/Redis/realtime/live-provider evidence is not claimed unless separately executed.`);
fs.writeFileSync('phases.md', phases);

const completeItems = progress.items.filter((item) => item.status === 'COMPLETE').map((item) => item.id).join(', ');
fs.writeFileSync('memory.md', `# memory.md — Active operational memory\n\n## Verified checkpoint\n\n\`\`\`yaml\nactive_phase: 31\nphase_status: IN_PROGRESS\ncompleted_through: "Layer ${completedItem}"\nactive_layer: ${state.execution_policy.active_layer}\ncurrent_item: "${nextItem} — ${next.title}"\nverified_archive: "${state.checkpoint.verified_archive}"\ncheckpoint_evidence: "${verificationLog}"\nruntime_provider_evidence: PENDING_LAYER_9\n\`\`\`\n\nCompleted Layer 5 item gates: ${completeItems || 'none'}.\n\n## Current task\n\n${next.objective}\n\nExpected schema change: **NO**. Expected migration: **NO**. No item ZIP is created.\n\n## Latest verified item\n\n| Item | Result | Evidence | Schema | Next |\n|---|---|---|---|---|\n| ${completedItem} | PASS | \`${verificationLog}\`; \`${completed.output}\` | Unchanged | ${nextItem} |\n\n## Non-negotiable boundaries\n\n- Preserve Layers 1-4 and the verified clean base.\n- Production paths must invoke new domain services; legacy authority requires an explicit rollback flag.\n- No raw PII, token or secret in logs, safe projections, queue payloads or generic custom fields.\n- Unknown provider writes enter reconciliation and are not blindly retried.\n- No full build/lint/database/Redis/realtime/live-provider PASS without executed evidence.\n- Update all checkpoint surfaces and regenerate the context manifest after every item gate.\n\n## Exact next action\n\nComplete and verify Item ${nextItem}, then advance sequentially.\n`);

console.log(`Advanced Phase 31 from ${completedItem} to ${nextItem}.`);
