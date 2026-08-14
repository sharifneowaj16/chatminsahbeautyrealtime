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
  'lib/meta-platform/models/canonical.ts',
  'lib/meta-platform/models/normalization.ts',
  'lib/meta-platform/context/asset-context.ts',
  'lib/meta-platform/references/types.ts',
  'lib/meta-platform/references/repository.ts',
  'lib/meta-platform/references/backfill.ts',
  'lib/meta-platform/references/prisma-repository.ts',
  'prisma/migrations/20260721233500_add_meta_external_reference/migration.sql',
  'prisma/migrations/20260721233500_add_meta_external_reference/recovery.sql',
  'docs/architecture/meta/ADR-021-canonical-context-and-external-references.md',
  'docs/release/meta-platform/phase-21-evidence.md',
  'docs/release/meta-platform/phase-21-migration-and-backfill-runbook.md',
  'tests/meta-v6/phase21-canonical-context-references.test.ts',
];
for (const file of expectedFiles) check(`${file} exists`, exists(file));

const schema = read('prisma/schema.prisma');
const migration = read('prisma/migrations/20260721233500_add_meta_external_reference/migration.sql');
const recovery = read('prisma/migrations/20260721233500_add_meta_external_reference/recovery.sql');
check('schema defines MetaPlatformEnvironment', /enum MetaPlatformEnvironment[\s\S]*DEVELOPMENT[\s\S]*STAGING[\s\S]*PRODUCTION/.test(schema));
check('schema defines governed Meta asset types', /enum MetaAssetType[\s\S]*AD_ACCOUNT[\s\S]*INSTAGRAM_ACCOUNT[\s\S]*LEAD_FORM/.test(schema));
check('schema defines MetaExternalReference model', /model MetaExternalReference\s*\{/.test(schema));
check('schema has local identity uniqueness', /@@unique\(\[environment, connectionKey, assetType, assetId, objectType, localId\]/.test(schema));
check('schema has provider identity uniqueness', /@@unique\(\[environment, connectionKey, assetType, assetId, objectType, providerId\]/.test(schema));
check('migration creates the reference table', /CREATE TABLE "MetaExternalReference"/.test(migration));
check('migration creates local uniqueness index', /CREATE UNIQUE INDEX "MetaExternalReference_local_scope_key"/.test(migration));
check('migration creates provider uniqueness index', /CREATE UNIQUE INDEX "MetaExternalReference_provider_scope_key"/.test(migration));
check('migration performs no unsafe inferred backfill', !/\bINSERT\s+INTO\s+"MetaExternalReference"/i.test(migration));
check('migration documents environment provenance blocker', /no automatic backfill/i.test(migration));
check('recovery drops table before enum types', recovery.indexOf('DROP TABLE') < recovery.indexOf('DROP TYPE'));
check('recovery warns against destructive use after consumers', /forward-fix migration/i.test(recovery));

const canonical = read('lib/meta-platform/models/canonical.ts');
const normalization = read('lib/meta-platform/models/normalization.ts');
const context = read('lib/meta-platform/context/asset-context.ts');
const repository = read('lib/meta-platform/references/repository.ts');
const prismaRepository = read('lib/meta-platform/references/prisma-repository.ts');
const server = read('lib/meta-platform/server.ts');
check('canonical model is provider neutral and immutable', /provider: 'META'/.test(canonical) && /Object\.freeze/.test(canonical));
check('normalizer uses explicit field mapping', /MetaProviderResourceMapping/.test(normalization) && /selectAttributes/.test(normalization));
check('normalizer never returns provider next URL', !/nextUrl|paging\.next\s*:/.test(normalization));
check('asset context has an explicit production environment', /META_PLATFORM_ENVIRONMENTS[\s\S]*PRODUCTION/.test(context));
check('asset context enforces environment mismatch', /META_ASSET_ENVIRONMENT_MISMATCH/.test(context));
check('in-memory repository enforces local conflict', /META_REFERENCE_LOCAL_CONFLICT/.test(repository));
check('in-memory repository enforces provider conflict', /META_REFERENCE_PROVIDER_CONFLICT/.test(repository));
check('Prisma repository is server-only', /^import 'server-only';/m.test(prismaRepository));
check('Prisma repository uses parameter placeholders', /\$1::"MetaPlatformEnvironment"/.test(prismaRepository) && /\$12::jsonb/.test(prismaRepository));
check('Prisma repository does not import provider SDK or Graph transport', !/facebook-nodejs-business-sdk|graph\.facebook\.com/.test(prismaRepository));
check('server entry loads Prisma repository lazily', /await import\('\.\/references\/prisma-repository'\)/.test(server));

const migrationManifest = JSON.parse(read('config/meta-v6-migration-manifest.json'));
const migrationRow = migrationManifest.migrations.find((row) => row.migration === '20260721233500_add_meta_external_reference');
const migrationHash = createHash('sha256').update(migration).digest('hex');
check('migration manifest includes Phase 21 migration', Boolean(migrationRow));
check('migration manifest hash matches Phase 21 SQL', migrationRow?.sha256 === migrationHash);
check('migration manifest records Phase 21', migrationRow?.phase === 21);
check('migration manifest records non-destructive forward migration', migrationRow?.destructive === false);
check('migration manifest requires disposable PostgreSQL drill', /disposable PostgreSQL/i.test(migrationRow?.verification ?? ''));

const sourceManifest = JSON.parse(read('config/meta-capability-manifest.json'));
const phase21Paths = sourceManifest.inventory.filter((entry) =>
  entry.path.startsWith('lib/meta-platform/models/')
  || entry.path.startsWith('lib/meta-platform/context/')
  || entry.path.startsWith('lib/meta-platform/references/')
  || entry.path.startsWith('prisma/migrations/20260721233500_add_meta_external_reference/'));
check('all Phase 21 source paths are frozen in inventory', phase21Paths.length === 9, `count=${phase21Paths.length}`);
check('Phase 21 paths map to meta-data-model', phase21Paths.every((entry) => entry.primaryCapabilityId === 'meta-data-model' && entry.targetPhase === 21));

const pkg = JSON.parse(read('package.json'));
check('Phase 21 focused test script exists', pkg.scripts?.['test:meta-v6-phase21'] === 'node --import tsx --test tests/meta-v6/phase21-canonical-context-references.test.ts');
check('Phase 21 audit script exists', pkg.scripts?.['qa:meta-platform-phase21'] === 'node scripts/meta-platform-phase21-audit.mjs');
check('Phase 21 aggregate gate includes test audit migration and inventory', /test:meta-v6-phase21/.test(pkg.scripts?.['qa:meta-v6-phase21'] ?? '')
  && /qa:meta-platform-phase21/.test(pkg.scripts?.['qa:meta-v6-phase21'] ?? '')
  && /qa:meta-v6-migrations/.test(pkg.scripts?.['qa:meta-v6-phase21'] ?? '')
  && /qa:meta-platform-inventory/.test(pkg.scripts?.['qa:meta-v6-phase21'] ?? ''));
check('predeploy runs Phase 21 after Phase 20', (pkg.scripts?.['qa:predeploy'] ?? '').indexOf('qa:meta-v6-phase21') > (pkg.scripts?.['qa:predeploy'] ?? '').indexOf('qa:meta-v6-phase20'));

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.label}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nPhase 21 canonical model/context/reference audit: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
