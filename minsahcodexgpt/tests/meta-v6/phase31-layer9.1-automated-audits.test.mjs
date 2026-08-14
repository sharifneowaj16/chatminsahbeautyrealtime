import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';
import {
  PHASE31_EXCLUDED_LIVE_SCOPES,
  PHASE31_STATIC_AUDIT_SUITE_ORDER,
  PHASE31_STATIC_AUDIT_SUITES,
} from '../../scripts/meta-v6-phase31-audit-contract.mjs';
import {
  createStaticAuditEnvironment,
  getPhase31StaticAuditManifest,
  validatePhase31StaticAuditContract,
} from '../../scripts/meta-v6-phase31-audit-runner.mjs';

const root = new URL('../../', import.meta.url);
const source = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const json = (path) => JSON.parse(source(path));
const wrappers = {
  webhooks: 'scripts/meta-v6-phase31-webhook-audit.mjs',
  persistence: 'scripts/meta-v6-phase31-persistence-audit.mjs',
  leads: 'scripts/meta-v6-phase31-leads-audit.mjs',
  instagram: 'scripts/meta-v6-phase31-instagram-audit.mjs',
  realtime: 'scripts/meta-v6-phase31-realtime-audit.mjs',
  admin: 'scripts/meta-v6-phase31-admin-audit.mjs',
  cutover: 'scripts/meta-v6-phase31-cutover-audit.mjs',
};

const expectedPackageScripts = {
  'qa:phase31-meta-webhooks': 'node scripts/meta-v6-phase31-webhook-audit.mjs',
  'qa:phase31-meta-persistence': 'node scripts/meta-v6-phase31-persistence-audit.mjs',
  'qa:phase31-meta-leads': 'node scripts/meta-v6-phase31-leads-audit.mjs',
  'qa:phase31-meta-instagram': 'node scripts/meta-v6-phase31-instagram-audit.mjs',
  'qa:phase31-meta-realtime': 'node scripts/meta-v6-phase31-realtime-audit.mjs',
  'qa:phase31-meta-admin': 'node scripts/meta-v6-phase31-admin-audit.mjs',
  'qa:phase31-meta-cutover': 'node scripts/meta-v6-phase31-cutover-audit.mjs',
  'qa:phase31-meta-social-crm': 'npm run qa:phase31-meta-webhooks && npm run qa:phase31-meta-persistence && npm run qa:phase31-meta-leads && npm run qa:phase31-meta-instagram && npm run qa:phase31-meta-realtime && npm run qa:phase31-meta-admin && npm run qa:phase31-meta-cutover',
};

test('9.1 canonical seven-suite order and static execution class are fixed', () => {
  assert.deepEqual(PHASE31_STATIC_AUDIT_SUITE_ORDER, [
    'webhooks',
    'persistence',
    'leads',
    'instagram',
    'realtime',
    'admin',
    'cutover',
  ]);
  assert.deepEqual(Object.keys(PHASE31_STATIC_AUDIT_SUITES), PHASE31_STATIC_AUDIT_SUITE_ORDER);
  for (const suiteName of PHASE31_STATIC_AUDIT_SUITE_ORDER) {
    const suite = PHASE31_STATIC_AUDIT_SUITES[suiteName];
    assert.equal(suite.executionClass, 'STATIC_NO_SECRETS');
    assert.ok(suite.commands.length > 0, suiteName);
  }
});

test('9.1 package scripts expose roadmap wrappers and cumulative command exactly', () => {
  const pkg = json('package.json');
  for (const [name, command] of Object.entries(expectedPackageScripts)) {
    assert.equal(pkg.scripts[name], command, name);
  }
  assert.equal(pkg.scripts['test:meta-v6-phase31-layer9.1'], 'node --test tests/meta-v6/phase31-layer9.1-automated-audits.test.mjs');
  assert.equal(pkg.scripts['qa:meta-platform-phase31-layer9.1'], 'node scripts/meta-platform-phase31-layer9.1-audit.mjs');
  assert.match(pkg.scripts['qa:phase31-meta-layer9.1'], /qa:phase31-meta-social-crm/);
});

