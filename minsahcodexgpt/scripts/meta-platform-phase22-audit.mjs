#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (label, ok, detail = '') => checks.push({ label, ok: Boolean(ok), detail });

const expectedFiles = [
  'config/meta-platform-permission-matrix.json',
  'lib/meta-platform/credentials/roles.ts',
  'lib/meta-platform/credentials/types.ts',
  'lib/meta-platform/credentials/material.ts',
  'lib/meta-platform/credentials/provider.ts',
  'lib/meta-platform/credentials/environment-provider.ts',
  'lib/meta-platform/credentials/appsecret-proof.ts',
  'lib/meta-platform/credentials/client-registry.ts',
  'lib/meta-platform/credentials/prisma-metadata-repository.ts',
  'lib/meta-platform/capabilities/permission-matrix.ts',
  'lib/meta-platform/capabilities/governance.ts',
  'lib/meta-platform/versioning/registry.ts',
  'prisma/migrations/20260722193000_add_meta_credential_metadata/migration.sql',
  'prisma/migrations/20260722193000_add_meta_credential_metadata/recovery.sql',
  'docs/architecture/meta/ADR-022-credential-permission-version-governance.md',
  'docs/release/meta-platform/phase-22-evidence.md',
  'docs/release/meta-platform/phase-22-credential-rotation-runbook.md',
  'tests/meta-v6/phase22-credential-version-governance.test.ts',
];
for (const file of expectedFiles) check(`${file} exists`, exists(file));

const capabilityManifest = JSON.parse(read('config/meta-capability-manifest.json'));
const permissionMatrix = JSON.parse(read('config/meta-platform-permission-matrix.json'));
const versionPolicy = JSON.parse(read('config/meta-api-version-policy.json'));
const capabilityIds = capabilityManifest.capabilities.map((item) => item.id).sort();
const matrixIds = Object.keys(permissionMatrix.capabilities).sort();
check('permission matrix schema is supported', permissionMatrix.schemaVersion === 1);
check('permission matrix covers all capabilities exactly', JSON.stringify(matrixIds) === JSON.stringify(capabilityIds), `matrix=${matrixIds.length}, capabilities=${capabilityIds.length}`);
check('every provider-bound matrix row has explicit roles', Object.values(permissionMatrix.capabilities).every((row) => row.credentialMode === 'NONE' ? row.allowedRoles.length === 0 : row.allowedRoles.length > 0));
check('every allowed role has an explicit permission list', Object.values(permissionMatrix.capabilities).every((row) => row.allowedRoles.every((role) => Array.isArray(row.permissionsByRole[role]))));

