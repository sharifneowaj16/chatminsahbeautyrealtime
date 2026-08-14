#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const statusOnly = process.argv.includes('--status');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const json = (path) => JSON.parse(read(path));
const sha256 = (path) => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
const checks = [];
const assert = (name, condition, detail = '') => checks.push({ name, ok: Boolean(condition), detail });

let state = {}, progress = {}, manifest = {}, execution = {}, packageJson = {};
for (const [label, path, setter] of [
  ['project-state', '.ai/project-state.json', (value) => { state = value; }],
  ['layer-progress', '.ai/layer-progress.json', (value) => { progress = value; }],
  ['context-manifest', '.ai/context-manifest.json', (value) => { manifest = value; }],
  ['execution-manifest', '.ai/phase31-execution-manifest.json', (value) => { execution = value; }],
  ['package', 'package.json', (value) => { packageJson = value; }],
]) {
  try { setter(json(path)); assert(`${label} JSON parses`, true); }
  catch (error) { assert(`${label} JSON parses`, false, String(error)); }
}

if (statusOnly) {
  console.log(JSON.stringify({
    project: state.project?.name,
    phase: state.project?.active_phase,
    phaseStatus: state.project?.phase_status,
    completedThrough: state.checkpoint?.completed_through,
    verifiedArchive: state.checkpoint?.verified_archive,
    verificationLog: state.checkpoint?.verification_log,
    activeLayer: state.execution_policy?.active_layer,
    currentItem: state.next_item,
    fastStart: state.second_brain?.startup_command,
    workPacket: state.second_brain?.work_packet_command,
    packageFrequency: state.execution_policy?.package_frequency,
    blockers: state.known_blockers,
  }, null, 2));
  process.exit(0);
}

const currentItem = String(state.next_item?.id ?? '');
const currentTitle = String(state.next_item?.title ?? '');
const activeLayer = Number(state.execution_policy?.active_layer ?? 0);
const completedLayer = Number(String(state.checkpoint?.completed_through ?? '').match(/Layer\s+(\d+)/)?.[1] ?? 0);
const verifiedArchive = String(state.checkpoint?.verified_archive ?? '');
const verificationLog = String(state.checkpoint?.verification_log ?? '');
const packageReverificationLog = String(state.checkpoint?.package_reverification_log ?? '');
const itemPattern = new RegExp(`(?:Layer\\s+)?${currentItem.replace('.', '\\.')}\\b`);

const requiredFiles = [
  'AGENTS.md','SECOND_BRAIN.md','ChatGPT.md','CLAUDE.md','GEMINI.md','CODEX.md',
  '.github/copilot-instructions.md','.cursor/rules/project-context.mdc',
  '.ai/project-state.json','.ai/layer-progress.json','.ai/phase31-execution-manifest.json',
  '.ai/context-manifest.json','.ai/README.md','.ai/FAST_WORKFLOW.md',
  '.ai/prompts/start-session.md','.ai/prompts/continue-layer.md','.ai/prompts/recover-context.md',
  'AI_CONTEXT.md','CURRENT_LAYER.md','CURRENT_TASK.md','PRD.md','architecture.md','rules.md','phases.md','memory.md',
  'docs/roadmaps/phase31-fast-execution-policy.md','docs/roadmaps/phase31-layers-3-to-9-implementation-roadmap.md',
  'scripts/project-second-brain-preflight.mjs','scripts/project-second-brain-manifest.mjs','scripts/project-second-brain-audit.mjs',
  'scripts/project-ai-work-packet.mjs','scripts/project-ai-sync-context.mjs','scripts/project-ai-advance-item.mjs',
  'evidence/phase31-meta-social-crm/items/README.md',
  ...(verificationLog ? [verificationLog] : []),
  ...(packageReverificationLog ? [packageReverificationLog] : []),
];
for (const path of requiredFiles) assert(`required file: ${path}`, existsSync(resolve(root, path)), path);

assert('Second Brain version is 4.0', state.second_brain?.version === '4.0');
assert('active phase is 31', state.project?.active_phase === 31);
assert('Phase 31 remains IN_PROGRESS', state.project?.phase_status === 'IN_PROGRESS');
assert('completed layer is immediately before active layer', completedLayer === activeLayer - 1, `${completedLayer}/${activeLayer}`);
assert('verified archive matches completed layer', new RegExp(`layer${completedLayer}_(?:complete(?:_second_brain_v\\d+)?|full_fixed)\\.zip$`).test(verifiedArchive), verifiedArchive);
assert('verification log matches completed layer', new RegExp(`phase31_layer${completedLayer}_verification\\.log$`).test(verificationLog), verificationLog);
assert('active layer matches current item', Number(currentItem.split('.')[0]) === activeLayer);
assert('execution manifest matches current state', execution.current_layer === activeLayer && execution.current_item === currentItem);
assert('execution manifest contains Layers 6-9', ['6','7','8','9'].every((id) => execution.layers?.[id]));
assert('current layer exists in execution manifest', Boolean(execution.layers?.[String(activeLayer)]));
const currentContract = execution.layers?.[String(activeLayer)]?.items?.find((item) => item.id === currentItem);
assert('current item exists in execution manifest', Boolean(currentContract));
assert('current item title matches manifest', currentContract?.title === currentTitle);
assert('layer progress matches current item', Number(progress.layer) === activeLayer && progress.current_item === currentItem);
assert('layer progress artifacts match manifest', JSON.stringify(progress.layer_artifacts) === JSON.stringify(execution.layers?.[String(activeLayer)]?.artifacts));
assert('strict sequential gates enabled', state.execution_policy?.item_gate_required_before_next === true && state.execution_policy?.allow_item_skipping === false);
assert('packaging remains per layer', state.execution_policy?.package_frequency === 'PER_COMPLETED_LAYER');
assert('current item forbids item ZIP', state.next_item?.package_after_item === false && state.next_item?.package_after_layer_gate === true);

