#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { validateRuntimeEvidenceLedger } from '../lib/meta/release/governance.ts';

const root = process.cwd();
const production = process.argv.includes('--production');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config/meta-v6-phase-manifest.json'), 'utf8'));
const ledger = JSON.parse(fs.readFileSync(path.join(root, 'config/meta-v6-runtime-evidence.json'), 'utf8'));
const checks = [];
const add = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });

const issues = validateRuntimeEvidenceLedger(manifest, ledger);
add('runtime evidence ledger schema is valid', issues.length === 0, issues.join(', '));
add('phase manifest contains exactly 15 phases', manifest.phases.length === 15);
add('phase IDs are 1 through 15', manifest.phases.every((phase, index) => phase.id === index + 1));
add('every phase state uses allowed status', manifest.phases.every((phase) => manifest.statusValues.includes(phase.state.status)));
add('every non-NOT_STARTED phase has an evidence file', manifest.phases.every((phase) => phase.state.status === 'NOT_STARTED' || Boolean(phase.state.evidenceFile)));
add('no COMPLETE phase is missing evidence file', manifest.phases.every((phase) => phase.state.status !== 'COMPLETE' || Boolean(phase.state.evidenceFile)));
add('all declared evidence files exist', manifest.phases.every((phase) => !phase.state.evidenceFile || fs.existsSync(path.join(root, phase.state.evidenceFile))));
add('runtime-required COMPLETE phases have attached evidence', manifest.phases.every((phase) => {
  if (!phase.runtimeEvidenceRequired || phase.state.status !== 'COMPLETE') return true;
  const row = ledger.phases.find((item) => item.phaseId === phase.id);
  return Boolean(row?.evidence.length && row.evidence.every((item) => ['ATTACHED', 'NOT_REQUIRED'].includes(item.status)));
}));

if (production) {
  add('all phases are COMPLETE for production', manifest.phases.every((phase) => phase.state.status === 'COMPLETE'));
  add('all runtime evidence is attached for production', manifest.phases.every((phase) => {
    if (!phase.runtimeEvidenceRequired) return true;
    const row = ledger.phases.find((item) => item.phaseId === phase.id);
    return Boolean(row?.evidence.length && row.evidence.every((item) => ['ATTACHED', 'NOT_REQUIRED'].includes(item.status)));
  }));
}

const failed = checks.filter((item) => !item.ok);
console.log(`Meta v6 evidence gate: ${checks.length - failed.length}/${checks.length} passed${production ? ' (production)' : ''}`);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
if (failed.length) process.exit(1);
