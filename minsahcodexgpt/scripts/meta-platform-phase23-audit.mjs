#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });

const transportRoot = 'lib/meta-platform/transports/business-sdk';
const expectedFiles = [
  `${transportRoot}/index.ts`,
  `${transportRoot}/types.ts`,
  `${transportRoot}/runtime.ts`,
  `${transportRoot}/client-factory.ts`,
  `${transportRoot}/executor.ts`,
  `${transportRoot}/normalization.ts`,
  `${transportRoot}/entity.ts`,
  `${transportRoot}/compatibility.ts`,
  `${transportRoot}/adapters/index.ts`,
  `${transportRoot}/adapters/base.ts`,
  `${transportRoot}/adapters/business.ts`,
  `${transportRoot}/adapters/ads.ts`,
  `${transportRoot}/adapters/insights.ts`,
  `${transportRoot}/adapters/audiences.ts`,
  `${transportRoot}/adapters/catalog.ts`,
  `${transportRoot}/adapters/pixels.ts`,
  `${transportRoot}/adapters/capi.ts`,
  `${transportRoot}/adapters/pages.ts`,
  `${transportRoot}/adapters/leads.ts`,
  'tests/meta-v6/phase23-business-sdk-transport.test.ts',
  'docs/architecture/meta/ADR-023-unified-business-sdk-transport.md',
  'docs/release/meta-platform/phase-23-evidence.md',
];
for (const file of expectedFiles) check(`${file} exists`, exists(file));

const packageJson = JSON.parse(read('package.json'));
check('Business SDK dependency is exact', packageJson.dependencies?.['facebook-nodejs-business-sdk'] === '24.0.1');
check('Phase 23 focused test script exists', packageJson.scripts?.['test:meta-v6-phase23'] === 'node --conditions=react-server --import tsx --test tests/meta-v6/phase23-business-sdk-transport.test.ts');
check('Phase 23 static audit script exists', packageJson.scripts?.['qa:meta-platform-phase23'] === 'node scripts/meta-platform-phase23-audit.mjs');
check('Phase 23 aggregate gate includes tests audit and inventory', /test:meta-v6-phase23/.test(packageJson.scripts?.['qa:meta-v6-phase23'] ?? '') && /qa:meta-platform-phase23/.test(packageJson.scripts?.['qa:meta-v6-phase23'] ?? '') && /qa:meta-platform-inventory/.test(packageJson.scripts?.['qa:meta-v6-phase23'] ?? ''));
check('predeploy runs Phase 23 after Phase 22', (packageJson.scripts?.['qa:predeploy'] ?? '').indexOf('qa:meta-v6-phase23') > (packageJson.scripts?.['qa:predeploy'] ?? '').indexOf('qa:meta-v6-phase22'));

const runtime = read(`${transportRoot}/runtime.ts`);
check('runtime uses namespace import only', runtime.includes("import * as businessSdkNamespace from 'facebook-nodejs-business-sdk'") && !runtime.includes("import businessSdkNamespace from 'facebook-nodejs-business-sdk'"));
check('runtime validates required exports', /META_BUSINESS_SDK_REQUIRED_EXPORTS/.test(runtime) && /META_BUSINESS_SDK_RUNTIME_EXPORT_MISSING/.test(runtime));
check('runtime validates SDK major/minor line', /runtimeLine\[1\].*packageLine\[1\]/s.test(runtime) && /runtimeLine\[2\].*packageLine\[2\]/s.test(runtime));
check('runtime records package/runtime patch drift', /patchMetadataDrift/.test(runtime) && /packageVersion/.test(runtime) && /runtimeVersion/.test(runtime));
check('official runtime patch metadata expectation is explicit', /META_BUSINESS_SDK_EXPECTED_RUNTIME_VERSION = '24\.0\.0'/.test(runtime));
check('runtime initialization is lazy and memoized', /let validatedRuntime.*null/.test(runtime) && /if \(!validatedRuntime\)/.test(runtime));

const clientFactory = read(`${transportRoot}/client-factory.ts`);
check('client factory is explicitly server-only', /^import 'server-only';/m.test(clientFactory));
check('client factory runs capability authorization before client creation', clientFactory.indexOf('authorizeMetaCapability') < clientFactory.indexOf('new runtime.FacebookAdsApi'));
check('client factory rejects requested Graph version drift from SDK runtime', /META_BUSINESS_SDK_GRAPH_VERSION_MISMATCH/.test(clientFactory) && /runtimeContract\.graphVersion !== graphApiVersion/.test(clientFactory));
check('client factory uses rotation-aware registry', /MetaCredentialClientRegistry/.test(clientFactory) && /getOrCreate/.test(clientFactory));
check('rotated SDK clients are actively disabled', /disposeMetaBusinessSdkClient/.test(clientFactory) && /META_BUSINESS_SDK_CLIENT_DISPOSED/.test(clientFactory) && /dispose: disposeMetaBusinessSdkClient/.test(clientFactory));
check('client factory disables SDK crash reporter on construction', /new runtime\.FacebookAdsApi\([\s\S]*false,?[\s\S]*\)/.test(clientFactory));
check('debug mode is enabled explicitly after construction', /api\.setDebug\(true\)/.test(clientFactory));
check('appsecret proof decorates all SDK api.call requests', /appsecret_proof: proof/.test(clientFactory) && /buildMetaAppSecretProof/.test(clientFactory));
check('appsecret proof is not logged or serialized', !/console\.|JSON\.stringify\(proof\)/.test(clientFactory));
check('missing APP credential remains optional for client creation', /META_CREDENTIAL_NOT_CONFIGURED/.test(clientFactory));

