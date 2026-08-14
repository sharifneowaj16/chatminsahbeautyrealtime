#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const pkg = JSON.parse(read('package.json'));
const scripts = pkg.scripts || {};
const checks = [];

function check(name, condition, details = '') {
  checks.push({ name, ok: Boolean(condition), details });
}

function scriptIncludes(scriptName, required) {
  const value = scripts[scriptName] || '';
  return required.every((part) => value.includes(part));
}

check('package.json exists', exists('package.json'));
check('package-lock.json exists for reproducible npm ci', exists('package-lock.json'));
check('prisma schema exists', exists('prisma/schema.prisma'));
check('prisma migrations folder exists', exists('prisma/migrations'));
check('next config exists', exists('next.config.ts') || exists('next.config.mjs') || exists('next.config.js'));
check('tsconfig exists', exists('tsconfig.json'));
check('eslint config exists', exists('eslint.config.mjs') || exists('.eslintrc.json') || exists('.eslintrc.js'));
check('.deployignore exists', exists('.deployignore'));
check('production phase 9 deploy proof doc exists', exists('docs/production/phase-9-build-typecheck-deploy-proof.md'));

check('script lint exists', Boolean(scripts.lint));
check('script lint runs eslint', scriptIncludes('lint', ['eslint']));
check('script db:migrate deploy exists', scriptIncludes('db:migrate', ['prisma migrate deploy']));
check('script db:generate exists', scriptIncludes('db:generate', ['prisma generate']));
check('script typecheck runs prisma generate first', scriptIncludes('typecheck', ['prisma generate']));
check('script typecheck runs tsc --noEmit', scriptIncludes('typecheck', ['tsc --noEmit']));
check('script build runs prisma generate first', scriptIncludes('build', ['prisma generate']));
check('script build runs next build', scriptIncludes('build', ['next build']));
check('script qa:predeploy exists', Boolean(scripts['qa:predeploy']));
check('script qa:predeploy includes Phase 9 proof audit', scriptIncludes('qa:predeploy', ['npm run qa:phase9-build-deploy-proof']));
check('script qa:predeploy includes lint', scriptIncludes('qa:predeploy', ['npm run lint']));
check('script qa:predeploy includes typecheck', scriptIncludes('qa:predeploy', ['npm run typecheck']));
check('script qa:predeploy includes production build', scriptIncludes('qa:predeploy', ['npm run build']));
check('script qa:predeploy includes production runtime gate', scriptIncludes('qa:predeploy', ['npm run qa:phase8-production-runtime']));
check('script qa:predeploy includes tracking deploy gate', scriptIncludes('qa:predeploy', ['npm run qa:tracking-deploy-gate']));
check('script qa:predeploy includes production QA smoke', scriptIncludes('qa:predeploy', ['npm run qa:production']));
check('script deploy:verify delegates to qa:predeploy', scripts['deploy:verify'] === 'npm run qa:predeploy');

const deployignore = exists('.deployignore') ? read('.deployignore') : '';
check('.deployignore excludes node_modules', deployignore.includes('node_modules/'));
check('.deployignore excludes .next output', deployignore.includes('.next/'));
check('.deployignore excludes env files', deployignore.includes('.env'));
check('.deployignore keeps .env.example', deployignore.includes('!.env.example'));

const gitignore = exists('.gitignore') ? read('.gitignore') : '';
check('.gitignore excludes generated Prisma client', gitignore.includes('/generated/prisma'));
check('.gitignore excludes env files but keeps .env.example', gitignore.includes('.env') && gitignore.includes('!.env.example'));

const doc = exists('docs/production/phase-9-build-typecheck-deploy-proof.md')
  ? read('docs/production/phase-9-build-typecheck-deploy-proof.md')
  : '';
for (const required of [
  'npm ci',
  'npx prisma generate',
  'npx prisma migrate deploy',
  'npm run lint',
  'npm run typecheck',
  'npm run build',
  'npm run qa:predeploy',
  'SEARCH_PRODUCTION_BASE_URL',
  'TRACKING_DEPLOY_GATE_LIVE_REDIS=true',
  'binaries.prisma.sh',
  'No-Go',
]) {
  check(`phase 9 doc mentions ${required}`, doc.includes(required));
}

const envDoc = exists('ENVIRONMENT_VARIABLES_PRODUCTION.md') ? read('ENVIRONMENT_VARIABLES_PRODUCTION.md') : '';
check('production env docs mention phase 9 deploy proof', envDoc.includes('qa:phase9-build-deploy-proof') || envDoc.includes('Phase 9'));

const failed = checks.filter((c) => !c.ok);
const result = {
  ok: failed.length === 0,
  passed: checks.length - failed.length,
  failed: failed.length,
  issues: failed.map((c) => c.name),
};

if (process.env.AUDIT_JSON === '1') {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const c of checks) {
    console.log(`${c.ok ? '✅' : '❌'} ${c.name}${c.details ? ` — ${c.details}` : ''}`);
  }
  console.log(`\nPhase 9 build/typecheck/deploy proof audit: ${result.passed}/${checks.length} checks passed.`);
}

if (!result.ok) process.exit(1);
