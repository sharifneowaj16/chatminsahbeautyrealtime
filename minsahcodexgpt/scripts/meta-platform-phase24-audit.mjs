#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });

const graphRoot = 'lib/meta-platform/transports/graph-http';
const webhookRoot = 'lib/meta-platform/transports/webhook';
const mediaRoot = 'lib/meta-platform/transports/media';
const expected = [
  `${graphRoot}/index.ts`, `${graphRoot}/types.ts`, `${graphRoot}/url-policy.ts`, `${graphRoot}/normalization.ts`,
  `${graphRoot}/client.ts`, `${graphRoot}/pagination.ts`, `${graphRoot}/batch.ts`, `${graphRoot}/compatibility.ts`, `${graphRoot}/token-debug.ts`,
  `${webhookRoot}/index.ts`, `${webhookRoot}/types.ts`, `${webhookRoot}/signature.ts`, `${webhookRoot}/challenge.ts`, `${webhookRoot}/parser.ts`, `${webhookRoot}/receipt.ts`,
  `${mediaRoot}/index.ts`, `${mediaRoot}/types.ts`, `${mediaRoot}/url-policy.ts`, `${mediaRoot}/mime.ts`, `${mediaRoot}/downloader.ts`, `${mediaRoot}/storage.ts`,
  'tests/meta-v6/phase24-graph-webhook-media-transport.test.ts',
  'docs/architecture/meta/ADR-024-graph-webhook-media-transports.md',
  'docs/release/meta-platform/phase-24-evidence.md',
];
for (const file of expected) check(`${file} exists`, exists(file));

const pkg = JSON.parse(read('package.json'));
check('Phase 24 focused test script exists', pkg.scripts?.['test:meta-v6-phase24'] === 'node --conditions=react-server --import tsx --test tests/meta-v6/phase24-graph-webhook-media-transport.test.ts');
check('Phase 24 static audit script exists', pkg.scripts?.['qa:meta-platform-phase24'] === 'node scripts/meta-platform-phase24-audit.mjs');
check('Phase 24 aggregate gate includes tests audit and inventory', /test:meta-v6-phase24/.test(pkg.scripts?.['qa:meta-v6-phase24'] ?? '') && /qa:meta-platform-phase24/.test(pkg.scripts?.['qa:meta-v6-phase24'] ?? '') && /qa:meta-platform-inventory/.test(pkg.scripts?.['qa:meta-v6-phase24'] ?? ''));
check('predeploy runs Phase 24 after Phase 23', (pkg.scripts?.['qa:predeploy'] ?? '').indexOf('qa:meta-v6-phase24') > (pkg.scripts?.['qa:predeploy'] ?? '').indexOf('qa:meta-v6-phase23'));

const graphClient = read(`${graphRoot}/client.ts`);
const graphPolicy = read(`${graphRoot}/url-policy.ts`);
const graphTypes = read(`${graphRoot}/types.ts`);
const graphNormalization = read(`${graphRoot}/normalization.ts`);
check('Graph client is server-only', /^import 'server-only';/m.test(graphClient));
check('Graph client authorizes capability before reading token', graphClient.indexOf('authorizeMetaCapability') < graphClient.indexOf('readAccessToken'));
check('Graph host is fixed to graph.facebook.com', /graph\.facebook\.com/.test(graphPolicy) && /META_GRAPH_BASE_HOST_NOT_ALLOWED/.test(graphPolicy));
check('absolute decorated Graph paths are rejected', /META_GRAPH_PATH_ABSOLUTE_OR_DECORATED/.test(graphPolicy));
check('Graph access tokens use Authorization header not query', /Authorization: `Bearer \$\{credential\.readAccessToken\(\)\}`/.test(graphClient) && !/query\.access_token/.test(graphClient));
check('Graph appsecret proof is centralized', /buildMetaAppSecretProof/.test(graphClient) && /query\.appsecret_proof/.test(graphClient));
check('Graph redirects fail closed', /redirect: 'error'/.test(graphClient));
check('Graph timeout and bounded response controls exist', /META_GRAPH_TIMEOUT/.test(graphClient) && /META_GRAPH_RESPONSE_TOO_LARGE/.test(graphClient));
check('Graph logs exclude raw secrets by type contract', /MetaGraphHttpLogEntry/.test(graphTypes) && !/accessToken|appSecret/.test(graphTypes));
check('Graph errors normalize auth permission rate-limit timeout and dependency categories', ['AUTHENTICATION', 'AUTHORIZATION', 'RATE_LIMIT', 'DEPENDENCY_UNAVAILABLE'].every((value) => graphNormalization.includes(`'${value}'`)));
check('Graph error text redacts provider secrets', /access_token/.test(graphNormalization) && /appsecret_proof/.test(graphNormalization) && /\[REDACTED\]/.test(graphNormalization));