const executor = read(`${transportRoot}/executor.ts`);
check('executor owns timeout and cancellation boundary', /Promise\.race/.test(executor) && /AbortSignal/.test(read(`${transportRoot}/types.ts`)) && /META_BUSINESS_SDK_TIMEOUT/.test(executor));
check('executor emits only structured safe logs', /MetaBusinessSdkLogger/.test(executor) && !/accessToken|appSecret/.test(executor));
check('executor normalizes both success and failure', /normalizeMetaBusinessSdkValue/.test(executor) && /normalizeMetaBusinessSdkError/.test(executor));

const normalization = read(`${transportRoot}/normalization.ts`);
check('response normalizer exports SDK data without provider objects', /exportAllData/.test(normalization) && /exportData/.test(normalization));
check('cursor normalizer preserves paging and summary', /paging/.test(normalization) && /summary/.test(normalization));
check('error normalizer maps rate limit timeout auth and dependency categories', ['RATE_LIMIT', 'TIMEOUT', 'AUTHENTICATION', 'AUTHORIZATION', 'DEPENDENCY_UNAVAILABLE'].every((token) => normalization.includes(`'${token}'`)));
check('error normalizer retains only safe provider diagnostics', /providerCode/.test(normalization) && /providerSubcode/.test(normalization) && /traceId/.test(normalization));

const adapterIndex = read(`${transportRoot}/adapters/index.ts`);
for (const id of ['business', 'ads', 'insights', 'audiences', 'catalog', 'pixels', 'capi', 'pages', 'leads']) {
  check(`focused ${id} adapter is registered`, adapterIndex.includes(`metaBusinessSdk${id[0].toUpperCase()}${id.slice(1)}Adapter`) || (id === 'capi' && adapterIndex.includes('metaBusinessSdkCapiAdapter')));
}
check('adapter registry is frozen', /Object\.freeze\(\[/.test(adapterIndex));
check('entity adapter rejects undeclared entity types', /META_BUSINESS_SDK_ADAPTER_ENTITY_NOT_ALLOWED/.test(read(`${transportRoot}/adapters/base.ts`)));
check('CAPI adapter derives token from credential material', /credential\.readAccessToken\(\)/.test(read(`${transportRoot}/adapters/capi.ts`)));

const legacySdk = read('lib/meta-business/sdk.ts');
const trackingSdk = read('lib/tracking/meta-business-sdk.ts');
check('legacy platform wrapper delegates to compatibility transport', /meta-platform\/transports\/business-sdk\/compatibility/.test(legacySdk));
check('tracking CAPI wrapper delegates runtime loading to transport', /meta-platform\/transports\/business-sdk\/runtime/.test(trackingSdk));
check('legacy wrappers contain no direct SDK package import', !/from ['"]facebook-nodejs-business-sdk['"]/.test(legacySdk) && !/from ['"]facebook-nodejs-business-sdk['"]/.test(trackingSdk));
check('legacy wrapper is marked deprecated for migration', /@deprecated/.test(legacySdk));
check('compatibility facade keeps runtime initialization lazy', /new Proxy/.test(read(`${transportRoot}/compatibility.ts`)) && !/metaSdk\s*=\s*getMetaBusinessSdkRuntime\(\)/.test(read(`${transportRoot}/compatibility.ts`)));

const sourceRoots = ['app', 'components', 'contexts', 'hooks', 'lib', 'workers', 'realtime-service/src'];
const directImports = [];
function walk(relative) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return;
  const stat = fs.statSync(absolute);
  if (stat.isDirectory()) {
    for (const item of fs.readdirSync(absolute)) walk(path.join(relative, item));
    return;
  }
  if (!/\.(?:ts|tsx|js|mjs|cjs)$/.test(relative)) return;
  const content = fs.readFileSync(absolute, 'utf8');
  if (/\b(?:from\s+|require\s*\(|import\s*\()\s*['"]facebook-nodejs-business-sdk['"]/.test(content)) {
    directImports.push(relative.split(path.sep).join('/'));
  }
}
for (const sourceRoot of sourceRoots) walk(sourceRoot);
check('SDK package import exists only inside unified transport directory', directImports.length === 1 && directImports[0] === `${transportRoot}/runtime.ts`, directImports.join(', '));

const serverEntry = read('lib/meta-platform/server.ts');
check('server entry exposes factory through lazy dynamic import', /createMetaBusinessSdkClientFactory/.test(serverEntry) && /await import\('\.\/transports\/business-sdk\/client-factory'\)/.test(serverEntry));
check('public MetaPlatform entry does not import SDK transport', !/business-sdk/.test(read('lib/meta-platform/index.ts')));
check('local declaration has no synthetic default export', !/export default/.test(read('types/facebook-nodejs-business-sdk.d.ts')));

const manifest = JSON.parse(read('config/meta-capability-manifest.json'));
const phase23Paths = manifest.inventory.filter((entry) => entry.targetPhase === 23 && entry.primaryCapabilityId === 'sdk-transport');
check('Phase 23 governed paths are frozen in inventory', phase23Paths.length >= 20, `count=${phase23Paths.length}`);
check('new transport paths use SDK transport ownership', phase23Paths.filter((entry) => entry.path.startsWith(`${transportRoot}/`)).every((entry) => entry.transports.includes('BUSINESS_SDK') && entry.lifecycle === 'ACTIVE'));

const phases = read('phases.md');
check('Phase 23 status is recorded as runtime-QA ready', /## Phase 23[\s\S]*\*\*Status:\*\* `READY_FOR_RUNTIME_QA`/.test(phases));
check('Phase 24 successor section remains governed', /## Phase 24[\s\S]*?(?=## Phase 25)/.test(phases));

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nPhase 23 unified Business SDK transport audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
