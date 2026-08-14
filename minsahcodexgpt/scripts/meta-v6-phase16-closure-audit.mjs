#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });
const read = (relative) => fs.existsSync(path.join(root, relative)) ? fs.readFileSync(path.join(root, relative), 'utf8') : '';
const hasAll = (text, tokens) => tokens.every((token) => text.includes(token));

const requiredFiles = [
  'lib/meta/release/command-evidence.ts',
  'scripts/meta-v6-command-evidence.mjs',
  'scripts/meta-v6-closure-status.mjs',
  'config/meta-v6-command-evidence.json',
  'config/meta-v6-production-closure-plan.json',
  'docs/release/meta-v6/PHASE16_PRODUCTION_READINESS_CLOSURE_RUNBOOK.md',
  'docs/release/meta-v6/phase-16-evidence.md',
  'PRODUCTION_QA.md',
  'tracking.md',
  'PHASE10_PRODUCT_URL_TRACKING_QA_GUARDRAILS.md',
  'PHASE11_TRACKING_DEPLOY_GATE_HARDENING.md',
  'PHASE15_PRODUCT_LIFECYCLE_ANALYTICS.md',
  'PHASE17_TRACKING_QA_AUTOMATION.md',
];
for (const file of requiredFiles) check(`file exists: ${file}`, fs.existsSync(path.join(root, file)));

const library = read('lib/meta/release/command-evidence.ts');
for (const token of [
  'redactCommandOutput',
  'createCommandEvidenceRecord',
  'validateCommandEvidenceLedger',
  'validateCommandEvidenceLogs',
  'validateCommandEvidenceSource',
  'computeReleaseSourceDigest',
  'commandEvidenceToGate',
  'COMMAND_EVIDENCE_DIGEST_MISMATCH',
  'COMMAND_EVIDENCE_EXPIRED',
  'COMMAND_EVIDENCE_LOG_HASH_MISMATCH',
  "SAFE_LOG_PREFIX = 'docs/release/meta-v6/'",
]) check(`command evidence library contains ${token}`, library.includes(token));

const collector = read('scripts/meta-v6-command-evidence.mjs');
for (const token of [
  "typecheck: { command: 'npm', args: ['run', 'typecheck:ts'] }",
  "lint: { command: 'npm', args: ['run', 'lint'] }",
  "'master-tracking': { command: 'npm', args: ['run', 'qa:master-tracking'] }",
  "build: { command: 'npm', args: ['run', 'build'] }",
  'redactCommandOutput',
  'computeReleaseSourceDigest',
  'phase-16-command-',
  'config/meta-v6-command-evidence.json',
]) check(`collector contains ${token}`, collector.includes(token));

const releaseGate = read('scripts/meta-v6-release-gate.mjs');
for (const token of [
  'validateCommandEvidenceLedger',
  'validateCommandEvidenceLogs',
  'validateCommandEvidenceSource',
  "id: 'command-evidence'",
  'commandEvidenceToGate',
  'config/meta-v6-command-evidence.json',
]) check(`release gate consumes ${token}`, releaseGate.includes(token));

const policy = JSON.parse(read('config/meta-v6-release-policy.json') || '{}');
check('release policy requires command-evidence gate', policy.requiredProductionGates?.includes('command-evidence'));
check('release policy command evidence expires within 24 hours', policy.evidence?.commandMaxAgeHours === 24);
check('release policy declares four command IDs', policy.evidence?.commandIds?.length === 4);

const plan = JSON.parse(read('config/meta-v6-production-closure-plan.json') || '{}');
check('closure plan schema version is 1', plan.schemaVersion === 1);
check('closure plan has at least eight workstreams', plan.workstreams?.length >= 8);
for (const stream of plan.workstreams ?? []) {
  check(`closure stream ${stream.id} has owner`, Boolean(stream.owner));
  check(`closure stream ${stream.id} has blocker patterns`, stream.blockerPatterns?.length > 0);
  check(`closure stream ${stream.id} has commands`, stream.commands?.length > 0);
  check(`closure stream ${stream.id} has evidence`, stream.requiredEvidence?.length > 0);
  check(`closure stream ${stream.id} has completion rule`, Boolean(stream.completionRule));
}

const packageJson = JSON.parse(read('package.json') || '{}');
check('package exposes command evidence capture', packageJson.scripts?.['capture:meta-v6-command-evidence'] === 'node --import tsx scripts/meta-v6-command-evidence.mjs');
check('package exposes closure status', packageJson.scripts?.['qa:meta-v6-closure-status'] === 'node scripts/meta-v6-closure-status.mjs');
check('package exposes Phase 16 semantic test', packageJson.scripts?.['test:meta-v6-phase16']?.includes('phase16-production-readiness-closure.test.ts'));
check('package exposes Phase 16 QA', packageJson.scripts?.['qa:meta-v6-phase16']?.includes('meta-v6-phase16-closure-audit.mjs'));
check('predeploy runs Phase 16 closure QA', packageJson.scripts?.['qa:predeploy']?.includes('qa:meta-v6-phase16'));

const masterAudit = read('scripts/master-tracking-regression-audit.mjs');
check('master audit accepts canonical event ID helper', hasAll(masterAudit, ['buildMetaPurchaseEventId(orderId)', "read('lib/meta/capi/event-id.ts')"]));
check('master audit accepts consent-aware coupon capture', hasAll(masterAudit, ['attributionCouponCode: nonEssentialTrackingAllowed', 'cleanAttributionValue(attribution.coupon_code, 100)']));
const phase8Audit = read('scripts/phase8-static-contract-check.mjs');
check('Phase 8 audit permits stronger predeploy prefix gates', hasAll(phase8Audit, ['predeployRequired', 'missing or reorders required command']));
check('legacy master tracking now has all handoff documents', requiredFiles.slice(7).every((file) => fs.existsSync(path.join(root, file))));

const failed = checks.filter((item) => !item.ok);
console.log(`Phase 16 production-readiness closure static audit: ${checks.length - failed.length}/${checks.length} passed`);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}`);
if (failed.length) process.exit(1);
