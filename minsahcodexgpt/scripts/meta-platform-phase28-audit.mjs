#!/usr/bin/env node
import fs from 'node:fs';

const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });
const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const includesAll = (text, values) => values.every((value) => text.includes(value));

const required = [
  'lib/meta-platform/migration/phase28-cutover.ts',
  'lib/meta-platform/migration/phase28-connection-facade.ts',
  'lib/meta-platform/migration/phase28-capi-facade.ts',
  'lib/meta-platform/domains/connection/config.ts',
  'lib/meta-platform/domains/connection/types.ts',
  'lib/meta-platform/domains/connection/service.ts',
  'lib/meta-platform/domains/connection/index.ts',
  'lib/meta-platform/domains/capi/config.ts',
  'lib/meta-platform/domains/capi/types.ts',
  'lib/meta-platform/domains/capi/service.ts',
  'lib/meta-platform/domains/capi/index.ts',
  'tests/meta-v6/phase28-connection-capi-migration.test.ts',
  'docs/architecture/meta/ADR-028-connection-health-capi-cutover.md',
  'docs/runbooks/meta-phase28-connection-capi-cutover.md',
  'phase-28-evidence.md',
  'PHASE28_CONNECTION_CAPI_MIGRATION.md',
];
for (const file of required) check(`${file} exists`, exists(file));

const cutover = read('lib/meta-platform/migration/phase28-cutover.ts');
check('connection cutover has legacy, shadow and platform modes', includesAll(cutover, ["'LEGACY' | 'SHADOW' | 'PLATFORM'", 'META_PLATFORM_CONNECTION_SHADOW', 'META_PLATFORM_CONNECTION_READS']));
check('connection legacy disable is an independent explicit flag', cutover.includes('META_PLATFORM_CONNECTION_LEGACY_DISABLED'));
check('CAPI cutover has test, deterministic canary, platform and legacy modes', includesAll(cutover, ["'PLATFORM_TEST'", "'PLATFORM_CANARY'", "'PLATFORM'", "'LEGACY'"]));
check('CAPI canary is stable from event identity', includesAll(cutover, ['stableMetaCanaryBucket', 'input.eventId.trim()', 'selectedByCanary']));
check('CAPI has no shadow-write mode', !cutover.includes('CAPI_SHADOW') && !/MetaCapiCutoverMode[^\n]*SHADOW/.test(cutover));
check('CAPI legacy disable is separate from enabling platform writes', includesAll(cutover, ['META_PLATFORM_CAPI_LEGACY_DISABLED', 'META_PLATFORM_CAPI_WRITES']));

const connectionService = read('lib/meta-platform/domains/connection/service.ts');
const connectionConfig = read('lib/meta-platform/domains/connection/config.ts');
check('connection domain resolves exact business and app credential roles', includesAll(connectionService, ["role: 'BUSINESS_SYSTEM_USER'", "role: 'APP'"]));
check('connection token debug uses Graph transport boundary', includesAll(connectionService, ['debugMetaGraphAccessToken', 'MetaGraphHttpClient']));
check('connection domain evaluates central version policy', includesAll(connectionService, ['evaluateMetaVersionPolicy', 'META_BUSINESS_SDK_VERSION']));
check('connection domain normalizes permissions and configured assets', includesAll(connectionService, ['inspectPermissions', 'inspectAssets', 'META_CONNECTION_ASSET_KEYS']));
check('connection domain never reads raw token environment variables', !/META_\w*ACCESS_TOKEN|FACEBOOK_CONVERSION_API_TOKEN/.test(connectionService + connectionConfig));
check('connection config supports current public pixel aliases', includesAll(connectionConfig, ['NEXT_PUBLIC_META_PIXEL_ID', 'NEXT_PUBLIC_FACEBOOK_PIXEL_ID', 'NEXT_PUBLIC_FB_PIXEL_ID']));
check('connection health result records platform transport and credential role', includesAll(connectionService, ["transport: 'GRAPH_HTTP'", "credentialRole: 'BUSINESS_SYSTEM_USER'"]));

const connectionFacade = read('lib/meta-platform/migration/phase28-connection-facade.ts');
const readiness = read('lib/meta/connection/readiness.ts');
const connectionRoute = read('app/api/admin/meta/connection/route.ts');
const tokenWorker = read('workers/meta-token-health.worker.ts');
check('legacy connection implementation is isolated behind compatibility facade', readiness.includes('checkMetaConnectionReadinessThroughPlatform') && exists('lib/meta/connection/legacy-readiness.ts'));
check('shadow connection compares normalized results without selecting platform result', includesAll(connectionFacade, ['Promise.all([runLegacy(), runPlatform()])', 'selected = {', '...legacyResult', 'META_CONNECTION_SHADOW_MISMATCH']));
check('platform mode selects unified connection health', /cutover\.mode === 'PLATFORM'[\s\S]*selected = await runPlatform/.test(connectionFacade));
check('selected connection readiness is persisted once after cutover selection', connectionFacade.indexOf('if (input.persist !== false)') > connectionFacade.indexOf("if (cutover.mode === 'PLATFORM'"));
check('admin connection endpoint exposes safe cutover status', connectionRoute.includes('getMetaConnectionCutoverStatus') && connectionRoute.includes('cutover'));
check('token health worker provides a correlation identity', tokenWorker.includes('correlationId'));

