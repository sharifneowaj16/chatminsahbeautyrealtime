#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateReleaseReadiness } from '../lib/meta/release/governance.ts';
import {
  commandEvidenceToGate,
  validateCommandEvidenceLedger,
  validateCommandEvidenceLogs,
  validateCommandEvidenceSource,
} from '../lib/meta/release/command-evidence.ts';

const root = process.cwd();
const production = process.argv.includes('--production');
const writeReport = process.argv.includes('--write-report');
const evidenceOnly = process.argv.includes('--evidence-only');
const mode = production ? 'production' : 'engineering';
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'config/meta-v6-phase-manifest.json'), 'utf8'));
const runtimeLedger = JSON.parse(fs.readFileSync(path.join(root, 'config/meta-v6-runtime-evidence.json'), 'utf8'));

function run(id, command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', env: process.env, ...options });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  return { id, status: result.status === 0 ? 'PASS' : 'FAIL', detail: output.split('\n').slice(-4).join(' | ') };
}

const gates = [
  run('global-blockers', process.execPath, ['scripts/meta-v6-gap-audit.mjs', '--strict']),
  run('migration-governance', process.execPath, ['scripts/meta-v6-migration-governance-audit.mjs']),
  run('evidence-ledger', process.execPath, ['--import', 'tsx', 'scripts/meta-v6-evidence-gate.mjs', ...(production ? ['--production'] : [])]),
  run('graph-version-policy', process.execPath, ['scripts/meta-graph-version-policy-audit.mjs', ...(production ? ['--release'] : [])]),
  run('prisma-client-freshness', process.execPath, ['scripts/prisma-client-freshness.mjs']),
];

if (!production) {
  gates.push(run('phase-15-semantic-static', 'npm', ['run', 'qa:meta-v6-phase15']));
} else {
  const reportOnly = [
    ['typecheck', ['run', 'typecheck']],
    ['lint', ['run', 'lint']],
    ['build', ['run', 'build']],
    ['master-tracking', ['run', 'qa:master-tracking']],
  ];
  if (evidenceOnly) {
    const commandEvidencePath = path.join(root, 'config/meta-v6-command-evidence.json');
    if (!fs.existsSync(commandEvidencePath)) {
      gates.push({ id: 'command-evidence', status: 'FAIL', detail: 'config/meta-v6-command-evidence.json is missing.' });
      for (const [id] of reportOnly) gates.push(commandEvidenceToGate(undefined, id));
    } else {
      const ledger = JSON.parse(fs.readFileSync(commandEvidencePath, 'utf8'));
      const allowedIds = reportOnly.map(([id]) => id);
      const policy = JSON.parse(fs.readFileSync(path.join(root, 'config/meta-v6-release-policy.json'), 'utf8'));
      const maxAgeHours = Number(policy.evidence?.commandMaxAgeHours ?? ledger.maxAgeHours ?? 24);
      const commandIssues = [
        ...validateCommandEvidenceLedger(ledger, { allowedIds, maxAgeHours }),
        ...validateCommandEvidenceLogs(root, ledger),
        ...validateCommandEvidenceSource(root, ledger),
      ];
      gates.push({
        id: 'command-evidence',
        status: commandIssues.length ? 'FAIL' : 'PASS',
        detail: commandIssues.length ? commandIssues.join(', ') : `${ledger.records.length} fresh hashed command artifacts verified.`,
        evidence: 'config/meta-v6-command-evidence.json',
      });
      for (const [id] of reportOnly) {
        const record = commandIssues.length ? undefined : ledger.records.find((item) => item.id === id);
        gates.push(commandEvidenceToGate(record, id));
      }
    }
  } else {
    for (const [id, args] of reportOnly) gates.push(run(id, 'npm', args));
  }
  gates.push({ id: 'critical-e2e', status: 'PENDING', detail: 'Attach isolated PostgreSQL/Redis and Meta staging E2E evidence.' });
  gates.push({ id: 'migration-apply-rollback', status: 'PENDING', detail: 'Attach disposable PostgreSQL apply and rollback/forward-fix drill evidence.' });
}

const evaluation = evaluateReleaseReadiness({ mode, manifest, runtimeLedger, gates });
const outputPath = path.join(root, 'docs/release/meta-v6', `phase-15-${mode}-release-report.json`);
if (writeReport) fs.writeFileSync(outputPath, `${JSON.stringify(evaluation, null, 2)}\n`);
console.log(JSON.stringify(evaluation, null, 2));
if (evaluation.decision !== 'PASS') process.exit(1);
