import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryMetaCredentialProvider } from '../../lib/meta-platform/credentials/provider';
import {
  META_BUSINESS_SDK_ADAPTERS,
  META_BUSINESS_SDK_EXPECTED_RUNTIME_VERSION,
  MetaBusinessSdkClientFactory,
  MetaBusinessSdkExecutor,
  decorateMetaSdkApiWithAppSecretProof,
  getMetaBusinessSdkRuntimeContract,
  validateMetaBusinessSdkRuntime,
} from '../../lib/meta-platform/transports/business-sdk';
import { META_BUSINESS_SDK_VERSION } from '../../lib/meta-platform/versioning/registry';

function fakeRuntime(version = META_BUSINESS_SDK_VERSION) {
  class FakeConstructor {}
  class FakeApi {
    static SDK_VERSION = version;
    static VERSION = 'v24.0';
    static GRAPH = 'https://graph.facebook.com';
  }
  return {
    FacebookAdsApi: FakeApi,
    Business: FakeConstructor,
    AdAccount: FakeConstructor,
    Campaign: FakeConstructor,
    AdSet: FakeConstructor,
    AdCreative: FakeConstructor,
    Ad: FakeConstructor,
    CustomAudience: FakeConstructor,
    ProductCatalog: FakeConstructor,
    ProductFeed: FakeConstructor,
    ProductSet: FakeConstructor,
    AdsPixel: FakeConstructor,
    Page: FakeConstructor,
    LeadgenForm: FakeConstructor,
    Content: FakeConstructor,
    CustomData: FakeConstructor,
    EventRequest: FakeConstructor,
    ServerEvent: FakeConstructor,
    UserData: FakeConstructor,
  };
}

function credentials() {
  return new InMemoryMetaCredentialProvider([
    {
      connectionKey: 'primary',
      role: 'APP',
      secretRef: 'env:META_APP_SECRET',
      appSecret: 'app-secret-value',
      appId: '123',
    },
    {
      connectionKey: 'primary',
      role: 'BUSINESS_SYSTEM_USER',
      secretRef: 'env:META_BUSINESS_ACCESS_TOKEN',
      accessToken: 'business-token-v1',
      permissions: [],
    },
  ]);
}

test('installed SDK namespace satisfies the Phase 23 runtime contract', () => {
  const contract = getMetaBusinessSdkRuntimeContract();
  assert.equal(contract.packageVersion, META_BUSINESS_SDK_VERSION);
  assert.equal(contract.runtimeVersion, META_BUSINESS_SDK_EXPECTED_RUNTIME_VERSION);
  assert.equal(contract.graphVersion, 'v24.0');
  assert.equal(contract.requiredExports.every((name) => contract.availableExports.includes(name)), true);
});

test('runtime validation fails closed for missing exports and incompatible lines', () => {
  const runtime = fakeRuntime();
  const contract = validateMetaBusinessSdkRuntime(runtime);
  assert.equal(contract.packageVersion, META_BUSINESS_SDK_VERSION);
  assert.throws(
    () => validateMetaBusinessSdkRuntime({ ...runtime, LeadgenForm: undefined }),
    /META_BUSINESS_SDK_RUNTIME_EXPORT_MISSING:LeadgenForm/,
  );
  assert.throws(
    () => validateMetaBusinessSdkRuntime(fakeRuntime('25.0.0')),
    /META_BUSINESS_SDK_RUNTIME_VERSION_MISMATCH/,
  );
});

test('appsecret proof decorates SDK calls without exposing token or secret', async () => {
  const provider = credentials();
  const accessCredential = await provider.resolve({ connectionKey: 'primary', role: 'BUSINESS_SYSTEM_USER' });
  const appCredential = await provider.resolve({ connectionKey: 'primary', role: 'APP' });
  const calls: unknown[][] = [];
  const api = {
    async call(...args: unknown[]) {
      calls.push(args);
      return args[2];
    },
  };

  assert.equal(decorateMetaSdkApiWithAppSecretProof({ api, accessCredential, appCredential }), true);
  const result = await api.call('GET', ['act_1', 'campaigns'], { limit: 10 }) as Record<string, unknown>;
  assert.match(String(result.appsecret_proof), /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(result).includes('business-token-v1'), false);
  assert.equal(JSON.stringify(result).includes('app-secret-value'), false);
});

test('client factory is lazy, cached and rotation-aware', async () => {
  const provider = credentials();
  const factory = new MetaBusinessSdkClientFactory({ credentialProvider: provider });
  assert.deepEqual(factory.snapshot(), []);

  const request = {
    capability: 'sdk-transport' as const,
    connectionKey: 'primary',
    credentialRole: 'BUSINESS_SYSTEM_USER' as const,
  };
  await assert.rejects(
    () => factory.getClient({ ...request, graphApiVersion: 'v23.0' }),
    /META_BUSINESS_SDK_GRAPH_VERSION_MISMATCH/,
  );

  const first = await factory.getClient(request);
  const second = await factory.getClient(request);
  assert.equal(first, second);
  assert.equal(first.appSecretProofEnabled, true);
  assert.equal(factory.snapshot().length, 1);

  provider.set({
    connectionKey: 'primary',
    role: 'BUSINESS_SYSTEM_USER',
    secretRef: 'env:META_BUSINESS_ACCESS_TOKEN',
    accessToken: 'business-token-v2',
    permissions: [],
  });
  const rotated = await factory.getClient(request);
  assert.notEqual(rotated, first);
  assert.notEqual(rotated.credential.metadata.credentialVersion, first.credential.metadata.credentialVersion);
  assert.equal(first.api.accessToken, '');
  await assert.rejects(() => first.api.call?.('GET', ['me']) as Promise<unknown>, /META_BUSINESS_SDK_CLIENT_DISPOSED/);
});

test('executor normalizes values, failures and deadlines with safe logs', async () => {
  const provider = credentials();
  const factory = new MetaBusinessSdkClientFactory({ credentialProvider: provider });
  const logs: unknown[] = [];
  const executor = new MetaBusinessSdkExecutor({ clientFactory: factory, logger: (entry) => logs.push(entry) });
  const context = {
    capability: 'sdk-transport' as const,
    connectionKey: 'primary',
    credentialRole: 'BUSINESS_SYSTEM_USER' as const,
    operation: 'test-operation',
    correlationId: 'corr-phase23',
  };

  const success = await executor.execute(context, async () => ({ ok: true }));
  assert.equal(success.ok, true);

  const timedOut = await executor.execute({ ...context, operation: 'timeout', timeoutMs: 5 }, async () =>
    new Promise<never>(() => undefined));
  assert.equal(timedOut.ok, false);
  if (!timedOut.ok) assert.equal(timedOut.error.code, 'META_BUSINESS_SDK_TIMEOUT');

  const serialized = JSON.stringify(logs);
  assert.equal(serialized.includes('business-token'), false);
  assert.equal(serialized.includes('app-secret-value'), false);
});

test('focused adapter registry covers all Phase 23 SDK domains', () => {
  assert.deepEqual(
    META_BUSINESS_SDK_ADAPTERS.map((adapter) => adapter.descriptor.id),
    ['business', 'ads', 'insights', 'audiences', 'catalog', 'pixels', 'capi', 'pages', 'leads'],
  );
  assert.equal(META_BUSINESS_SDK_ADAPTERS.every((adapter) => adapter.descriptor.requiredExports.length > 0), true);
});