const pagination = read(`${graphRoot}/pagination.ts`);
check('pagination uses only cursors.after', /paging\?\.cursors\?\.after/.test(pagination));
check('pagination does not follow provider next URLs', !/paging\?\.next|new URL\(.*next/.test(pagination));
check('pagination enforces page and item bounds', /maxPages/.test(pagination) && /maxItems/.test(pagination) && /META_GRAPH_PAGINATION_CURSOR_LOOP/.test(pagination));

const batch = read(`${graphRoot}/batch.ts`);
check('batch enforces provider operation bound', /length < 1 \|\| input\.operations\.length > 50/.test(batch));
check('batch rejects absolute relative URLs', /assertMetaGraphRelativeBatchPath/.test(batch));
check('batch returns item-level success and error', /MetaGraphBatchItemResult/.test(batch) && /META_GRAPH_BATCH_ITEM_FAILED/.test(batch));
check('batch dependency order is validated', /META_GRAPH_BATCH_DEPENDENCY_INVALID/.test(batch));

const signature = read(`${webhookRoot}/signature.ts`);
const challenge = read(`${webhookRoot}/challenge.ts`);
const parser = read(`${webhookRoot}/parser.ts`);
const receipt = read(`${webhookRoot}/receipt.ts`);
check('webhook accepts only sha256 HMAC format', /\^sha256=\[a-f0-9\]\{64\}/.test(signature) && !/sha1/.test(signature));
check('webhook HMAC and verify token comparisons are timing-safe', /timingSafeEqual/.test(signature) && /timingSafeEqual/.test(challenge));
check('webhook raw body is size-bounded before JSON parse', parser.indexOf('META_WEBHOOK_PAYLOAD_TOO_LARGE') < parser.indexOf('JSON.parse'));
check('webhook notifications get stable event keys and ordering keys', /stableStringify/.test(parser) && /eventKey/.test(parser) && /orderingKey/.test(parser));
check('webhook notifications are deterministically ordered', /notifications\.sort/.test(parser));
check('webhook receipts are put-if-absent before consumers', /putIfAbsent/.test(receipt) && /created: stored\.created !== false/.test(receipt));
check('legacy lead signature helper delegates to central transport', /meta-platform\/transports\/webhook/.test(read('lib/meta/leads/signature.ts')) && !/createHmac/.test(read('lib/meta/leads/signature.ts')));
check('legacy Instagram verifier delegates to central transport', /meta-platform\/transports\/webhook/.test(read('lib/meta/instagram/verify.ts')) && !/createHmac/.test(read('lib/meta/instagram/verify.ts')));

const mediaPolicy = read(`${mediaRoot}/url-policy.ts`);
const mediaDownloader = read(`${mediaRoot}/downloader.ts`);
const mediaMime = read(`${mediaRoot}/mime.ts`);
const mediaStorage = read(`${mediaRoot}/storage.ts`);
check('media permits HTTPS only and blocks URL credentials/IP literals', /META_MEDIA_URL_PROTOCOL_BLOCKED/.test(mediaPolicy) && /META_MEDIA_URL_CREDENTIALS_BLOCKED/.test(mediaPolicy) && /META_MEDIA_IP_LITERAL_BLOCKED/.test(mediaPolicy));
check('media host allowlist is Meta-specific', ['facebook.com', 'fbcdn.net', 'fbsbx.com', 'instagram.com', 'cdninstagram.com'].every((host) => mediaPolicy.includes(`'${host}'`)));
check('media DNS blocks private reserved and documentation ranges', /10\.0\.0\.0/.test(mediaPolicy) && /169\.254\.0\.0/.test(mediaPolicy) && /192\.168\.0\.0/.test(mediaPolicy) && /2001:db8/.test(mediaPolicy));
check('media validates every redirect and caps redirect count', /redirect: 'manual'/.test(mediaDownloader) && /parseAndValidateMetaMediaUrl\(new URL\(location/.test(mediaDownloader) && /META_MEDIA_REDIRECT_LIMIT/.test(mediaDownloader));
check('media strips Authorization on cross-origin redirects', /currentUrl\.origin === sourceUrl\.origin/.test(mediaDownloader));
check('media enforces declared and streamed size limits', /content-length/.test(mediaDownloader) && /total > maxBytes/.test(mediaDownloader));
check('media performs magic-byte MIME detection', /image\/jpeg/.test(mediaMime) && /image\/png/.test(mediaMime) && /video\/mp4/.test(mediaMime));
check('media rejects declared/detected MIME mismatch', /META_MEDIA_MIME_MISMATCH/.test(mediaDownloader));
check('private media storage requires malware CLEAN result', /scan\.result !== 'CLEAN'/.test(mediaStorage) && /META_MEDIA_MALWARE_DETECTED/.test(mediaStorage) && /META_MEDIA_SCAN_FAILED/.test(mediaStorage));
check('storage key traversal is rejected', /storageKey\.includes\('\.\.'\)/.test(mediaStorage));
check('Instagram attachment downloader delegates to media transport', /downloadMetaMedia/.test(read('lib/meta/instagram/attachments.ts')) && !/await \(input\.fetchImpl \?\? fetch\)/.test(read('lib/meta/instagram/attachments.ts')));

const directGraph = [];
for (const scanRoot of ['app', 'lib', 'workers']) {
  const walk = (relative) => {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    const stat = fs.statSync(absolute);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute)) walk(path.join(relative, name));
      return;
    }
    if (!/\.(?:ts|tsx|js|mjs|cjs)$/.test(relative)) return;
    const normalized = relative.split(path.sep).join('/');
    if (normalized.startsWith(`${graphRoot}/`)) return;
    if (/https:\/\/graph\.(?:facebook|instagram)\.com/i.test(fs.readFileSync(absolute, 'utf8'))) directGraph.push(normalized);
  };
  walk(scanRoot);
}
check('main application direct Graph URLs exist only in Graph transport', directGraph.length === 0, directGraph.join(', '));
check('realtime service remains explicitly deferred to Phase 31', /realtime service paths are mapped to Phase 31/.test(read('scripts/meta-platform-source-inventory.mjs')));

