#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  computeReleaseSourceDigest,
  createCommandEvidenceRecord,
  DEFAULT_COMMAND_EVIDENCE_MAX_AGE_HOURS,
  redactCommandOutput,
  sha256Text,
} from '../lib/meta/release/command-evidence.ts';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const requested = onlyArg ? onlyArg.slice('--only='.length).split(',').map((item) => item.trim()).filter(Boolean) : null;
const definitions = {
  typecheck: { command: 'npm', args: ['run', 'typecheck:ts'] },
  lint: { command: 'npm', args: ['run', 'lint'] },
  'master-tracking': { command: 'npm', args: ['run', 'qa:master-tracking'] },
  build: { command: 'npm', args: ['run', 'build'] },
};
const ids = requested ?? Object.keys(definitions);
for (const id of ids) {
  if (!definitions[id]) throw new Error(`COMMAND_EVIDENCE_ID_UNKNOWN:${id}`);
}

const policyPath = path.join(root, 'config/meta-v6-release-policy.json');
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const maxAgeHours = Number(policy.evidence?.commandMaxAgeHours ?? DEFAULT_COMMAND_EVIDENCE_MAX_AGE_HOURS);
const ledgerPath = path.join(root, 'config/meta-v6-command-evidence.json');
const existingRecords = fs.existsSync(ledgerPath)
  ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')).records ?? []
  : [];
const recordMap = new Map(existingRecords.map((record) => [record.id, record]));
const releaseDir = path.join(root, 'docs/release/meta-v6');
fs.mkdirSync(releaseDir, { recursive: true });

for (const id of ids) {
  const definition = definitions[id];
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const sourceSha256 = computeReleaseSourceDigest(root);
  const result = spawnSync(definition.command, definition.args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 30,
    env: { ...process.env, CI: '1' },
  });
  const finishedAt = new Date(Math.max(Date.now(), startedMs)).toISOString();
  const output = redactCommandOutput(`${result.stdout ?? ''}${result.stderr ?? ''}`.replace(/\r\n/g, '\n'));
  const logPath = `docs/release/meta-v6/phase-16-command-${id}.log`;
  fs.writeFileSync(path.join(root, logPath), output, 'utf8');
  const logSha256 = sha256Text(output);
  const exitCode = Number.isInteger(result.status) ? result.status : 1;
  recordMap.set(id, createCommandEvidenceRecord({
    id,
    command: definition.command,
    args: definition.args,
    exitCode,
    startedAt,
    finishedAt,
    output,
    logPath,
    logSha256,
    sourceSha256,
  }));
  console.log(`${exitCode === 0 ? 'PASS' : 'FAIL'} ${id} (${Date.parse(finishedAt) - Date.parse(startedAt)}ms)`);
}

const records = Object.keys(definitions).map((id) => recordMap.get(id)).filter(Boolean);
const ledger = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  maxAgeHours,
  records,
};
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
console.log(`Wrote ${records.length} command evidence records.`);
if (strict && ids.some((id) => recordMap.get(id)?.status !== 'PASS')) process.exit(1);