const capiConfig = read('lib/meta-platform/domains/capi/config.ts');
const capiService = read('lib/meta-platform/domains/capi/service.ts');
const capiAdapter = read('lib/meta-platform/transports/business-sdk/adapters/capi.ts');
const capiFacade = read('lib/meta-platform/migration/phase28-capi-facade.ts');
check('CAPI config contains only non-secret settings', !/ACCESS_TOKEN|APP_SECRET|readAccessToken|readAppSecret/.test(capiConfig));
check('CAPI config supports current pixel aliases, dataset override and bounded timeout', includesAll(capiConfig, ['NEXT_PUBLIC_FACEBOOK_PIXEL_ID', 'META_DATASET_ID', 'datasetId', 'positiveInt', 'META_CAPI_TIMEOUT_MS']));
check('CAPI service resolves clients through role-isolated factory', includesAll(capiService, ['MetaBusinessSdkClientFactory', "credentialRole: 'CAPI'", "capability: 'capi-delivery'"]));
check('CAPI service validates stable event IDs before provider execution', includesAll(capiService, ['META_CAPI_EVENT_ID_REQUIRED', 'validateRequest(input.payload)']));
check('CAPI SDK access-token read exists only in the transport adapter path', capiAdapter.includes('client.credential.readAccessToken()') && !capiService.includes('readAccessToken'));
check('CAPI adapter applies configured Graph version to SDK HTTP URL', includesAll(capiAdapter, ['versionedUrl', 'input.client.graphApiVersion']));
check('CAPI adapter supports test event code and partner agent', includesAll(capiAdapter, ['setTestEventCode', 'setPartnerAgent']));
check('CAPI adapter stores only bounded safe provider headers', includesAll(capiAdapter, ['safeHeaders', 'x-fb-trace-id', 'retry-after']));
check('CAPI delivery result includes transport, Graph, SDK and credential versions', includesAll(capiAdapter, ['credentialVersion', 'graphApiVersion', 'sdkVersion', "transport: 'META_PLATFORM_BUSINESS_SDK'"]));
check('CAPI facade lazy-loads unified SDK service', capiFacade.includes("await import('../domains/capi/service')") && !capiFacade.includes("import { MetaPlatformCapiService }"));
check('CAPI facade chooses exactly one selected transport', capiFacade.includes('if (cutover.selected)') && !/Promise\.all\([^)]*platformService[^)]*sendMetaCapiWithBusinessSdk/.test(capiFacade));
check('legacy-disabled unselected CAPI fails closed', includesAll(capiFacade, ['META_CAPI_LEGACY_DISABLED_CUTOVER_REQUIRED', 'retryable: false']));
check('legacy credential access is lazy and isolated to rollback branch', capiFacade.indexOf("import('@/lib/tracking/meta-business-sdk')") > capiFacade.indexOf('if (cutover.legacyDisabled)'));

const publicRoute = read('app/api/facebook-capi/route.ts');
const core = read('lib/tracking/meta-capi-core-event.ts');
const purchase = read('lib/tracking/meta-capi-cod-purchase.ts');
const sender = read('lib/meta/capi/sender.ts');
const offline = read('lib/meta-business/offline.ts');
const eventAdmin = read('app/api/admin/meta/events/route.ts');
check('public CAPI route persists durable outbox work', includesAll(publicRoute, ['persistMetaCoreEventOutbox', 'requestMetaOutboxDispatch']));
check('public CAPI route does not require or read an access token', !/getMetaCapiAccessToken|validateAccessToken|META_CAPI_ACCESS_TOKEN/.test(publicRoute));
check('public CAPI route does not import SDK runtime wrapper', !publicRoute.includes("@/lib/tracking/meta-business-sdk"));
check('public CAPI route reports configured central SDK version and worker runtime verification', includesAll(publicRoute, ['META_BUSINESS_SDK_VERSION', 'verified-by-worker-runtime-contract']));
check('core CAPI delivery uses Phase 28 facade', core.includes('sendMetaCapiWithPhase28Cutover') && !core.includes('getMetaCapiAccessToken'));
check('COD/online Purchase delivery uses Phase 28 facade', purchase.includes('sendMetaCapiWithPhase28Cutover') && !purchase.includes('getMetaCapiAccessToken'));
check('offline/dataset conversions use the Phase 28 facade', includesAll(offline, ['getMetaPlatformCapiConfig', 'sendMetaCapiWithPhase28Cutover', 'pixelId: config.datasetId']));
check('offline/dataset conversions have no direct legacy token or SDK sender', !includesAll(offline, ['sendMetaCapiWithBusinessSdk']) && !offline.includes('requireMetaConfig') && !/ACCESS_TOKEN|readAccessToken/.test(offline));
check('core CAPI preserves stable outbox event ID as correlation ID', core.includes('correlationId: jobData.eventId'));
check('sender persists transport and cutover evidence', includesAll(sender, ['cutover_mode', 'transport', 'graph_api_version', 'sdk_version', 'credential_version']));
check('admin event monitor exposes cutover status', eventAdmin.includes('getMetaCapiCutoverStatus') && eventAdmin.includes('cutover'));

