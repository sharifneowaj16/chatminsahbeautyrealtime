#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const checks = [];
const add = (ok, message) => checks.push({ ok, message });
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const has = (p, needle) => exists(p) && read(p).includes(needle);

function runNodeScript(script) {
  try {
    execFileSync('node', [script], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
    return true;
  } catch (err) {
    return false;
  }
}

add(runNodeScript('scripts/phase11-checkout-release-gate-audit.mjs'), 'Phase 11 checkout release gate passes from Final RC audit');
add(exists('docs/release/FINAL_RC_DEPLOYMENT_READINESS_HANDOFF.md'), 'Final RC deployment handoff doc exists');
add(exists('PHASE_FINAL_RC_DEPLOYMENT_READINESS_HANDOFF.md'), 'Final RC phase report exists');
add(exists('docs/production/CHECKOUT_RELEASE_DEPLOY_RUNBOOK.md'), 'Checkout deploy runbook exists');
add(has('docs/production/CHECKOUT_RELEASE_DEPLOY_RUNBOOK.md', 'npm ci'), 'Deploy runbook includes npm ci');
add(has('docs/production/CHECKOUT_RELEASE_DEPLOY_RUNBOOK.md', 'npx prisma generate'), 'Deploy runbook includes Prisma generate');
add(has('docs/production/CHECKOUT_RELEASE_DEPLOY_RUNBOOK.md', 'npx prisma migrate deploy'), 'Deploy runbook includes Prisma migrate deploy');
add(has('docs/production/CHECKOUT_RELEASE_DEPLOY_RUNBOOK.md', 'npm run typecheck'), 'Deploy runbook includes typecheck');
add(has('docs/production/CHECKOUT_RELEASE_DEPLOY_RUNBOOK.md', 'npm run build'), 'Deploy runbook includes build');
add(has('docs/release/FINAL_RC_DEPLOYMENT_READINESS_HANDOFF.md', 'Conditional GO'), 'Final RC handoff states conditional GO');
add(has('docs/release/FINAL_RC_DEPLOYMENT_READINESS_HANDOFF.md', 'npm run typecheck'), 'Final RC handoff lists typecheck as required runtime gate');
add(has('docs/release/FINAL_RC_DEPLOYMENT_READINESS_HANDOFF.md', 'npm run build'), 'Final RC handoff lists build as required runtime gate');
add(has('docs/release/FINAL_RC_DEPLOYMENT_READINESS_HANDOFF.md', 'npx prisma migrate deploy'), 'Final RC handoff lists Prisma migration requirement');
add(has('docs/release/FINAL_RC_DEPLOYMENT_READINESS_HANDOFF.md', 'COD'), 'Final RC handoff includes COD smoke test');
add(has('docs/release/FINAL_RC_DEPLOYMENT_READINESS_HANDOFF.md', 'bKash'), 'Final RC handoff includes bKash smoke test');
add(has('docs/release/FINAL_RC_DEPLOYMENT_READINESS_HANDOFF.md', 'Nagad'), 'Final RC handoff includes Nagad smoke test');
add(has('docs/release/FINAL_RC_DEPLOYMENT_READINESS_HANDOFF.md', '/api/cron/release-unpaid-orders'), 'Final RC handoff includes unpaid-order cron endpoint');
add(has('package.json', '"qa:checkout-release-gate"'), 'package exposes checkout release gate script');
add(has('package.json', '"qa:final-rc"'), 'package exposes final RC audit script');

const textFiles = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (['node_modules', '.next', '.git'].includes(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|mjs|md|json|prisma|sql)$/.test(name)) textFiles.push(full);
  }
}
walk(root);
const conflictMarkers = textFiles.filter((file) => /^(<<<<<<<|=======|>>>>>>>) /m.test(fs.readFileSync(file, 'utf8')));
add(conflictMarkers.length === 0, 'No git conflict markers in Final RC text/code files');

for (const check of checks) {
  console.log(`${check.ok ? '✅' : '❌'} ${check.message}`);
}

const failed = checks.filter((c) => !c.ok);
if (failed.length) {
  console.error(`\nFinal RC deployment readiness audit failed: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`\nFinal RC deployment readiness audit: ${checks.length}/${checks.length} checks passed.`);