const serverEntry = read('lib/meta-platform/server.ts');
check('server entry exposes Graph transport lazily', /createMetaGraphHttpClient/.test(serverEntry) && /import\('\.\/transports\/graph-http\/client'\)/.test(serverEntry));
check('client-safe public entry does not expose server transports', !/graph-http|transports\/webhook|transports\/media/.test(read('lib/meta-platform/index.ts')));

const manifest = JSON.parse(read('config/meta-capability-manifest.json'));
const phase24 = manifest.inventory.filter((entry) => entry.targetPhase === 24 && ['graph-media-boundary', 'meta-webhooks'].includes(entry.primaryCapabilityId));
check('Phase 24 governed paths are frozen', phase24.length >= 21, `count=${phase24.length}`);
check('Graph and media files have graph-media ownership', phase24.filter((entry) => entry.path.startsWith(`${graphRoot}/`) || entry.path.startsWith(`${mediaRoot}/`)).every((entry) => entry.primaryCapabilityId === 'graph-media-boundary' && entry.lifecycle === 'ACTIVE'));
check('webhook files have webhook ownership', phase24.filter((entry) => entry.path.startsWith(`${webhookRoot}/`)).every((entry) => entry.primaryCapabilityId === 'meta-webhooks' && entry.lifecycle === 'ACTIVE'));

const phases = read('phases.md');
check('Phase 24 status is runtime-QA ready', /## Phase 24[\s\S]*\*\*Status:\*\* `READY_FOR_RUNTIME_QA`/.test(phases));
check('Phase 25 successor section remains governed', /## Phase 25[\s\S]*?(?=## Phase 26)/.test(phases));

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nPhase 24 Graph/webhook/media transport audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