const permissionMatrix = JSON.parse(read('config/meta-platform-permission-matrix.json'));
check('connection health permission preflight permits live permission inspection', Array.isArray(permissionMatrix.capabilities?.['connection-health']?.permissionsByRole?.BUSINESS_SYSTEM_USER) && permissionMatrix.capabilities['connection-health'].permissionsByRole.BUSINESS_SYSTEM_USER.length === 0);
check('CAPI capability remains bound to CAPI role', permissionMatrix.capabilities?.['capi-delivery']?.allowedRoles?.includes('CAPI'));

const env = read('.env.example');
for (const key of [
  'META_PLATFORM_CONNECTION_SHADOW', 'META_PLATFORM_CONNECTION_READS', 'META_PLATFORM_CONNECTION_LEGACY_DISABLED',
  'META_PLATFORM_CAPI_TEST_EVENTS', 'META_PLATFORM_CAPI_CANARY_PERCENT', 'META_PLATFORM_CAPI_WRITES', 'META_PLATFORM_CAPI_LEGACY_DISABLED',
]) check(`environment sample documents ${key}`, env.includes(`${key}=`));
check('environment sample documents safe rollout order', includesAll(env, ['SHADOW first', 'test-event -> deterministic canary -> full platform']));

const tests = read('tests/meta-v6/phase28-connection-capi-migration.test.ts');
for (const phrase of [
  'connection cutover progresses legacy -> shadow -> platform',
  'CAPI canary selection is stable per event ID',
  'connection health resolves exact credential roles',
  'unified CAPI adapter uses worker credential',
]) check(`focused tests cover ${phrase}`, tests.includes(phrase));
check('focused CAPI test proves access token is absent from result serialization', tests.includes('JSON.stringify(result).includes(accessToken), false'));
check('focused connection test proves business/app secrets are absent from health serialization', includesAll(tests, ['JSON.stringify(result).includes(businessToken), false', 'JSON.stringify(result).includes(appSecret), false']));

const packageJson = read('package.json');
const ci = read('.github/workflows/meta-v6-release.yml');
check('package exposes Phase 28 test and audit gates', includesAll(packageJson, ['test:meta-v6-phase28', 'qa:meta-platform-phase28', 'qa:meta-v6-phase28']));
check('package exposes cumulative Phase 19-28 gate', packageJson.includes('qa:meta-platform-phases19-28'));
check('predeploy includes Phase 28', /qa:predeploy[^\n]*qa:meta-v6-phase28/.test(packageJson));
const cumulativeMetaPlatformGate = [...ci.matchAll(/qa:meta-platform-phases19-(\d+)/g)]
  .some((match) => Number(match[1]) >= 28);
check('CI enforces cumulative Phase 19-28+ gate', cumulativeMetaPlatformGate);

const phases = read('phases.md');
const evidence = read('phase-28-evidence.md');
check('Phase 28 is source code complete but not falsely production complete', /Phase 28[\s\S]{0,700}\*\*Status:\*\* `CODE_COMPLETE`/.test(phases) && /\*\*Status:\*\* `CODE_COMPLETE`/.test(evidence));
check('Phase 28 documents runtime and legacy-disable blockers', includesAll(phases + evidence, ['runtime evidence', 'legacy', 'test-event', 'canary']));
check('Phase 28 declares no schema change and therefore no fabricated migration', evidence.includes('No Prisma schema change was made'));
check('ADR preserves PostgreSQL outbox as authoritative producer', read('docs/architecture/meta/ADR-028-connection-health-capi-cutover.md').includes('Preserve the existing transactional CAPI outbox'));
check('runbook contains rollback and evidence procedures', includesAll(read('docs/runbooks/meta-phase28-connection-capi-cutover.md'), ['Emergency rollback', 'Evidence to capture', 'Do not replay unknown provider outcomes blindly']));

const publicIndex = read('lib/meta-platform/index.ts');
const serverIndex = read('lib/meta-platform/server.ts');
check('public MetaPlatform barrel exports only Phase 28 types', publicIndex.includes("from './domains/capi/types'") && !publicIndex.includes("from './domains/capi/service'"));
check('server barrel exposes lazy Phase 28 runtime loaders', includesAll(serverIndex, ['loadMetaConnectionHealthRuntime', 'loadMetaCapiRuntime', 'loadMetaPhase28CutoverRuntime']));

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nPhase 28 connection/CAPI migration audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
