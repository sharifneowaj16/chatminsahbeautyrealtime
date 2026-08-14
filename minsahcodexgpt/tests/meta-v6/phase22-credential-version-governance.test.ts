import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

import {
  DEFAULT_META_GRAPH_API_VERSION,
  META_BUSINESS_SDK_VERSION,
  META_CAPABILITY_IDS,
  getMetaCapabilityPermissionRequirement,
  listMetaCapabilityDefinitions,
} from '../../lib/meta-platform/index';
import {
  EnvironmentMetaCredentialProvider,
  InMemoryMetaCredentialProvider,
  MetaCredentialClientRegistry,
  authorizeMetaCapability,
  buildMetaAppSecretProof,
} from '../../lib/meta-platform/server';

test('permission matrix covers every governed Meta capability', () => {
  const registryIds = listMetaCapabilityDefinitions().map((definition) => definition.id).sort();
  const capabilityIds = [...META_CAPABILITY_IDS].sort();
  assert.deepEqual(registryIds, capabilityIds);
  for (const capability of capabilityIds) {
    const requirement = getMetaCapabilityPermissionRequirement(capability);
    assert.equal(requirement.capability, capability);
    if (requirement.credentialMode === 'NONE') {
      assert.equal(requirement.allowedRoles.length, 0);
    } else {
      assert.ok(requirement.allowedRoles.length > 0);
      for (const role of requirement.allowedRoles) assert.ok(requirement.permissionsByRole[role]);
    }
  }
});

test('environment provider resolves only the requested role and never falls back across tokens', async () => {
  const capiSecret = 'EA_CAPI_ROLE_SECRET_12345678901234567890';
  const provider = new EnvironmentMetaCredentialProvider({
    META_APP_ID: 'app-1',
    META_CAPI_ACCESS_TOKEN: capiSecret,
    META_CAPI_GRANTED_PERMISSIONS: '',
    META_CAPI_CREDENTIAL_ROTATED_AT: '2026-07-22T12:00:00.000Z',
    META_CAPI_CREDENTIAL_EXPIRES_AT: '2026-10-22T12:00:00.000Z',
    META_CAPI_DATA_ACCESS_EXPIRES_AT: '2026-09-22T12:00:00.000Z',
  });

  await assert.rejects(
    provider.resolve({ connectionKey: 'primary', role: 'BUSINESS_SYSTEM_USER' }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'META_CREDENTIAL_NOT_CONFIGURED');
      assert.equal(JSON.stringify(error).includes(capiSecret), false);
      return true;
    },
  );

  const capi = await provider.resolve({ connectionKey: 'primary', role: 'CAPI' });
  assert.equal(capi.readAccessToken(), capiSecret);
  assert.equal(capi.metadata.secretRef, 'env:META_CAPI_ACCESS_TOKEN');
  assert.equal(capi.metadata.appId, 'app-1');
  assert.equal(capi.metadata.rotatedAt, '2026-07-22T12:00:00.000Z');
  assert.equal(capi.metadata.expiresAt, '2026-10-22T12:00:00.000Z');
  assert.equal(capi.metadata.dataAccessExpiresAt, '2026-09-22T12:00:00.000Z');
  assert.equal(JSON.stringify(capi).includes(capiSecret), false);
});

