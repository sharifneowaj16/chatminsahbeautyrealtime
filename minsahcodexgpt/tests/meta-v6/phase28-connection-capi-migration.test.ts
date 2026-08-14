import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryMetaCredentialProvider } from '../../lib/meta-platform/credentials/provider';
import { MetaPlatformConnectionHealthService } from '../../lib/meta-platform/domains/connection/service';
import { sendMetaCapiEventsWithBusinessSdk } from '../../lib/meta-platform/transports/business-sdk/adapters/capi';
import type { MetaBusinessSdkClient, MetaBusinessSdkRuntime } from '../../lib/meta-platform/transports/business-sdk/types';
import {
  resolveMetaCapiCutover,
  resolveMetaConnectionCutover,
  stableMetaCanaryBucket,
} from '../../lib/meta-platform/migration/phase28-cutover';

const requiredPermissions = [
  'ads_management', 'ads_read', 'business_management', 'catalog_management',
  'pages_manage_metadata', 'pages_read_engagement', 'leads_retrieval',
  'instagram_basic', 'instagram_manage_messages',
];

test('connection cutover progresses legacy -> shadow -> platform and legacy disable is explicit', () => {
  assert.equal(resolveMetaConnectionCutover({}).mode, 'LEGACY');
  assert.equal(resolveMetaConnectionCutover({ META_PLATFORM_CONNECTION_SHADOW: 'true' }).mode, 'SHADOW');
  assert.equal(resolveMetaConnectionCutover({ META_PLATFORM_CONNECTION_SHADOW: 'true', META_PLATFORM_CONNECTION_READS: 'true' }).mode, 'PLATFORM');
  const retired = resolveMetaConnectionCutover({ META_PLATFORM_CONNECTION_LEGACY_DISABLED: 'true' });
  assert.equal(retired.mode, 'PLATFORM');
  assert.equal(retired.legacyDisabled, true);
});

test('CAPI canary selection is stable per event ID and test-event/full modes take precedence', () => {
  const eventId = 'purchase_order_123';
  assert.equal(stableMetaCanaryBucket(eventId), stableMetaCanaryBucket(eventId));
  assert.equal(resolveMetaCapiCutover({ eventId, env: { META_PLATFORM_CAPI_CANARY_PERCENT: '0' } }).mode, 'LEGACY');
  assert.equal(resolveMetaCapiCutover({ eventId, env: { META_PLATFORM_CAPI_CANARY_PERCENT: '100' } }).mode, 'PLATFORM_CANARY');
  assert.equal(resolveMetaCapiCutover({ eventId, testEventCode: 'TEST123', env: { META_PLATFORM_CAPI_TEST_EVENTS: 'true' } }).mode, 'PLATFORM_TEST');
  assert.equal(resolveMetaCapiCutover({ eventId, env: { META_PLATFORM_CAPI_WRITES: 'true' } }).mode, 'PLATFORM');
});

