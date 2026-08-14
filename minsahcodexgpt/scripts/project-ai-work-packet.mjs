#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const itemArg = args.find((arg) => arg.startsWith('--item='))?.split('=')[1]
  ?? (args.indexOf('--item') >= 0 ? args[args.indexOf('--item') + 1] : undefined);

const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const state = readJson('.ai/project-state.json');
const execution = readJson('.ai/phase31-execution-manifest.json');
const itemId = itemArg ?? state.next_item?.id;

let layer;
let item;
for (const candidate of Object.values(execution.layers ?? {})) {
  const found = candidate.items?.find((entry) => entry.id === itemId);
  if (found) {
    layer = candidate;
    item = found;
    break;
  }
}

if (!item || !layer) {
  console.error(`Unknown Phase 31 item: ${itemId}`);
  process.exit(1);
}

const packet = {
  project: state.project?.name,
  phase: 31,
  completedThrough: state.checkpoint?.completed_through,
  implementationVerificationLog: state.checkpoint?.implementation_verification_log,
  activeLayer: Number(item.id.split('.')[0]),
  layerTitle: layer.title,
  item: item.id,
  title: item.title,
  mode: item.mode,
  objective: item.objective,
  primaryPaths: item.primary_paths,
  acceptanceCriteria: item.acceptance_criteria,
  requiredOutputs: item.required_outputs,
  commandContract: item.command_contract,
  schemaChangeExpected: item.schema_change_expected,
  schemaChangePossibleOnlyWithEvidence: item.schema_change_possible_only_with_evidence,
  noItemZip: execution.standard_item_contract?.no_item_zip,
  layerArtifacts: layer.artifacts,
  claimBoundaries: execution.global_claim_boundaries,
};

if (jsonMode) {
  console.log(JSON.stringify(packet, null, 2));
  process.exit(0);
}

console.log(`# Phase 31 Work Packet — ${item.id}`);
console.log(`\n**${item.title}** · ${item.mode}`);
console.log(`\nCheckpoint: ${packet.completedThrough}`);
console.log(`\nObjective: ${item.objective}`);
console.log('\nPrimary paths:');
for (const path of item.primary_paths) console.log(`- ${path}`);
console.log('\nAcceptance criteria:');
for (const criterion of item.acceptance_criteria) console.log(`- ${criterion}`);
console.log('\nRequired outputs:');
for (const output of item.required_outputs) console.log(`- ${output}`);
console.log('\nCommand contract to implement/run:');
console.log(`- npm run ${item.command_contract.test}`);
console.log(`- npm run ${item.command_contract.audit}`);
console.log(`- npm run ${item.command_contract.gate}`);
console.log(`\nSchema change expected: ${item.schema_change_expected ? 'YES' : 'NO'}`);
console.log('Item ZIP: NO');
console.log(`Layer package after: ${layer.items.at(-1)?.id}`);