test('missing or wrong credentials fail before a provider request can execute', async () => {
  let providerRequestCalls = 0;
  const emptyProvider = new InMemoryMetaCredentialProvider();
  const missing = await authorizeMetaCapability({
    capability: 'capi-delivery',
    connectionKey: 'primary',
    credentialRole: 'CAPI',
    credentialProvider: emptyProvider,
  });
  if (missing.ok) providerRequestCalls += 1;
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.error.code, 'META_CREDENTIAL_NOT_CONFIGURED');

  const pageProvider = new InMemoryMetaCredentialProvider([{
    connectionKey: 'primary',
    role: 'PAGE',
    secretRef: 'env:META_PAGE_ACCESS_TOKEN',
    accessToken: 'EA_PAGE_ROLE_SECRET_12345678901234567890',
    permissions: ['pages_read_engagement'],
  }]);
  const wrongRole = await authorizeMetaCapability({
    capability: 'ads-marketing',
    connectionKey: 'primary',
    credentialRole: 'PAGE',
    credentialProvider: pageProvider,
  });
  if (wrongRole.ok) providerRequestCalls += 1;
  assert.equal(wrongRole.ok, false);
  if (!wrongRole.ok) assert.equal(wrongRole.error.code, 'META_CREDENTIAL_ROLE_NOT_ALLOWED');
  assert.equal(providerRequestCalls, 0);
});

test('permission preflight fails closed and successful authorization returns redacted credential material', async () => {
  const secret = 'EA_BUSINESS_ROLE_SECRET_12345678901234567890';
  const provider = new InMemoryMetaCredentialProvider([{
    connectionKey: 'primary',
    role: 'BUSINESS_SYSTEM_USER',
    secretRef: 'secret-manager:meta/business',
    accessToken: secret,
    permissions: ['ads_read'],
  }]);

  const denied = await authorizeMetaCapability({
    capability: 'ads-marketing',
    connectionKey: 'primary',
    credentialRole: 'BUSINESS_SYSTEM_USER',
    credentialProvider: provider,
  });
  assert.equal(denied.ok, false);
  if (!denied.ok) {
    assert.equal(denied.error.code, 'META_REQUIRED_PERMISSION_MISSING');
    assert.deepEqual(denied.error.safeDetails?.missingPermissions, ['ads_management', 'business_management']);
  }

  provider.set({
    connectionKey: 'primary',
    role: 'BUSINESS_SYSTEM_USER',
    secretRef: 'secret-manager:meta/business',
    accessToken: secret,
    permissions: ['ads_management', 'ads_read', 'business_management'],
  });
  const allowed = await authorizeMetaCapability({
    capability: 'ads-marketing',
    connectionKey: 'primary',
    credentialRole: 'BUSINESS_SYSTEM_USER',
    credentialProvider: provider,
    graphApiVersion: DEFAULT_META_GRAPH_API_VERSION,
    sdkVersion: META_BUSINESS_SDK_VERSION,
  });
  assert.equal(allowed.ok, true);
  if (!allowed.ok) return;
  assert.equal(allowed.value.credential?.readAccessToken(), secret);
  assert.equal(JSON.stringify(allowed).includes(secret), false);
  assert.equal(allowed.value.featureCompatibility.compatible, true);
});

test('feature compatibility blocks unapproved Graph or SDK versions before credential resolution', async () => {
  let resolveCalls = 0;
  const provider = {
    async resolve() {
      resolveCalls += 1;
      throw new Error('should not resolve');
    },
  };
  const pendingGraph = await authorizeMetaCapability({
    capability: 'catalog-commerce',
    connectionKey: 'primary',
    credentialRole: 'BUSINESS_SYSTEM_USER',
    credentialProvider: provider,
    graphApiVersion: 'v25.0',
    sdkVersion: META_BUSINESS_SDK_VERSION,
  });
  assert.equal(pendingGraph.ok, false);
  if (!pendingGraph.ok) assert.equal(pendingGraph.error.code, 'META_FEATURE_VERSION_INCOMPATIBLE');

  const wrongSdk = await authorizeMetaCapability({
    capability: 'ads-marketing',
    connectionKey: 'primary',
    credentialRole: 'BUSINESS_SYSTEM_USER',
    credentialProvider: provider,
    graphApiVersion: DEFAULT_META_GRAPH_API_VERSION,
    sdkVersion: '23.0.0',
  });
  assert.equal(wrongSdk.ok, false);
  assert.equal(resolveCalls, 0);
});

