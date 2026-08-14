import assert from 'node:assert/strict';
import test from 'node:test';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function loadModules() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase31-provider-identities-'));
  const contextDir = path.join(root, 'context');
  const repositoryDir = path.join(root, 'repositories');
  fs.mkdirSync(contextDir, { recursive: true });
  fs.mkdirSync(repositoryDir, { recursive: true });
  fs.copyFileSync('lib/meta-platform/context/asset-context.ts', path.join(contextDir, 'asset-context.ts'));
  const files = [
    'provider-identities.ts',
    'provider-identity-relationships.ts',
    'provider-identity-backfill.ts',
    'page-identities.ts',
    'instagram-identities.ts',
    'lead-form-identities.ts',
  ];
  for (const file of files) {
    let source = fs.readFileSync(`lib/meta-platform/repositories/${file}`, 'utf8');
    source = source
      .replaceAll("from '../context/asset-context'", "from '../context/asset-context.ts'")
      .replaceAll("from '../references/backfill'", "from '../references/backfill.ts'")
      .replaceAll("from './provider-identities'", "from './provider-identities.ts'")
      .replaceAll("from './provider-identity-relationships'", "from './provider-identity-relationships.ts'");
    fs.writeFileSync(path.join(repositoryDir, file), source);
  }
  const referencesDir = path.join(root, 'references');
  fs.mkdirSync(referencesDir, { recursive: true });
  fs.copyFileSync('lib/meta-platform/references/backfill.ts', path.join(referencesDir, 'backfill.ts'));
  let backfill = fs.readFileSync(path.join(referencesDir, 'backfill.ts'), 'utf8');
  backfill = backfill.replace("from '../context/asset-context'", "from '../context/asset-context.ts'").replace("from './types'", "from './types.ts'");
  fs.writeFileSync(path.join(referencesDir, 'backfill.ts'), backfill);
  fs.copyFileSync('lib/meta-platform/references/types.ts', path.join(referencesDir, 'types.ts'));
  let types = fs.readFileSync(path.join(referencesDir, 'types.ts'), 'utf8');
  types = types.replace("from '../models/canonical'", "from '../models/canonical.ts'").replace("from '../context/asset-context'", "from '../context/asset-context.ts'");
  fs.writeFileSync(path.join(referencesDir, 'types.ts'), types);
  const modelsDir = path.join(root, 'models');
  fs.mkdirSync(modelsDir, { recursive: true });
  fs.copyFileSync('lib/meta-platform/models/canonical.ts', path.join(modelsDir, 'canonical.ts'));
  const load = async (file) => import(`${pathToFileURL(path.join(repositoryDir, file)).href}?run=${Date.now()}`);
  const context = await import(`${pathToFileURL(path.join(contextDir, 'asset-context.ts')).href}?run=${Date.now()}`);
  return {
    ...context,
    ...(await load('provider-identities.ts')),
    ...(await load('provider-identity-relationships.ts')),
    ...(await load('provider-identity-backfill.ts')),
    ...(await load('page-identities.ts')),
    ...(await load('instagram-identities.ts')),
    ...(await load('lead-form-identities.ts')),
  };
}

const {
  createMetaAssetContext,
  InMemoryMetaProviderIdentityRepository,
  MetaProviderIdentityError,
  assertMetaProviderIdentityReceiptCompatibility,
  isMetaProviderIdentityWritable,
  sanitizeMetaProviderIdentityMetadata,
  sanitizeMetaProviderPermissionMetadata,
  InMemoryMetaProviderIdentityRelationshipRepository,
  buildMetaProviderIdentityBackfillPlan,
  resolveMetaPageIdentity,
  resolveMetaInstagramIdentity,
  verifyMetaPageInstagramBinding,
  resolveMetaLeadFormIdentity,
  verifyMetaPageLeadFormBinding,
} = await loadModules();

function idFactory(prefix) {
  let index = 0;
  return () => `${prefix}-${++index}`;
}

function context(environment = 'PRODUCTION', connectionKey = 'primary', overrides = {}) {
  const values = {
    APP: 'app-1',
    BUSINESS: 'business-1',
    AD_ACCOUNT: 'act-1',
    PAGE: 'page-1',
    INSTAGRAM_ACCOUNT: 'ig-1',
    LEAD_FORM: 'form-1',
    ...overrides,
  };
  return createMetaAssetContext({
    environment,
    connectionKey,
    assets: Object.entries(values).map(([type, id]) => ({ type, id })),
  });
}