test('9.1 every suite command resolves to a package script and forbids live/runtime gates', () => {
  const pkg = json('package.json');
  assert.deepEqual(validatePhase31StaticAuditContract(pkg.scripts), []);
  for (const suite of Object.values(PHASE31_STATIC_AUDIT_SUITES)) {
    for (const command of suite.commands) {
      assert.equal(typeof pkg.scripts[command], 'string', command);
      assert.doesNotMatch(command, /live|provider-evidence|layer3-db|(?:^|:)release(?:$|:)|(?:^|:)build(?:$|:)/i);
    }
  }
});

test('9.1 static child environment strips secret-bearing values and marks live evidence disabled', () => {
  const env = createStaticAuditEnvironment({
    PATH: '/usr/bin',
    HOME: '/tmp/home',
    META_ACCESS_TOKEN: 'sentinel-access-token',
    META_APP_SECRET: 'sentinel-app-secret',
    DATABASE_URL: 'postgres://sentinel',
    REDIS_URL: 'redis://sentinel',
    INTERNAL_API_PASSWORD: 'sentinel-password',
  });
  assert.equal(env.PATH, '/usr/bin');
  assert.equal(env.HOME, '/tmp/home');
  assert.equal(env.META_ACCESS_TOKEN, undefined);
  assert.equal(env.META_APP_SECRET, undefined);
  assert.equal(env.DATABASE_URL, undefined);
  assert.equal(env.REDIS_URL, undefined);
  assert.equal(env.INTERNAL_API_PASSWORD, undefined);
  assert.equal(env.CI, '1');
  assert.equal(env.PHASE31_AUDIT_MODE, 'STATIC_NO_SECRETS');
  assert.equal(env.PHASE31_LIVE_PROVIDER_EVIDENCE, 'DISABLED');
});

test('9.1 wrapper manifests are deterministic, JSON-readable and never expose injected secrets', () => {
  for (const [suiteName, wrapper] of Object.entries(wrappers)) {
    const env = {
      ...process.env,
      META_ACCESS_TOKEN: `sentinel-${suiteName}`,
      DATABASE_URL: `postgres://sentinel-${suiteName}`,
    };
    const run = () => spawnSync(process.execPath, [wrapper, '--list', '--json'], {
      cwd: new URL('../../', import.meta.url),
      env,
      encoding: 'utf8',
    });
    const first = run();
    const second = run();
    assert.equal(first.status, 0, `${suiteName}: ${first.stderr}`);
    assert.equal(second.status, 0, `${suiteName}: ${second.stderr}`);
    assert.equal(first.stdout, second.stdout, suiteName);
    assert.doesNotMatch(first.stdout, /sentinel-/);
    const manifest = JSON.parse(first.stdout);
    assert.deepEqual(manifest, getPhase31StaticAuditManifest(suiteName));
  }
});

test('9.1 live/provider/runtime work remains explicitly outside static wrappers', () => {
  assert.deepEqual(PHASE31_EXCLUDED_LIVE_SCOPES, [
    'LIVE_META_PROVIDER',
    'LIVE_POSTGRESQL',
    'LIVE_REDIS_BULLMQ',
    'FULL_MAIN_APP_BUILD',
    'PRODUCTION_OBSERVATION_WINDOW',
  ]);
  const roadmap = source('docs/roadmaps/phase31-layers-3-to-9-implementation-roadmap.md');
  assert.match(roadmap, /9\.7 Live Meta provider evidence/);
  assert.match(roadmap, /9\.8 Final runtime and release gate/);
});

test('9.1 execution contract is forward-compatible and Prisma remains unchanged', () => {
  const execution = json('.ai/phase31-execution-manifest.json');
  assert.match(execution.current_item, /^9\.[1-8]$/);
  const item = execution.layers['9'].items.find((entry) => entry.id === '9.1');
  assert.equal(item.schema_change_expected, false);
  assert.deepEqual(item.command_contract, {
    test: 'test:meta-v6-phase31-layer9.1',
    audit: 'qa:meta-platform-phase31-layer9.1',
    gate: 'qa:phase31-meta-layer9.1',
  });
  const digest = crypto.createHash('sha256').update(fs.readFileSync(new URL('prisma/schema.prisma', root))).digest('hex');
  assert.equal(digest, 'd3a99c494c73d16ca9b162e008301dc42f93c666102dd853a1a4c9d2acbb31ce');
});
