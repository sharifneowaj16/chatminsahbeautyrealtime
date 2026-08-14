#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const argv = process.argv.slice(2);
const value = (name) => {
  const index = argv.indexOf(name);
  const inline = argv.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : index >= 0 ? argv[index + 1] : undefined;
};
const values = (name) => {
  const results = [];
  argv.forEach((arg, index) => {
    if (arg === name && argv[index + 1]) results.push(argv[index + 1]);
    else if (arg.startsWith(`${name}=`)) results.push(arg.slice(name.length + 1));
  });
  return results;
};
const apply = argv.includes('--apply');
const layerPackaged = argv.includes('--layer-packaged');
const itemId = value('--item');
const status = String(value('--status') ?? '').toUpperCase();
const summary = value('--summary') ?? '';
const blocker = value('--blocker');
const extraEvidence = [...values('--evidence'), ...values('--log')];

const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const writeJson = (path, value) => writeFileSync(resolve(root, path), `${JSON.stringify(value, null, 2)}\n`);
const state = readJson('.ai/project-state.json');
let progress = readJson('.ai/layer-progress.json');
const execution = readJson('.ai/phase31-execution-manifest.json');

if (!itemId || !['COMPLETE', 'BLOCKED'].includes(status)) {
  console.error('Usage: npm run ai:advance-item -- --item 6.1 --status COMPLETE|BLOCKED [--evidence path] [--log path] [--summary text] [--apply]');
  process.exit(1);
}
if (state.next_item?.id !== itemId || progress.current_item !== itemId) {
  console.error(`Refusing advancement: current item is ${state.next_item?.id}/${progress.current_item}, not ${itemId}`);
  process.exit(1);
}

const layerId = String(itemId.split('.')[0]);
const layer = execution.layers?.[layerId];
const item = layer?.items?.find((entry) => entry.id === itemId);
const progressItem = progress.items?.find((entry) => entry.id === itemId);
if (!layer || !item || !progressItem) {
  console.error(`Item ${itemId} is missing from the execution manifest or progress file`);
  process.exit(1);
}

const evidence = [...new Set([...item.required_outputs, ...extraEvidence])];
if (status === 'COMPLETE') {
  const missing = evidence.filter((path) => !existsSync(resolve(root, path)) && !existsSync(path));
  if (missing.length) {
    console.error(`Refusing COMPLETE: required evidence is missing:\n${missing.map((path) => `- ${path}`).join('\n')}`);
    process.exit(1);
  }
}

const layerItemIndex = layer.items.findIndex((entry) => entry.id === itemId);
const isFinalLayerItem = layerItemIndex === layer.items.length - 1;
const preview = {
  item: itemId,
  status,
  evidence,
  isFinalLayerItem,
  layerPackaged,
  apply,
};
console.log(JSON.stringify(preview, null, 2));
if (!apply) {
  console.log('\nDry run only. Add --apply to mutate checkpoint files.');
  process.exit(0);
}

const advancementTimestamp = new Date().toISOString();
progressItem.status = status;
progressItem.updated_at = advancementTimestamp;
progressItem.evidence = evidence;
if (summary) progressItem.summary = summary;
item.status = status;
item.updated_at = advancementTimestamp;
item.evidence = evidence;
if (summary) item.summary = summary;

if (status === 'BLOCKED') {
  progress.status = 'BLOCKED';
  if (blocker && !state.known_blockers.includes(blocker)) state.known_blockers.push(blocker);
} else if (!isFinalLayerItem) {
  const next = layer.items[layerItemIndex + 1];
  progress.status = 'IN_PROGRESS';
  progress.current_item = next.id;
  state.execution_policy.active_layer = Number(layerId);
  state.execution_policy.current_item = next.id;
  state.next_item = {
    id: next.id,
    title: next.title,
    execution_mode: 'SEQUENTIAL_ITEM_GATE',
    expected_schema_change: next.schema_change_expected,
    expected_migration: next.schema_change_expected,
    objective: next.objective,
    required_primary_paths: next.primary_paths,
    required_output: next.required_outputs[0],
    package_after_item: false,
    package_after_layer_gate: true,
  };
} else if (!layerPackaged) {
  layer.status = 'GATE_PASS_AWAITING_PACKAGE';
  progress.status = 'GATE_PASS_AWAITING_PACKAGE';
  console.log('Final item gate recorded. Layer packaging is still required before advancing to the next layer.');
} else {
  const archive = value('--archive');
  const checksum = value('--checksum');
  const verificationLog = value('--verification-log');
  const requiredPackage = [archive, checksum, verificationLog, layer.evidence].filter(Boolean);
  if (!archive || !checksum || !verificationLog || requiredPackage.some((path) => !existsSync(resolve(root, path)) && !existsSync(path))) {
    console.error('Refusing layer advancement: --archive, --checksum, --verification-log and layer evidence must all exist.');
    process.exit(1);
  }
  progress.status = 'COMPLETE';
  layer.status = 'COMPLETE';
  const nextLayerId = String(Number(layerId) + 1);
  const nextLayer = execution.layers?.[nextLayerId];
  state.checkpoint.verified_archive = basename(archive);
  state.checkpoint.verification_log = basename(verificationLog);
  state.checkpoint.implementation_verification_log = basename(verificationLog);
  state.checkpoint.completed_through = `Phase 31 Layer ${layerId}`;
  state.checkpoint.layer_status = 'PASS';
  if (nextLayer) {
    nextLayer.status = 'IN_PROGRESS';
    const next = nextLayer.items[0];
    progress = {
      schema_version: 2,
      phase: 31,
      layer: Number(nextLayerId),
      title: nextLayer.title,
      status: 'IN_PROGRESS',
      current_item: next.id,
      execution_policy: {
        mode: 'SEQUENTIAL_ITEM_GATES',
        allow_same_session_continuation: true,
        skip_items: false,
        package_frequency: 'PER_COMPLETED_LAYER'
      },
      items: nextLayer.items.map((entry) => ({ id: entry.id, title: entry.title, status: 'NOT_STARTED' })),
      completed_previous_layer: {
        layer: Number(layerId),
        status: 'COMPLETE',
        completed_through: itemId,
        verification_log: basename(verificationLog),
        verified_archive: basename(archive)
      },
      layer_artifacts: nextLayer.artifacts
    };
    state.execution_policy.active_layer = Number(nextLayerId);
    state.execution_policy.current_item = next.id;
    state.next_item = {
      id: next.id,
      title: next.title,
      execution_mode: 'SEQUENTIAL_ITEM_GATE',
      expected_schema_change: next.schema_change_expected,
      expected_migration: next.schema_change_expected,
      objective: next.objective,
      required_primary_paths: next.primary_paths,
      required_output: next.required_outputs[0],
      package_after_item: false,
      package_after_layer_gate: true,
    };
  } else {
    state.project.phase_status = 'COMPLETE';
  }
}

state.updated_at = new Date().toISOString();
execution.current_layer = state.execution_policy.active_layer;
execution.current_item = state.next_item.id;
writeJson('.ai/project-state.json', state);
writeJson('.ai/layer-progress.json', progress);
writeJson('.ai/phase31-execution-manifest.json', execution);

for (const [script, args] of [
  ['node', ['scripts/project-ai-sync-context.mjs']],
  ['node', ['scripts/project-second-brain-manifest.mjs']],
  ['node', ['scripts/project-second-brain-audit.mjs']],
]) {
  const result = spawnSync(script, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