async function register(repository, ctx, assetType, providerId, extras = {}) {
  return repository.register({ context: ctx, assetType, providerId, ...extras });
}

test('identity metadata and permission projections are allowlisted and secret-free', () => {
  const metadata = sanitizeMetaProviderIdentityMetadata({
    displayName: 'Minsah Page',
    username: 'minsahbeauty',
    access_token: 'EA_SECRET',
    email: 'owner@example.com',
    rawPayload: { unsafe: true },
    unknown: 'drop-me',
  });
  assert.deepEqual(metadata, { displayName: 'Minsah Page', username: 'minsahbeauty' });
  const permissions = sanitizeMetaProviderPermissionMetadata({
    required: ['pages_messaging', 'PAGES_MESSAGING', 'invalid permission'],
    granted: ['pages_manage_metadata'],
    missing: ['pages_messaging'],
    accessToken: ['EA_SECRET'],
  });
  assert.deepEqual(permissions, {
    required: ['pages_messaging'],
    granted: ['pages_manage_metadata'],
    missing: ['pages_messaging'],
  });
  assert.equal(JSON.stringify({ metadata, permissions }).includes('EA_SECRET'), false);
  assert.equal(JSON.stringify({ metadata, permissions }).includes('owner@example.com'), false);
});

test('same provider identity in the same scope is idempotent', async () => {
  const repository = new InMemoryMetaProviderIdentityRepository({
    now: () => new Date('2026-07-25T01:00:00.000Z'),
    createId: idFactory('identity'),
  });
  const ctx = context();
  const first = await register(repository, ctx, 'PAGE', 'page-1', { source: 'BACKFILL' });
  const second = await register(repository, ctx, 'PAGE', 'page-1', { source: 'RECONCILIATION', seenAt: '2026-07-25T01:05:00.000Z' });
  assert.equal(first.id, second.id);
  assert.equal(second.source, 'RECONCILIATION');
  assert.equal(second.lastSeenAt, '2026-07-25T01:05:00.000Z');
  assert.equal(repository.snapshot().length, 1);
});

test('same provider ID in different environment and connection scopes does not collide', async () => {
  const repository = new InMemoryMetaProviderIdentityRepository({ createId: idFactory('identity') });
  const production = await register(repository, context('PRODUCTION', 'primary'), 'PAGE', 'page-1');
  const staging = await register(repository, context('STAGING', 'primary'), 'PAGE', 'page-1');
  const secondary = await register(repository, context('PRODUCTION', 'secondary'), 'PAGE', 'page-1');
  assert.notEqual(production.id, staging.id);
  assert.notEqual(production.id, secondary.id);
  assert.equal(repository.snapshot().length, 3);
});

test('identity registration rejects provider IDs outside the explicit asset context', async () => {
  const repository = new InMemoryMetaProviderIdentityRepository();
  await assert.rejects(
    register(repository, context(), 'PAGE', 'page-wrong'),
    (error) => error?.code === 'META_PROVIDER_IDENTITY_CONTEXT_MISMATCH',
  );
});

test('valid Page to Instagram and Page to Lead Form relationships are durable and idempotent', async () => {
  const identities = new InMemoryMetaProviderIdentityRepository({ createId: idFactory('identity') });
  const relationships = new InMemoryMetaProviderIdentityRelationshipRepository({
    identityRepository: identities,
    createId: idFactory('relation'),
  });
  const ctx = context();
  const page = await register(identities, ctx, 'PAGE', 'page-1', { identityStatus: 'ACTIVE' });
  const instagram = await register(identities, ctx, 'INSTAGRAM_ACCOUNT', 'ig-1', { identityStatus: 'ACTIVE' });
  const form = await register(identities, ctx, 'LEAD_FORM', 'form-1', { identityStatus: 'ACTIVE' });
  const first = await relationships.link({ relationshipType: 'PAGE_LINKED_INSTAGRAM_ACCOUNT', parentIdentityId: page.id, childIdentityId: instagram.id, status: 'ACTIVE' });
  const second = await relationships.link({ relationshipType: 'PAGE_LINKED_INSTAGRAM_ACCOUNT', parentIdentityId: page.id, childIdentityId: instagram.id, status: 'ACTIVE' });
  const leadRelation = await relationships.link({ relationshipType: 'PAGE_CONTAINS_LEAD_FORM', parentIdentityId: page.id, childIdentityId: form.id, status: 'ACTIVE' });
  assert.equal(first.id, second.id);
  assert.equal(leadRelation.relationshipType, 'PAGE_CONTAINS_LEAD_FORM');
  assert.equal(relationships.snapshot().length, 2);
  assert.equal((await verifyMetaPageInstagramBinding({ relationships, pageIdentityId: page.id, instagramIdentityId: instagram.id })).id, first.id);
  assert.equal((await verifyMetaPageLeadFormBinding({ relationships, pageIdentityId: page.id, leadFormIdentityId: form.id })).id, leadRelation.id);
});

