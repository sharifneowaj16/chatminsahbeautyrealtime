#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createReleaseClaim } from '../lib/meta/release/governance.ts';

const root = process.cwd();
const releaseId = process.argv.find((arg) => arg.startsWith('--release-id='))?.slice('--release-id='.length);
if (!releaseId) throw new Error('Usage: npm run release:meta-v6-claim -- --release-id=<id>');
const gate = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/meta-v6-release-gate.mjs', '--production', '--write-report'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
if (gate.status !== 0) throw new Error('PRODUCTION_RELEASE_GATE_FAILED');
const reportPath = path.join(root, 'docs/release/meta-v6/phase-15-production-release-report.json');
if (!fs.existsSync(reportPath)) throw new Error('PRODUCTION_RELEASE_REPORT_MISSING');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const claim = createReleaseClaim(report, releaseId);
const claimPath = path.join(root, 'docs/release/meta-v6', `release-claim-${releaseId}.json`);
fs.writeFileSync(claimPath, `${JSON.stringify(claim, null, 2)}\n`, { flag: 'wx' });
console.log(`Release claim written: ${claimPath}`);
