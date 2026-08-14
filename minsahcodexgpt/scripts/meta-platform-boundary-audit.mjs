#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const blocked = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });

const requiredFiles = [
  'lib/meta-platform/index.ts',
  'lib/meta-platform/platform.ts',
  'lib/meta-platform/server.ts',
  'lib/meta-platform/types.ts',
  'lib/meta-platform/core/context.ts',
  'lib/meta-platform/core/errors.ts',
  'lib/meta-platform/core/result.ts',
  'lib/meta-platform/core/validation.ts',
  'lib/meta-platform/capabilities/registry.ts',
  'lib/meta-platform/migration/legacy-facade.ts',
  'docs/architecture/meta/ADR-020-meta-platform-facade-boundary.md',
];

for (const file of requiredFiles) check(`${file} exists`, exists(file));

const sourceFiles = requiredFiles.filter((file) => file.endsWith('.ts'));
const source = new Map(sourceFiles.filter(exists).map((file) => [file, read(file)]));
const serverSource = source.get('lib/meta-platform/server.ts') ?? '';
const legacySource = source.get('lib/meta-platform/migration/legacy-facade.ts') ?? '';
const publicSource = source.get('lib/meta-platform/index.ts') ?? '';

check('server entry is explicitly server-only', /^import ['"]server-only['"];?/m.test(serverSource));
check('legacy compatibility facade is explicitly server-only', /^import ['"]server-only['"];?/m.test(legacySource));
check('public entry does not export or import the server entry', !/['"]\.\/server['"]|legacy-facade/.test(publicSource));

const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;
function localImports(file) {
  const content = source.get(file) ?? read(file);
  const imports = [];
  for (const match of content.matchAll(importPattern)) {
    if (match[1].startsWith('.')) imports.push(match[1]);
  }
  return imports;
}

function resolveLocalImport(fromFile, specifier) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
  for (const candidate of [`${base}.ts`, `${base}.json`, `${base}/index.ts`]) {
    if (exists(candidate)) return candidate;
  }
  return null;
}

const publicClosure = new Set();
const stack = ['lib/meta-platform/index.ts'];
let unresolvedImport = '';
while (stack.length > 0) {
  const file = stack.pop();
  if (!file || publicClosure.has(file)) continue;
  publicClosure.add(file);
  for (const specifier of localImports(file)) {
    const resolved = resolveLocalImport(file, specifier);
    if (!resolved) {
      unresolvedImport = `${file}:${specifier}`;
      continue;
    }
    stack.push(resolved);
  }
}

check('public dependency graph has no unresolved local imports', !unresolvedImport, unresolvedImport);
check('public dependency graph stays inside lib/meta-platform', [...publicClosure].every((file) => file.startsWith('lib/meta-platform/')));
check('public dependency graph excludes server-only paths', ![...publicClosure].some((file) => file.endsWith('/server.ts') || file.includes('/migration/')));

const forbiddenPublicPatterns = [
  ['server-only marker', /['"]server-only['"]/],
  ['Business SDK import', /facebook-nodejs-business-sdk/],
  ['Graph URL', /graph\.(?:facebook|instagram)\.com/i],
  ['provider environment read', /process\.env\.(?:META|FACEBOOK|INSTAGRAM)_/],
  ['Prisma import', /@prisma\/client|lib\/prisma/],
  ['Redis import', /from ['"]ioredis['"]|require\(['"]ioredis['"]\)/],
  ['BullMQ import', /from ['"]bullmq['"]|require\(['"]bullmq['"]\)/],
  ['Node builtin import', /from ['"]node:/],
  ['network call', /\bfetch\s*\(|\baxios\b/],
];
for (const [label, pattern] of forbiddenPublicPatterns) {
  const offenders = [...publicClosure].filter((file) => pattern.test(read(file)));
  check(`public dependency graph has no ${label}`, offenders.length === 0, offenders.join(', '));
}

const allPhase20Source = [...source.values()].join('\n');
check('Phase 20 source has no direct Business SDK import', !/facebook-nodejs-business-sdk/.test(allPhase20Source));
check('Phase 20 source has no direct Graph URL', !/graph\.(?:facebook|instagram)\.com/i.test(allPhase20Source));
check('Phase 20 source reads no provider environment variable', !/process\.env\.(?:META|FACEBOOK|INSTAGRAM)_/.test(allPhase20Source));
check('Phase 20 source creates no Prisma, Redis, BullMQ or SDK client at import time', !/new\s+(?:PrismaClient|Redis|Queue|Worker|FacebookAdsApi)\b/.test(allPhase20Source));

const manifest = JSON.parse(read('config/meta-capability-manifest.json'));
const registrySource = read('lib/meta-platform/capabilities/registry.ts');
for (const capability of manifest.capabilities) {
  check(`registry declares ${capability.id}`, registrySource.includes(`id: '${capability.id}'`));
  check(`registry phase/cutover matches ${capability.id}`,
    registrySource.includes(`id: '${capability.id}', targetPhase: ${capability.targetPhase}, cutoverFlag: '${capability.cutoverFlag}'`));
}
const targetPaths = manifest.inventory.filter((entry) => entry.path.startsWith('lib/meta-platform/'));
const phase20Paths = targetPaths.filter((entry) => entry.targetPhase === 20);
check('all Phase 20 MetaPlatform source paths are frozen in the inventory',
  sourceFiles.every((file) => phase20Paths.some((entry) => entry.path === file)),
  `phase20Inventory=${phase20Paths.length}, phase20Source=${sourceFiles.length}`);
check('Phase 20 MetaPlatform paths retain shared-support ownership', phase20Paths.every((entry) =>
  entry.primaryCapabilityId === 'shared-meta-support'
  && entry.lifecycle === 'ACTIVE'));
check('later MetaPlatform paths declare a later governed phase', targetPaths
  .filter((entry) => !sourceFiles.includes(entry.path))
  .every((entry) => entry.targetPhase >= 21 && entry.lifecycle === 'ACTIVE'));

const pkg = JSON.parse(read('package.json'));
check('Phase 20 focused test script exists', pkg.scripts?.['test:meta-v6-phase20'] === 'node --conditions=react-server --import tsx --test tests/meta-v6/phase20-meta-platform-core.test.ts');
check('Phase 20 boundary audit script exists', pkg.scripts?.['qa:meta-platform-boundaries'] === 'node scripts/meta-platform-boundary-audit.mjs');
check('Phase 20 aggregate gate includes inventory drift audit', /test:meta-v6-phase20/.test(pkg.scripts?.['qa:meta-v6-phase20'] ?? '') && /qa:meta-platform-boundaries/.test(pkg.scripts?.['qa:meta-v6-phase20'] ?? '') && /qa:meta-platform-inventory/.test(pkg.scripts?.['qa:meta-v6-phase20'] ?? ''));
check('predeploy runs Phase 20 before release gates', /qa:meta-v6-phase20/.test(pkg.scripts?.['qa:predeploy'] ?? ''));

function runImport(args, label) {
  try {
    execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    check(label, true);
  } catch (error) {
    const detail = error && typeof error === 'object' && 'stderr' in error ? String(error.stderr).trim() : String(error);
    if (/Cannot find package 'tsx'|ERR_MODULE_NOT_FOUND[\s\S]*tsx/.test(detail)) {
      blocked.push({ label, detail: "locked dependency 'tsx' is not installed" });
      return;
    }
    check(label, false, detail);
  }
}

runImport([
  '--import', 'tsx', '--eval',
  "await import('./lib/meta-platform/index.ts');",
], 'public entry imports without react-server conditions');
runImport([
  '--conditions=react-server', '--import', 'tsx', '--eval',
  "globalThis.fetch=async()=>{throw new Error('NETWORK_CALL_ON_IMPORT')}; await import('./lib/meta-platform/server.ts');",
], 'server entry imports without provider or network initialization');

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
}
for (const item of blocked) console.log(`BLOCKED ${item.label} — ${item.detail}`);
console.log(`\nPhase 20 MetaPlatform boundary audit: ${passed}/${checks.length} passed; ${blocked.length} blocked`);
if (passed !== checks.length) process.exit(1);