test('cross-environment and cross-connection relationships fail closed', async () => {
  const identities = new InMemoryMetaProviderIdentityRepository({ createId: idFactory('identity') });
  const relationships = new InMemoryMetaProviderIdentityRelationshipRepository({ identityRepository: identities });
  const prodPage = await register(identities, context('PRODUCTION', 'primary'), 'PAGE', 'page-1');
  const stagingIg = await register(identities, context('STAGING', 'primary'), 'INSTAGRAM_ACCOUNT', 'ig-1');
  const secondaryIg = await register(identities, context('PRODUCTION', 'secondary'), 'INSTAGRAM_ACCOUNT', 'ig-1');
  await assert.rejects(
    relationships.link({ relationshipType: 'PAGE_LINKED_INSTAGRAM_ACCOUNT', parentIdentityId: prodPage.id, childIdentityId: stagingIg.id }),
    (error) => error?.code === 'META_PROVIDER_IDENTITY_RELATION_SCOPE_MISMATCH',
  );
  await assert.rejects(
    relationships.link({ relationshipType: 'PAGE_LINKED_INSTAGRAM_ACCOUNT', parentIdentityId: prodPage.id, childIdentityId: secondaryIg.id }),
    (error) => error?.code === 'META_PROVIDER_IDENTITY_RELATION_SCOPE_MISMATCH',
  );
});

test('relationship asset matrix rejects reversed or unrelated pairs', async () => {
  const identities = new InMemoryMetaProviderIdentityRepository({ createId: idFactory('identity') });
  const relationships = new InMemoryMetaProviderIdentityRelationshipRepository({ identityRepository: identities });
  const ctx = context();
  const page = await register(identities, ctx, 'PAGE', 'page-1');
  const instagram = await register(identities, ctx, 'INSTAGRAM_ACCOUNT', 'ig-1');
  await assert.rejects(
    relationships.link({ relationshipType: 'PAGE_LINKED_INSTAGRAM_ACCOUNT', parentIdentityId: instagram.id, childIdentityId: page.id }),
    (error) => error?.code === 'META_PROVIDER_RELATION_ASSET_PAIR_INVALID',
  );
});

test('revoked identities are terminal and cannot be used for relationships or writes', async () => {
  const identities = new InMemoryMetaProviderIdentityRepository({ createId: idFactory('identity') });
  const relationships = new InMemoryMetaProviderIdentityRelationshipRepository({ identityRepository: identities });
  const ctx = context();
  const page = await register(identities, ctx, 'PAGE', 'page-1', { identityStatus: 'ACTIVE', permissionHealth: 'HEALTHY' });
  const instagram = await register(identities, ctx, 'INSTAGRAM_ACCOUNT', 'ig-1', { identityStatus: 'ACTIVE', permissionHealth: 'HEALTHY' });
  assert.equal(isMetaProviderIdentityWritable(page), true);
  const revoked = await identities.revoke({ identityId: instagram.id, reason: 'PROVIDER_REVOKED' });
  assert.equal(isMetaProviderIdentityWritable(revoked), false);
  await assert.rejects(
    identities.updateHealth({ identityId: revoked.id, identityStatus: 'ACTIVE' }),
    (error) => error?.code === 'META_PROVIDER_IDENTITY_STATUS_TRANSITION_INVALID',
  );
  await assert.rejects(
    relationships.link({ relationshipType: 'PAGE_LINKED_INSTAGRAM_ACCOUNT', parentIdentityId: page.id, childIdentityId: revoked.id }),
    (error) => error?.code === 'META_PROVIDER_RELATION_REVOKED_IDENTITY',
  );
});

