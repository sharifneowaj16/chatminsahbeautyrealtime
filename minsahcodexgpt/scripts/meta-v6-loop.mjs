#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'config/meta-v6-phase-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('Missing config/meta-v6-phase-manifest.json');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const allMode = args.includes('--all');
const nextMode = args.includes('--next') || (!allMode && !args.includes('--phase'));
const phaseIndex = args.indexOf('--phase');
const requestedPhase = phaseIndex >= 0 ? Number(args[phaseIndex + 1]) : null;

function currentStatus(phase) {
  return phase.state?.status ?? phase.baselineStatus ?? 'NOT_STARTED';
}
function isComplete(phase) {
  return currentStatus(phase) === 'COMPLETE';
}
function isEngineeringClosed(phase) {
  return ['COMPLETE', 'READY_FOR_RUNTIME_QA', 'READY_FOR_GENERATION'].includes(currentStatus(phase));
}
function dependenciesComplete(phase) {
  return phase.dependsOn.every((id) => {
    const dependency = manifest.phases.find((item) => item.id === id);
    return dependency && isComplete(dependency);
  });
}
function dependenciesEngineeringReady(phase) {
  return phase.dependsOn.every((id) => {
    const dependency = manifest.phases.find((item) => item.id === id);
    return dependency && isEngineeringClosed(dependency);
  });
}
function phaseView(phase) {
  return {
    id: phase.id,
    title: phase.title,
    priority: phase.priority,
    status: currentStatus(phase),
    dependsOn: phase.dependsOn,
    dependenciesComplete: dependenciesComplete(phase),
    dependenciesEngineeringReady: dependenciesEngineeringReady(phase),
    objective: phase.objective,
    openGaps: phase.openGaps,
    implementationSequence: phase.implementationSequence,
    gateCommands: phase.gateCommands,
    acceptanceCriteria: phase.acceptanceCriteria,
    runtimeEvidenceRequired: phase.runtimeEvidenceRequired,
    evidenceFile: phase.state?.evidenceFile ?? `docs/release/meta-v6/phase-${String(phase.id).padStart(2, '0')}-evidence.md`,
  };
}

let selected = [];
if (allMode) {
  selected = manifest.phases;
} else if (requestedPhase !== null) {
  const phase = manifest.phases.find((item) => item.id === requestedPhase);
  if (!phase) {
    console.error(`Unknown phase: ${requestedPhase}`);
    process.exit(1);
  }
  selected = [phase];
} else if (nextMode) {
  const phase = manifest.phases.find((item) => !isEngineeringClosed(item) && dependenciesEngineeringReady(item));
  if (!phase) {
    console.error('No dependency-ready incomplete phase found. Check manifest state/dependencies.');
    process.exit(1);
  }
  selected = [phase];
}

const output = selected.map(phaseView);
if (jsonMode) {
  console.log(JSON.stringify(output.length === 1 ? output[0] : output, null, 2));
  process.exit(0);
}

for (const phase of output) {
  console.log(`\nPHASE ${phase.id}: ${phase.title}`);
  console.log(`Priority: ${phase.priority}`);
  console.log(`Status: ${phase.status}`);
  const dependencyState = phase.dependenciesComplete
    ? 'release-complete'
    : phase.dependenciesEngineeringReady
      ? 'engineering-ready; runtime/generation evidence deferred'
      : 'blocked';
  console.log(`Dependencies: ${phase.dependsOn.length ? phase.dependsOn.join(', ') : 'None'} (${dependencyState})`);
  console.log(`Evidence: ${phase.evidenceFile}`);
  console.log('\nObjective');
  console.log(phase.objective);
  console.log('\nOpen gaps');
  phase.openGaps.forEach((item, index) => console.log(`${index + 1}. ${item}`));
  console.log('\nImplementation sequence');
  phase.implementationSequence.forEach((item, index) => console.log(`${index + 1}. ${item}`));
  console.log('\nRequired gates');
  phase.gateCommands.forEach((item) => console.log(`- ${item}`));
  console.log('\nAcceptance criteria');
  phase.acceptanceCriteria.forEach((item) => console.log(`- ${item}`));
  if (phase.runtimeEvidenceRequired) {
    console.log('\nRuntime evidence is required before COMPLETE.');
  }
}