for (const script of ['ai:fast-start','ai:work-packet','ai:sync-context','ai:advance-item','ai:validate-workflow','ai:preflight','qa:second-brain']) {
  assert(`package script exists: ${script}`, Boolean(packageJson.scripts?.[script]));
}

const surfaces = {
  AGENTS: read('AGENTS.md'), SECOND_BRAIN: read('SECOND_BRAIN.md'), FAST_WORKFLOW: read('.ai/FAST_WORKFLOW.md'),
  AI_CONTEXT: read('AI_CONTEXT.md'), CURRENT_LAYER: read('CURRENT_LAYER.md'), CURRENT_TASK: read('CURRENT_TASK.md'),
  memory: read('memory.md'), phases: read('phases.md'), startPrompt: read('.ai/prompts/start-session.md'),
};
for (const [name, text] of Object.entries(surfaces).filter(([name]) => name !== 'FAST_WORKFLOW')) {
  assert(`${name} names current item ${currentItem}`, itemPattern.test(text), name);
}
assert('generated checkpoint surfaces disclose generator', ['AI_CONTEXT','CURRENT_LAYER','CURRENT_TASK'].every((name) => surfaces[name].includes('Generated by')));
assert('CURRENT_TASK includes focused gate command', surfaces.CURRENT_TASK.includes(currentContract?.command_contract?.gate ?? '__missing__'));
assert('CURRENT_TASK forbids item ZIP', /Do \*\*not\*\* create a Layer .* ZIP/.test(surfaces.CURRENT_TASK));
assert('CURRENT_LAYER includes roadmap evidence', surfaces.CURRENT_LAYER.includes(execution.layers?.[String(activeLayer)]?.evidence));
assert('AGENTS uses fast start', surfaces.AGENTS.includes('npm run ai:fast-start'));
assert('SECOND_BRAIN documents work packets', surfaces.SECOND_BRAIN.includes('machine-readable work packet'));
assert('FAST_WORKFLOW documents dry-run advancement', surfaces.FAST_WORKFLOW.includes('dry-run by default'));
assert('rules enforce execution manifest', read('rules.md').includes('.ai/phase31-execution-manifest.json') && read('rules.md').includes('npm run ai:advance-item'));
assert('memory remains concise', statSync(resolve(root, 'memory.md')).size < 20000, `${statSync(resolve(root, 'memory.md')).size} bytes`);
assert('context does not claim Phase 31 complete', surfaces.AI_CONTEXT.includes('Full Phase 31 complete') && surfaces.AI_CONTEXT.includes('**No**'));

for (const path of ['ChatGPT.md','CLAUDE.md','GEMINI.md','CODEX.md','.github/copilot-instructions.md','.cursor/rules/project-context.mdc']) {
  const text = read(path);
  assert(`${path} uses fast start`, text.includes('npm run ai:fast-start'));
  assert(`${path} names current item`, itemPattern.test(text));
  assert(`${path} has no stale Layer 4.8/5.1 checkpoint`, !text.includes('Layer 4.8 PASS') && !/current item:?\s*(?:Layer )?5\.1/i.test(text));
}

for (const [path, entry] of Object.entries(manifest.context_files ?? {})) {
  assert(`manifest path exists: ${path}`, existsSync(resolve(root, path)), path);
  if (existsSync(resolve(root, path))) assert(`manifest hash matches: ${path}`, sha256(path) === entry.sha256, path);
}
assert('context manifest checkpoint matches state', manifest.checkpoint?.completed_through === state.checkpoint?.completed_through && manifest.checkpoint?.current_item === currentItem);
assert('context manifest archive matches state', manifest.checkpoint?.verified_archive === verifiedArchive);
assert('repository file count meets minimum', Number(manifest.repository?.file_count) >= Number(state.repository_access?.minimum_repository_file_count), `${manifest.repository?.file_count}`);

let passed = 0;
for (const item of checks) {
  console.log(`[${item.ok ? 'PASS' : 'FAIL'}] ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  if (item.ok) passed += 1;
}
console.log(`\nSecond Brain v4 audit: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
