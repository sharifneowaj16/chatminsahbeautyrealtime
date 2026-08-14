/* eslint-disable @typescript-eslint/no-explicit-any -- isolated boundary for Meta's generated fluent CAPI builders. */
import type { MetaPlatformCapiDeliveryResult, MetaPlatformCapiEvent, MetaPlatformCapiProviderPayload, MetaPlatformCapiRequest, MetaPlatformCapiUserData } from '../../../domains/capi/types';
import type { MetaBusinessSdkClient } from '../types';
import { createMetaBusinessSdkEntityAdapter } from './base';

export const metaBusinessSdkCapiAdapter = createMetaBusinessSdkEntityAdapter(Object.freeze({
  id: 'capi' as const,
  requiredExports: Object.freeze(['EventRequest', 'ServerEvent', 'UserData', 'CustomData', 'Content']),
}));

export function createMetaCapiEventRequest(input: {
  readonly client: MetaBusinessSdkClient;
  readonly pixelId: string;
  readonly events?: readonly unknown[];
  readonly partnerAgent?: string | null;
  readonly testEventCode?: string | null;
}): unknown {
  if (!input.pixelId.trim()) throw new TypeError('META_PIXEL_ID_REQUIRED');
  const Constructor = input.client.runtime.EventRequest as unknown as new (
    accessToken: string,
    pixelId: string,
    events?: readonly unknown[],
    partnerAgent?: string | null,
    testEventCode?: string | null,
  ) => unknown;
  return new Constructor(
    input.client.credential.readAccessToken(),
    input.pixelId.trim(),
    input.events,
    input.partnerAgent,
    input.testEventCode,
  );
}