test('specialized Page, Instagram and Lead Form lookup services enforce status and write health', async () => {
  const identities = new InMemoryMetaProviderIdentityRepository({ createId: idFactory('identity') });
  const ctx = context();
  const page = await register(identities, ctx, 'PAGE', 'page-1', { identityStatus: 'ACTIVE', permissionHealth: 'HEALTHY' });
  const instagram = await register(identities, ctx, 'INSTAGRAM_ACCOUNT', 'ig-1', { identityStatus: 'ACTIVE', permissionHealth: 'MISSING_PERMISSION' });
  const form = await register(identities, ctx, 'LEAD_FORM', 'form-1', { identityStatus: 'UNVERIFIED' });
  assert.equal((await resolveMetaPageIdentity({ repository: identities, environment: 'PRODUCTION', connectionKey: 'primary', pageId: 'page-1', requireWritable: true })).id, page.id);
  assert.equal((await resolveMetaInstagramIdentity({ repository: identities, environment: 'PRODUCTION', connectionKey: 'primary', instagramAccountId: 'ig-1' })).id, instagram.id);
  await assert.rejects(
    resolveMetaInstagramIdentity({ repository: identities, environment: 'PRODUCTION', connectionKey: 'primary', instagramAccountId: 'ig-1', requireWritable: true }),
    (error) => error?.code === 'META_PROVIDER_IDENTITY_NOT_WRITABLE',
  );
  assert.equal((await resolveMetaLeadFormIdentity({ repository: identities, environment: 'PRODUCTION', connectionKey: 'primary', formId: 'form-1' })).id, form.id);
});

test('receipt identity compatibility enforces platform type, scope and revocation', async () => {
  const identities = new InMemoryMetaProviderIdentityRepository({ createId: idFactory('identity') });
  const ctx = context();
  const page = await register(identities, ctx, 'PAGE', 'page-1', { identityStatus: 'ACTIVE' });
  const instagram = await register(identities, ctx, 'INSTAGRAM_ACCOUNT', 'ig-1', { identityStatus: 'ACTIVE' });
  assert.doesNotThrow(() => assertMetaProviderIdentityReceiptCompatibility({ platform: 'FACEBOOK_PAGE', environment: 'PRODUCTION', connectionKey: 'primary', identity: page }));
  assert.doesNotThrow(() => assertMetaProviderIdentityReceiptCompatibility({ platform: 'INSTAGRAM', environment: 'PRODUCTION', connectionKey: 'primary', identity: instagram }));
  assert.throws(
    () => assertMetaProviderIdentityReceiptCompatibility({ platform: 'LEAD_ADS', environment: 'PRODUCTION', connectionKey: 'primary', identity: instagram }),
    (error) => error?.code === 'META_PROVIDER_IDENTITY_RECEIPT_TYPE_MISMATCH',
  );
  assert.throws(
    () => assertMetaProviderIdentityReceiptCompatibility({ platform: 'FACEBOOK_PAGE', environment: 'STAGING', connectionKey: 'primary', identity: page }),
    (error) => error?.code === 'META_PROVIDER_IDENTITY_RECEIPT_SCOPE_MISMATCH',
  );
});

test('explicit connection backfill is deterministic and does not invent absent ownership', () => {
  const plan = buildMetaProviderIdentityBackfillPlan({
    environment: 'PRODUCTION',
    connectionKey: 'primary',
    snapshot: {
      id: 'connection-1',
      name: 'primary',
      appId: 'app-1',
      pageId: 'page-1',
      instagramAccountId: 'ig-1',
      businessId: null,
      adAccountId: null,
    },
  });
  assert.deepEqual(plan.identities.map((row) => row.assetType), ['APP', 'PAGE', 'INSTAGRAM_ACCOUNT']);
  assert.deepEqual(plan.relationships, [{
    relationshipType: 'PAGE_LINKED_INSTAGRAM_ACCOUNT',
    parentAssetType: 'PAGE',
    childAssetType: 'INSTAGRAM_ACCOUNT',
  }]);
  assert.equal(plan.relationships.some((row) => row.relationshipType === 'BUSINESS_OWNS_PAGE'), false);
  assert.throws(
    () => buildMetaProviderIdentityBackfillPlan({ environment: 'PRODUCTION', connectionKey: 'other', snapshot: { id: '1', name: 'primary' } }),
    /META_BACKFILL_CONNECTION_MISMATCH/,
  );
});