const envProvider = read('lib/meta-platform/credentials/environment-provider.ts');
const provider = read('lib/meta-platform/credentials/provider.ts');
const material = read('lib/meta-platform/credentials/material.ts');
const governance = read('lib/meta-platform/capabilities/governance.ts');
const appsecret = read('lib/meta-platform/credentials/appsecret-proof.ts');
const clientRegistry = read('lib/meta-platform/credentials/client-registry.ts');
check('role bindings use dedicated token variables', /META_BUSINESS_ACCESS_TOKEN/.test(envProvider) && /META_CAPI_ACCESS_TOKEN/.test(envProvider) && /META_PAGE_ACCESS_TOKEN/.test(envProvider) && /META_INSTAGRAM_ACCESS_TOKEN/.test(envProvider));
check('role bindings capture rotation and expiry metadata', /META_CAPI_CREDENTIAL_ROTATED_AT/.test(envProvider) && /META_CAPI_CREDENTIAL_EXPIRES_AT/.test(envProvider) && /META_CAPI_DATA_ACCESS_EXPIRES_AT/.test(envProvider));
const envExample = read('.env.example');
check('environment documents role expiry metadata', ['META_APP_CREDENTIAL_EXPIRES_AT=', 'META_BUSINESS_CREDENTIAL_EXPIRES_AT=', 'META_CAPI_CREDENTIAL_EXPIRES_AT=', 'META_PAGE_CREDENTIAL_EXPIRES_AT=', 'META_INSTAGRAM_CREDENTIAL_EXPIRES_AT=', 'META_BUSINESS_DATA_ACCESS_EXPIRES_AT=', 'META_CAPI_DATA_ACCESS_EXPIRES_AT=', 'META_PAGE_DATA_ACCESS_EXPIRES_AT=', 'META_INSTAGRAM_DATA_ACCESS_EXPIRES_AT='].every((token) => envExample.includes(token)));
check('environment provider contains no cross-role nullish token fallback', !/META_BUSINESS_ACCESS_TOKEN[^\n]*\?\?[^\n]*(META_CAPI|META_PAGE|META_INSTAGRAM)/.test(envProvider));
check('credential lookup key includes connection and role', /connectionKey.*role|role.*connectionKey/.test(provider));
check('credential material keeps secrets in private fields', /#accessToken/.test(material) && /#appSecret/.test(material));
check('credential JSON returns metadata only', /toJSON\(\): MetaCredentialMetadata[\s\S]*return this\.metadata/.test(material));
check('governance checks version before resolving credentials', governance.indexOf('evaluateMetaFeatureCompatibility') < governance.indexOf('credentialProvider.resolve'));
check('governance rejects missing permissions', /META_REQUIRED_PERMISSION_MISSING/.test(governance));
check('appsecret proof uses HMAC SHA-256', /createHmac\('sha256'/.test(appsecret));
check('client registry invalidates on credential version change', /credentialVersion/.test(clientRegistry) && /dispose/.test(clientRegistry));

check('version policy schema is centralized at version 2', versionPolicy.schemaVersion === 2 && versionPolicy.defaultVersion && versionPolicy.businessSdkVersion);
check('version policy declares feature compatibility', Object.keys(versionPolicy.features ?? {}).length >= 10);
check('pending target version is not feature-approved', !Object.values(versionPolicy.features).some((feature) => feature.approvedGraphVersions.includes(versionPolicy.targetVersion)));
const trackingSchema = read('lib/tracking/meta-schema.ts');
const sdkVersion = read('lib/meta/connection/sdk-version.ts');
check('tracking schema delegates Graph version to central registry', /meta-platform\/versioning\/registry/.test(trackingSchema) && !/DEFAULT_META_GRAPH_API_VERSION = 'v\d/.test(trackingSchema));
check('connection SDK version delegates to central registry', /META_BUSINESS_SDK_VERSION/.test(sdkVersion) && !/'24\.0\.1'/.test(sdkVersion));

const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260722193000_add_meta_credential_metadata/migration.sql');
const recovery = read('prisma/migrations/20260722193000_add_meta_credential_metadata/recovery.sql');
check('schema defines credential roles', /enum MetaCredentialRole[\s\S]*BUSINESS_SYSTEM_USER[\s\S]*INSTAGRAM/.test(schema));
check('schema defines credential metadata model', /model MetaCredentialMetadata\s*\{/.test(schema));
const credentialModel = schema.match(/model MetaCredentialMetadata\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
check('credential metadata stores reference and app association, not raw secret', /secretRef\s+String/.test(credentialModel) && /appId\s+String\?/.test(credentialModel) && !/accessToken|appSecret|secretValue/.test(credentialModel));
check('migration performs no credential backfill', !/\bINSERT\s+INTO\s+"MetaCredentialMetadata"/i.test(migration));
check('repository persists safe app association metadata', /metadata\.appId/.test(read('lib/meta-platform/credentials/prisma-metadata-repository.ts')));
check('migration has role uniqueness', /MetaCredentialMetadata_connection_role_key/.test(migration));
check('recovery drops table before enum', recovery.indexOf('DROP TABLE') < recovery.indexOf('DROP TYPE'));

const migrationManifest = JSON.parse(read('config/meta-v6-migration-manifest.json'));
const migrationRow = migrationManifest.migrations.find((row) => row.migration === '20260722193000_add_meta_credential_metadata');
const migrationHash = createHash('sha256').update(migration).digest('hex');
check('migration manifest includes Phase 22 migration', Boolean(migrationRow));
check('migration manifest hash matches Phase 22 SQL', migrationRow?.sha256 === migrationHash);
check('migration manifest records Phase 22 and non-destructive change', migrationRow?.phase === 22 && migrationRow?.destructive === false);

const publicIndex = read('lib/meta-platform/index.ts');
const serverEntry = read('lib/meta-platform/server.ts');
check('public entry exposes only safe credential metadata and policy contracts', /MetaCredentialMetadata/.test(publicIndex) && !/EnvironmentMetaCredentialProvider|InMemoryMetaCredentialProvider|MetaCredentialMaterial/.test(publicIndex));
check('server entry exposes credential providers and lazy metadata repository', /createEnvironmentMetaCredentialProvider/.test(serverEntry) && /await import\('\.\/credentials\/prisma-metadata-repository'\)/.test(serverEntry));

const sourceManifest = JSON.parse(read('config/meta-capability-manifest.json'));
const phase22Paths = sourceManifest.inventory.filter((entry) => entry.targetPhase === 22 && entry.primaryCapabilityId === 'credentials-versioning');
check('Phase 22 governed paths are frozen in inventory', phase22Paths.length >= 14, `count=${phase22Paths.length}`);
check('Phase 22 governed paths use credential/config transports', phase22Paths.every((entry) => entry.tokenRoles.includes('APP') && entry.transports.includes('INTERNAL_CONFIG') && ['ACTIVE', 'SUPPORT_ACTIVE', 'HISTORICAL_ACTIVE_SCHEMA'].includes(entry.lifecycle)));

const pkg = JSON.parse(read('package.json'));
check('Phase 22 focused test script exists', pkg.scripts?.['test:meta-v6-phase22'] === 'node --conditions=react-server --import tsx --test tests/meta-v6/phase22-credential-version-governance.test.ts');
check('Phase 22 audit script exists', pkg.scripts?.['qa:meta-platform-phase22'] === 'node scripts/meta-platform-phase22-audit.mjs');
check('Phase 22 aggregate gate includes tests audit migrations and inventory', /test:meta-v6-phase22/.test(pkg.scripts?.['qa:meta-v6-phase22'] ?? '') && /qa:meta-platform-phase22/.test(pkg.scripts?.['qa:meta-v6-phase22'] ?? '') && /qa:meta-v6-migrations/.test(pkg.scripts?.['qa:meta-v6-phase22'] ?? '') && /qa:meta-platform-inventory/.test(pkg.scripts?.['qa:meta-v6-phase22'] ?? ''));
check('predeploy runs Phase 22 after Phase 21', (pkg.scripts?.['qa:predeploy'] ?? '').indexOf('qa:meta-v6-phase22') > (pkg.scripts?.['qa:predeploy'] ?? '').indexOf('qa:meta-v6-phase21'));

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nPhase 22 credential/permission/version audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