test('appsecret proof uses the APP secret and exact requested access-token role', async () => {
  const token = 'EA_PAGE_ROLE_SECRET_12345678901234567890';
  const appSecret = 'app-secret-value-1234567890';
  const provider = new InMemoryMetaCredentialProvider([
    {
      connectionKey: 'primary',
      role: 'APP',
      secretRef: 'env:META_APP_SECRET',
      appSecret,
      appId: 'app-1',
    },
    {
      connectionKey: 'primary',
      role: 'PAGE',
      secretRef: 'env:META_PAGE_ACCESS_TOKEN',
      accessToken: token,
      permissions: ['pages_read_engagement'],
    },
  ]);
  const appCredential = await provider.resolve({ connectionKey: 'primary', role: 'APP' });
  const accessCredential = await provider.resolve({ connectionKey: 'primary', role: 'PAGE' });
  const proof = buildMetaAppSecretProof({ appCredential, accessCredential });
  assert.equal(proof, createHmac('sha256', appSecret).update(token).digest('hex'));
  assert.equal(JSON.stringify({ appCredential, accessCredential, proof }).includes(token), false);
  assert.equal(JSON.stringify({ appCredential, accessCredential, proof }).includes(appSecret), false);
});

test('credential version changes invalidate and dispose cached clients', async () => {
  const provider = new InMemoryMetaCredentialProvider([{
    connectionKey: 'primary',
    role: 'CAPI',
    secretRef: 'env:META_CAPI_ACCESS_TOKEN',
    accessToken: 'EA_CAPI_TOKEN_VERSION_ONE_123456789012345',
  }]);
  const registry = new MetaCredentialClientRegistry<{ id: number }>();
  let created = 0;
  let disposed = 0;
  const firstCredential = await provider.resolve({ connectionKey: 'primary', role: 'CAPI' });
  const first = await registry.getOrCreate({
    credential: firstCredential,
    create: () => ({ id: ++created }),
    dispose: () => { disposed += 1; },
  });
  const reused = await registry.getOrCreate({
    credential: firstCredential,
    create: () => ({ id: ++created }),
    dispose: () => { disposed += 1; },
  });
  assert.equal(first, reused);
  assert.equal(created, 1);

  provider.set({
    connectionKey: 'primary',
    role: 'CAPI',
    secretRef: 'env:META_CAPI_ACCESS_TOKEN',
    accessToken: 'EA_CAPI_TOKEN_VERSION_TWO_123456789012345',
  });
  const rotatedCredential = await provider.resolve({ connectionKey: 'primary', role: 'CAPI' });
  const rotated = await registry.getOrCreate({
    credential: rotatedCredential,
    create: () => ({ id: ++created }),
    dispose: () => { disposed += 1; },
  });
  assert.notEqual(rotated, first);
  assert.equal(created, 2);
  assert.equal(disposed, 1);
  assert.equal(registry.snapshot()[0]?.credentialVersion, rotatedCredential.metadata.credentialVersion);
});

test('credential metadata migration and repository contain no raw secret column', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const migration = fs.readFileSync('prisma/migrations/20260722193000_add_meta_credential_metadata/migration.sql', 'utf8');
  const repository = fs.readFileSync('lib/meta-platform/credentials/prisma-metadata-repository.ts', 'utf8');
  assert.match(schema, /model MetaCredentialMetadata\s*\{/);
  assert.match(schema, /secretRef\s+String/);
  assert.match(schema, /appId\s+String\?/);
  assert.match(migration, /\"appId\" TEXT/);
  assert.match(repository, /metadata\.appId/);
  assert.doesNotMatch(schema.match(/model MetaCredentialMetadata\s*\{[\s\S]*?\n\}/)?.[0] ?? '', /accessToken|appSecret|secretValue/);
  assert.doesNotMatch(migration, /accessToken|appSecret|secretValue/);
  assert.doesNotMatch(repository, /readAccessToken|readAppSecret/);
});
