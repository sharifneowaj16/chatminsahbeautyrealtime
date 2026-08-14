#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });

const envExample = read('.env.example');
const productionEnv = read('ENVIRONMENT_VARIABLES_PRODUCTION.md');
const deployGate = read('docs/production/tracking-deploy-gate.md');
const phase5Evidence = read('docs/release/meta-v6/phase-05-evidence.md');
const buildContract = read('docs/production/build-evidence-contract.md');
const masterPlan = read('docs/release/meta-v6/master-plan.md');
const implementationPlan = read('docs/implementation/META_V6_LOOP_ENGINEERING_MASTER_PLAN.md');
const fullSpec = read('docs/spec/MinsahBeauty_Meta_AZ_Final_Spec_v6_FULL.md');
const packageJson = JSON.parse(read('package.json'));

check('.env.example documents protected redis://', envExample.includes('Use redis:// for Redis reachable only on a protected private service network.'));
check('.env.example documents TLS rediss://', envExample.includes('Use rediss:// only when the deployed Redis endpoint actually enables TLS.'));
check('.env.example uses a non-secret private-network placeholder', envExample.includes('REDIS_URL=redis://replace-with-private-redis-host:6379'));
check('production environment runbook accepts both governed protocols', productionEnv.includes('protected private service network') && productionEnv.includes('`rediss://` when the deployed Redis endpoint provides TLS'));
check('tracking deploy gate lists both Redis URL shapes', deployGate.includes('REDIS_URL=redis://redis:6379') && deployGate.includes('REDIS_URL=rediss://user:password@redis.example.invalid:6380'));
check('tracking deploy gate requires protocol/deployment parity', deployGate.includes('Both `redis://` and `rediss://` are valid when they match the deployment'));
check('Phase 5 evidence contains dated protocol correction', phase5Evidence.includes('## Phase 18 protocol correction — 21 July 2026'));
check('Phase 5 evidence no longer imposes universal rediss://', !phase5Evidence.includes('Production Redis requires `rediss://` unless insecure transport is explicitly acknowledged.'));
check('build evidence contract binds results to immutable source', buildContract.includes('Git commit SHA') && buildContract.includes('SHA-256 of that archive') && buildContract.includes('exit_code'));
check('build evidence contract treats incomplete build as blocked', buildContract.includes('missing terminal exit code is `BLOCKED`, not `PASS`'));
for (const [name, source] of [
  ['release master plan', masterPlan],
  ['implementation master plan', implementationPlan],
  ['full specification', fullSpec],
]) {
  check(`${name} uses deployment-matched Redis transport rule`, source.includes('protected private-network `redis://` or TLS-enabled `rediss://`'));
  check(`${name} has no absolute Redis TLS requirement`, !source.includes('- Redis TLS/auth in production।'));
}
check('Phase 18 audit script is registered', packageJson.scripts?.['qa:phase18-env-docs'] === 'node scripts/phase18-environment-docs-audit.mjs');
check('predeploy gate includes Phase 18 docs audit', packageJson.scripts?.['qa:predeploy']?.includes('npm run qa:phase18-env-docs'));

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}`);
console.log(`\nPhase 18 environment/docs audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