type Fluent = Record<string, (...args: any[]) => any>;
type TransportResponse = { readonly __metaPlatformCapiTransport: true; readonly ok: boolean; readonly status: number; readonly body: MetaPlatformCapiProviderPayload | null; readonly headers: Readonly<Record<string, string>> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: string | readonly string[] | undefined): string[] | undefined {
  if (typeof value === 'string') return value.trim() ? [value] : undefined;
  if (!Array.isArray(value)) return undefined;
  const normalized = value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
  return normalized.length ? normalized : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function buildUserData(client: MetaBusinessSdkClient, input: MetaPlatformCapiUserData) {
  const userData = new (client.runtime.UserData as any)() as Fluent;
  const setters: Array<[string, string[] | string | undefined]> = [
    ['setEmails', strings(input.em)], ['setPhones', strings(input.ph)], ['setFirstNames', strings(input.fn)],
    ['setLastNames', strings(input.ln)], ['setCities', strings(input.ct)], ['setStates', strings(input.st)],
    ['setZips', strings(input.zp)], ['setCountries', strings(input.country)], ['setExternalIds', strings(input.external_id)],
    ['setClientIpAddress', input.client_ip_address], ['setClientUserAgent', input.client_user_agent],
    ['setFbc', input.fbc], ['setFbp', input.fbp],
  ];
  for (const [method, value] of setters) if (value !== undefined && typeof userData[method] === 'function') userData[method](value);
  return userData;
}

function buildContent(client: MetaBusinessSdkClient, input: Record<string, unknown>) {
  const content = new (client.runtime.Content as any)() as Fluent & { normalize?: () => Record<string, unknown> };
  const values: Array<[string, unknown]> = [
    ['setId', stringValue(input.id)], ['setQuantity', numberValue(input.quantity)], ['setItemPrice', numberValue(input.item_price)],
    ['setTitle', stringValue(input.title)], ['setDescription', stringValue(input.description)], ['setBrand', stringValue(input.brand)],
    ['setCategory', stringValue(input.category)], ['setDeliveryCategory', stringValue(input.delivery_category)],
  ];
  for (const [method, value] of values) if (value !== undefined && typeof content[method] === 'function') content[method](value);
  const standard = new Set(['id', 'quantity', 'item_price', 'title', 'description', 'brand', 'category', 'delivery_category']);
  const extras = Object.fromEntries(Object.entries(input).filter(([key, value]) => !standard.has(key) && value !== undefined && value !== null));
  if (Object.keys(extras).length && typeof content.normalize === 'function') {
    const normalize = content.normalize.bind(content);
    content.normalize = () => ({ ...normalize(), ...extras });
  }
  return content;
}

function buildCustomData(client: MetaBusinessSdkClient, input: Readonly<Record<string, unknown>>) {
  const customData = new (client.runtime.CustomData as any)() as Fluent;
  const values: Array<[string, unknown]> = [
    ['setValue', numberValue(input.value)], ['setNetRevenue', numberValue(input.net_revenue)], ['setCurrency', stringValue(input.currency)],
    ['setContentName', stringValue(input.content_name)], ['setContentCategory', stringValue(input.content_category)],
    ['setContentIds', strings(input.content_ids as string | string[] | undefined)],
    ['setContentType', stringValue(input.content_type)], ['setOrderId', stringValue(input.order_id)],
    ['setPredictedLtv', numberValue(input.predicted_ltv)], ['setNumItems', numberValue(input.num_items)],
    ['setSearchString', stringValue(input.search_string)], ['setItemNumber', stringValue(input.item_number)],
    ['setDeliveryCategory', stringValue(input.delivery_category)], ['setStatus', stringValue(input.status)],
  ];
  for (const [method, value] of values) if (value !== undefined && typeof customData[method] === 'function') customData[method](value);
  if (Array.isArray(input.contents) && typeof customData.setContents === 'function') {
    const contents = input.contents.filter(isRecord).map((item) => buildContent(client, item));
    if (contents.length) customData.setContents(contents);
  }
  const standard = new Set(['value', 'net_revenue', 'currency', 'content_name', 'content_category', 'content_ids', 'contents', 'content_type', 'order_id', 'predicted_ltv', 'num_items', 'search_string', 'item_number', 'delivery_category', 'status']);
  const extras = Object.fromEntries(Object.entries(input).filter(([key, value]) => !standard.has(key) && value !== undefined && value !== null));
  if (Object.keys(extras).length && typeof customData.setCustomProperties === 'function') customData.setCustomProperties(extras);
  return customData;
}

function buildServerEvent(client: MetaBusinessSdkClient, input: MetaPlatformCapiEvent) {
  const event = new (client.runtime.ServerEvent as any)() as Fluent;
  const chain: Array<[string, unknown]> = [
    ['setEventName', input.event_name], ['setEventTime', input.event_time], ['setEventId', input.event_id],
    ['setActionSource', input.action_source], ['setUserData', buildUserData(client, input.user_data)],
    ['setEventSourceUrl', input.event_source_url], ['setOptOut', input.opt_out],
    ['setCustomData', buildCustomData(client, input.custom_data)], ['setDataProcessingOptions', input.data_processing_options],
    ['setDataProcessingOptionsCountry', input.data_processing_options_country], ['setDataProcessingOptionsState', input.data_processing_options_state],
  ];
  for (const [method, value] of chain) if (value !== undefined && typeof event[method] === 'function') event[method](value);
  return event;
}

function versionedUrl(url: string, graphApiVersion: string) {
  return url.replace(/\/v\d{1,3}\.\d+\//, `/${graphApiVersion}/`);
}

function safeHeaders(headers: Headers): Readonly<Record<string, string>> {
  const values: Record<string, string> = {};
  for (const key of ['retry-after', 'x-fb-trace-id', 'x-fb-request-id', 'x-business-use-case-usage', 'x-app-usage']) {
    const value = headers.get(key);
    if (value) values[key] = value.slice(0, 2_000);
  }
  return Object.freeze(values);
}

function isTransportResponse(value: unknown): value is TransportResponse {
  return isRecord(value) && value.__metaPlatformCapiTransport === true && typeof value.ok === 'boolean' && typeof value.status === 'number';
}

export async function sendMetaCapiEventsWithBusinessSdk(input: {
  readonly client: MetaBusinessSdkClient;
  readonly pixelId: string;
  readonly payload: MetaPlatformCapiRequest;
  readonly partnerAgent: string;
  readonly timeoutMs: number;
  readonly fetchImpl?: typeof fetch;
}): Promise<MetaPlatformCapiDeliveryResult> {
  if (!input.payload.data.length) throw new TypeError('META_CAPI_EVENTS_REQUIRED');
  const events = input.payload.data.map((event) => buildServerEvent(input.client, event));
  const request = createMetaCapiEventRequest({ client: input.client, pixelId: input.pixelId, events }) as Fluent;
  if (typeof request.setPartnerAgent === 'function') request.setPartnerAgent(input.partnerAgent);
  if (input.payload.test_event_code && typeof request.setTestEventCode === 'function') request.setTestEventCode(input.payload.test_event_code);
  if (typeof request.setHttpService === 'function') {
    request.setHttpService({
      executeRequest: async (url: string, method: string, headers: Record<string, string>, params: Record<string, unknown>) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(new Error('META_CAPI_TIMEOUT')), input.timeoutMs);
        try {
          const response = await (input.fetchImpl ?? fetch)(versionedUrl(url, input.client.graphApiVersion), {
            method, headers, body: JSON.stringify(params), signal: controller.signal, cache: 'no-store', redirect: 'error',
          });
          const body = await response.json().catch(() => null) as MetaPlatformCapiProviderPayload | null;
          return Object.freeze({ __metaPlatformCapiTransport: true as const, ok: response.ok, status: response.status, body, headers: safeHeaders(response.headers) });
        } finally {
          clearTimeout(timer);
        }
      },
    });
  }
  if (typeof request.execute !== 'function') throw new Error('META_CAPI_EVENT_REQUEST_EXECUTE_MISSING');
  const executed = await request.execute();
  const result = isTransportResponse(executed)
    ? executed
    : { __metaPlatformCapiTransport: true as const, ok: true, status: 200, body: isRecord(executed) ? executed as MetaPlatformCapiProviderPayload : null, headers: Object.freeze({}) };
  return Object.freeze({
    ok: result.ok, status: result.status, responsePayload: result.body, responseHeaders: result.headers,
    graphApiVersion: input.client.graphApiVersion, sdkVersion: input.client.sdkVersion,
    credentialVersion: input.client.credential.metadata.credentialVersion, transport: 'META_PLATFORM_BUSINESS_SDK',
  });
}
