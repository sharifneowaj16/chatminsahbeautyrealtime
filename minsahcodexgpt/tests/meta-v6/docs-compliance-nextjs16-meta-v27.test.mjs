import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), 'utf8');
const exists = (relPath) => fs.existsSync(path.join(root, relPath));

function readDirTs(relDir) {
  const fullDir = path.join(root, relDir);
  if (!fs.existsSync(fullDir)) return '';
  return fs
    .readdirSync(fullDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => fs.readFileSync(path.join(fullDir, entry.name), 'utf8'))
    .join('\n');
}

function parseSemver(raw) {
  const match = String(raw || '').match(/(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, `Invalid semver string: ${raw}`);
  return match.slice(1).map(Number);
}

function isSemverAtLeast(actual, minimum) {
  const a = parseSemver(actual);
  const m = parseSemver(minimum);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > m[i]) return true;
    if (a[i] < m[i]) return false;
  }
  return true;
}

// ============================================================================
// PART 1: Next.js 16.4.6 Official Docs, Breaking Changes & Build Safety
// ============================================================================

test('Next.js 16.4.6+ security release, ESLint CLI contract, and npm overrides', () => {
  const pkg = JSON.parse(read('package.json'));
  const nextVersion = pkg.dependencies?.next;
  const eslintNextVersion = pkg.devDependencies?.['eslint-config-next'];

  assert.ok(nextVersion, 'next must be declared in dependencies');
  assert.equal(isSemverAtLeast(nextVersion, '16.4.6'), true, `Expected next >= 16.4.6, got ${nextVersion}`);

  if (eslintNextVersion) {
    assert.equal(
      isSemverAtLeast(eslintNextVersion, '16.4.6'),
      true,
      `Expected eslint-config-next >= 16.4.6, got ${eslintNextVersion}`
    );
  }

  // Next.js 16 removed `next lint`
  assert.doesNotMatch(
    String(pkg.scripts?.lint || ''),
    /\bnext\s+lint\b/,
    'Next.js 16 removed `next lint`; use ESLint CLI directly'
  );

  // Next.js 16 defaults to Turbopack; custom webpack config requires --webpack on build
  const nextCfg = read('next.config.ts');
  if (/webpack\s*:\s*\(/.test(nextCfg)) {
    assert.match(
      String(pkg.scripts?.build || ''),
      /--webpack/,
      'next.config.ts defines a custom webpack function; package.json build script must pass --webpack'
    );
  }

  for (const dep of ['decode-uri-component', 'fast-xml-parser', 'follow-redirects']) {
    assert.ok(pkg.overrides?.[dep], `Expected security override for ${dep} in package.json`);
  }
});

test('next.config.ts conforms to Next.js 16 standalone, image, header, and external package docs', () => {
  const cfg = read('next.config.ts');

  assert.match(cfg, /output:\s*["']standalone["']/);
  assert.match(cfg, /outputFileTracingRoot\s*:/);
  assert.match(cfg, /serverExternalPackages\s*:\s*\[[^\]]*["']bullmq["'][^\]]*\]/);
  assert.match(cfg, /serverExternalPackages\s*:\s*\[[^\]]*["']ioredis["'][^\]]*\]/);
  assert.doesNotMatch(cfg, /\bexperimental_ppr\b/, 'experimental_ppr was removed in Next.js 16');

  // Next.js 16 image defaults: qualities defaults to [75] unless explicitly listed
  assert.match(cfg, /qualities\s*:\s*\[/);
  assert.match(cfg, /minimumCacheTTL\s*:/);
  assert.match(cfg, /image\/avif/);
  assert.match(cfg, /image\/webp/);

  // Security headers
  assert.match(cfg, /Strict-Transport-Security/);
  assert.match(cfg, /X-Content-Type-Options/);
  assert.match(cfg, /Cache-Control.*no-store/);
});

test('Next.js 16 proxy convention and build-time Redis/lockfile isolation', () => {
  assert.equal(
    exists('proxy.ts') || exists('src/proxy.ts'),
    true,
    'Expected Next.js 16 proxy.ts boundary file'
  );

  const parentLock = path.resolve(root, '..', 'package-lock.json');
  const parentPkg = path.resolve(root, '..', 'package.json');
  assert.equal(
    fs.existsSync(parentLock) && !fs.existsSync(parentPkg),
    false,
    `Orphan parent package-lock.json detected at ${parentLock}`
  );

  const metaCapiQueue = read('lib/queue/metaCapiQueue.ts');
  assert.match(metaCapiQueue, /new Proxy\(/, 'BullMQ queues in metaCapiQueue.ts must be lazy Proxy instances');
  assert.doesNotMatch(
    metaCapiQueue,
    /export const ga4EventsQueue\s*=\s*globalQueues\.ga4EventsQueue\s*\?\?\s*new Queue/,
    'ga4EventsQueue must not open an eager Redis connection during next build'
  );

  const jobsConn = read('lib/jobs/connection.ts');
  assert.match(jobsConn, /lazyConnect:\s*true/);
});

// ============================================================================
// PART 2: Meta Graph API v27.0 & Business SDK 26.0.3 Official Docs Compliance
// ============================================================================

test('Meta version policy and Business SDK match latest Graph API v27.0 and SDK 26.0.3', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(
    pkg.dependencies?.['facebook-nodejs-business-sdk'],
    '26.0.3',
    'Expected exact facebook-nodejs-business-sdk 26.0.3'
  );

  const policy = JSON.parse(read('config/meta-api-version-policy.json'));
  const policyStr = JSON.stringify(policy);
  assert.match(policyStr, /v27\.0/, 'meta-api-version-policy.json must target Graph API v27.0');
  assert.match(policyStr, /26\.0\.3/, 'meta-api-version-policy.json must reference SDK 26.0.3');

  const runtimeFiles = [
    'lib/meta-business/config.ts',
    'lib/facebook/inboxSync.ts',
    'lib/facebook/profile.ts',
    'realtime-service/src/config.ts',
  ].filter(exists);

  for (const file of runtimeFiles) {
    assert.doesNotMatch(
      read(file),
      /['"`]v24\.0['"`]/,
      `Hardcoded legacy Graph API v24.0 string remains in ${file}`
    );
  }
});

test('Meta Graph/Marketing API v27.0 breaking changes: lookalike_spec, items_batch, and legacy params', () => {
  // Marketing API v27.0 removed direct `country` from lookalike_spec
  const audiencesService = read('lib/meta-platform/domains/audiences/service.ts');
  assert.doesNotMatch(
    audiencesService,
    /lookalike_spec\s*[:=]\s*\{[^}]*\bcountry\s*:/,
    'v27.0 removed direct country from lookalike_spec; use location_spec'
  );

  // Graph API v27.0 deprecated Catalog Batch API in favor of Catalog Items Batch API (createItemsBatch)
  const catalogAdapter = read('lib/meta-platform/transports/business-sdk/adapters/catalog.ts');
  assert.match(catalogAdapter, /createItemsBatch/, 'Catalog adapter must use createItemsBatch (items_batch)');

  // Graph API v27.0 removed legacy query features: multi-ID (?ids=), date_format, JSONP callback
  const graphHttp = readDirTs('lib/meta-platform/transports/graph-http');
  assert.doesNotMatch(graphHttp, /[?&]ids=/, 'Graph API v27.0 forbids legacy multi-ID ?ids= requests');
  assert.doesNotMatch(graphHttp, /[?&]date_format=/, 'Graph API v27.0 forbids legacy date_format query param');
  assert.doesNotMatch(graphHttp, /[?&]callback=/, 'Graph API v27.0 forbids legacy JSONP callback query param');
});

test('Meta SDK, Graph HTTP, Webhook, and Media transports enforce v27.0 security docs', () => {
  const sdkRuntime = read('lib/meta-platform/transports/business-sdk/runtime.ts');
  assert.match(sdkRuntime, /facebook-nodejs-business-sdk/);
  assert.match(sdkRuntime, /ProductCatalog/);
  assert.match(sdkRuntime, /AdAccount/);

  const graphHttp = readDirTs('lib/meta-platform/transports/graph-http');
  assert.match(graphHttp, /graph\.facebook\.com/);
  assert.match(graphHttp, /Authorization/i);
  assert.match(graphHttp, /appsecret_proof/);
  assert.match(graphHttp, /cursors/);

  const webhookSig = read('lib/meta-platform/transports/webhook/signature.ts');
  assert.match(webhookSig, /sha256=/);
  assert.match(webhookSig, /timingSafeEqual/);

  const webhookParser = read('lib/meta-platform/transports/webhook/parser.ts');
  assert.match(webhookParser, /META_WEBHOOK_PAYLOAD_TOO_LARGE/);
  assert.match(webhookParser, /sha256/);

  const mediaTransport = readDirTs('lib/meta-platform/transports/media');
  assert.match(mediaTransport, /https:/i);
});

test('Meta governance manifests are valid and populated', () => {
  const capManifest = JSON.parse(read('config/meta-capability-manifest.json'));
  const migManifest = JSON.parse(read('config/meta-v6-migration-manifest.json'));

  assert.equal(capManifest.schemaVersion, 1);
  assert.ok(Array.isArray(capManifest.inventory) && capManifest.inventory.length > 0);
  assert.equal(migManifest.schemaVersion, 1);
  assert.ok(Array.isArray(migManifest.migrations) && migManifest.migrations.length > 0);
});