test('connection health resolves exact credential roles, verifies permissions/assets and exposes no secret', async () => {
  const businessToken = 'EA_BUSINESS_PHASE28_SECRET_123456789012345';
  const appSecret = 'phase28-app-secret-1234567890';
  const provider = new InMemoryMetaCredentialProvider([
    {
      connectionKey: 'primary', role: 'BUSINESS_SYSTEM_USER', secretRef: 'secret-manager:meta/business',
      accessToken: businessToken, appId: 'app-1', permissions: requiredPermissions,
    },
    {
      connectionKey: 'primary', role: 'APP', secretRef: 'secret-manager:meta/app',
      appSecret, appId: 'app-1',
    },
  ]);
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (request) => {
    const url = new URL(typeof request === 'string' ? request : request instanceof URL ? request.href : request.url);
    calls.push(url.pathname);
    const path = url.pathname.replace(/^\/v\d+\.\d+\//, '');
    if (path === 'debug_token') {
      return Response.json({ data: { app_id: 'app-1', is_valid: true, type: 'SYSTEM_USER', scopes: requiredPermissions } });
    }
    if (path === 'me/permissions') {
      return Response.json({ data: requiredPermissions.map((permission) => ({ permission, status: 'granted' })) });
    }
    const id = decodeURIComponent(path);
    return Response.json({ id, name: `Asset ${id}` });
  };
  const service = new MetaPlatformConnectionHealthService({ credentialProvider: provider, fetchImpl });
  const result = await service.check({
    now: new Date('2026-07-23T04:00:00.000Z'),
    config: {
      connectionName: 'primary', appId: 'app-1', businessId: 'business-1', catalogId: undefined,
      datasetId: 'pixel-1', pixelId: 'pixel-1', adAccountId: 'act_123', pageId: 'page-1', instagramAccountId: undefined,
      graphApiVersion: 'v24.0', requiredPermissions,
    },
  });
  assert.ok(['HEALTHY', 'VERSION_WARNING'].includes(result.status));
  assert.equal(result.token.valid, true);
  assert.equal(result.permissions.ok, true);
  assert.equal(result.assets.business.ok, true);
  assert.equal(result.assets.adAccount.ok, true);
  assert.equal(result.platform.transport, 'GRAPH_HTTP');
  assert.ok(calls.includes('/v24.0/debug_token'));
  assert.equal(JSON.stringify(result).includes(businessToken), false);
  assert.equal(JSON.stringify(result).includes(appSecret), false);
});

class FluentValue {
  readonly values: Record<string, unknown> = {};
  normalize() { return { ...this.values }; }
}

for (const method of [
  'setEmails', 'setPhones', 'setFirstNames', 'setLastNames', 'setCities', 'setStates', 'setZips', 'setCountries',
  'setExternalIds', 'setClientIpAddress', 'setClientUserAgent', 'setFbc', 'setFbp', 'setId', 'setQuantity',
  'setItemPrice', 'setTitle', 'setDescription', 'setBrand', 'setCategory', 'setDeliveryCategory', 'setValue',
  'setNetRevenue', 'setCurrency', 'setContentName', 'setContentCategory', 'setContentIds', 'setContents', 'setContentType',
  'setOrderId', 'setPredictedLtv', 'setNumItems', 'setSearchString', 'setItemNumber', 'setStatus', 'setCustomProperties',
  'setEventName', 'setEventTime', 'setEventId', 'setActionSource', 'setUserData', 'setEventSourceUrl', 'setOptOut',
  'setCustomData', 'setDataProcessingOptions', 'setDataProcessingOptionsCountry', 'setDataProcessingOptionsState',
]) {
  Object.defineProperty(FluentValue.prototype, method, {
    value(this: FluentValue, value: unknown) { this.values[method] = value; return this; },
  });
}

class FakeEventRequest {
  static lastAccessToken = '';
  static lastPartnerAgent = '';
  static lastTestCode = '';
  private httpService?: { executeRequest(url: string, method: string, headers: Record<string, string>, params: Record<string, unknown>): Promise<unknown> };
  constructor(accessToken: string, private readonly pixelId: string, private readonly events: readonly unknown[]) {
    FakeEventRequest.lastAccessToken = accessToken;
  }
  setPartnerAgent(value: string) { FakeEventRequest.lastPartnerAgent = value; return this; }
  setTestEventCode(value: string) { FakeEventRequest.lastTestCode = value; return this; }
  setHttpService(value: FakeEventRequest['httpService']) { this.httpService = value; return this; }
  async execute() {
    const httpService = this.httpService;
    if (!httpService) throw new Error('HTTP service missing');
    return httpService.executeRequest(
      `https://graph.facebook.com/v23.0/${this.pixelId}/events`,
      'POST',
      { 'Content-Type': 'application/json' },
      { data: this.events },
    );
  }
}

test('unified CAPI adapter uses worker credential, configured Graph version, test code and safe response metadata', async () => {
  const accessToken = 'EA_CAPI_PHASE28_SECRET_123456789012345';
  const runtime = {
    EventRequest: FakeEventRequest,
    ServerEvent: FluentValue,
    UserData: FluentValue,
    CustomData: FluentValue,
    Content: FluentValue,
  } as unknown as MetaBusinessSdkRuntime;
  const client = {
    runtime,
    api: {},
    sdkVersion: '24.0.1',
    graphApiVersion: 'v24.0',
    appSecretProofEnabled: true,
    credential: {
      metadata: {
        connectionKey: 'primary', role: 'CAPI', secretRef: 'secret-manager:meta/capi', credentialVersion: 'credential-v2',
        permissions: [], rotatedAt: null, expiresAt: null, dataAccessExpiresAt: null, appId: 'app-1',
      },
      readAccessToken: () => accessToken,
      readAppSecret: () => { throw new Error('not-app-role'); },
      toJSON() { return this.metadata; },
    },
  } satisfies MetaBusinessSdkClient;
  let requestedUrl = '';
  const result = await sendMetaCapiEventsWithBusinessSdk({
    client,
    pixelId: 'pixel-1',
    partnerAgent: 'minsahbeauty-meta-platform',
    timeoutMs: 5_000,
    payload: {
      test_event_code: 'TEST123',
      data: [{
        event_name: 'Purchase', event_time: 1_784_780_000, event_id: 'order_123', action_source: 'website',
        event_source_url: 'https://minsahbeauty.com/checkout/success',
        user_data: { em: ['hash-email'], external_id: ['hash-user'] },
        custom_data: { currency: 'BDT', value: 1250, order_id: '123', content_ids: ['sku-1'] },
      }],
    },
    fetchImpl: async (request) => {
      requestedUrl = typeof request === 'string' ? request : request instanceof URL ? request.href : request.url;
      return Response.json({ events_received: 1, fbtrace_id: 'trace-1' }, { headers: { 'x-fb-trace-id': 'trace-1' } });
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.transport, 'META_PLATFORM_BUSINESS_SDK');
  assert.equal(result.graphApiVersion, 'v24.0');
  assert.equal(result.sdkVersion, '24.0.1');
  assert.equal(result.credentialVersion, 'credential-v2');
  assert.match(requestedUrl, /\/v24\.0\/pixel-1\/events/);
  assert.equal(FakeEventRequest.lastAccessToken, accessToken);
  assert.equal(FakeEventRequest.lastPartnerAgent, 'minsahbeauty-meta-platform');
  assert.equal(FakeEventRequest.lastTestCode, 'TEST123');
  assert.equal(JSON.stringify(result).includes(accessToken), false);
});
