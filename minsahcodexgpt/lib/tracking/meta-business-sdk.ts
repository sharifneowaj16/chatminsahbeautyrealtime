/* eslint-disable @typescript-eslint/no-explicit-any -- Meta's generated CAPI builders are validated at the unified SDK transport boundary. */
import 'server-only';
import {
  META_BUSINESS_SDK_EXPECTED_RUNTIME_VERSION,
  getMetaBusinessSdkRuntime,
  getMetaBusinessSdkRuntimeVersion,
} from '@/lib/meta-platform/transports/business-sdk/runtime';
import { META_BUSINESS_SDK_VERSION } from '@/lib/meta-platform/versioning/registry';
import {
  META_CAPI_TIMEOUT_MS,
  META_GRAPH_API_VERSION,
} from '@/lib/tracking/meta-schema';

type BusinessSdkContent = {
  setId(value: string): BusinessSdkContent;
  setQuantity(value: number): BusinessSdkContent;
  setItemPrice(value: number): BusinessSdkContent;
  setTitle(value: string): BusinessSdkContent;
  setDescription(value: string): BusinessSdkContent;
  setBrand(value: string): BusinessSdkContent;
  setCategory(value: string): BusinessSdkContent;
  setDeliveryCategory(value: string): BusinessSdkContent;
  normalize(): Record<string, unknown>;
};

interface HttpService {
  executeRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    params: Record<string, unknown>,
  ): Promise<unknown>;
}

export const META_BUSINESS_SDK_NPM_VERSION = META_BUSINESS_SDK_VERSION;
export const META_BUSINESS_SDK_RUNTIME_VERSION = META_BUSINESS_SDK_EXPECTED_RUNTIME_VERSION;
export const META_BUSINESS_SDK_PARTNER_AGENT = 'minsahbeauty-nodejs-business-sdk';

export type MetaBusinessSdkUserDataInput = {
  em?: string | string[];
  ph?: string | string[];
  fn?: string | string[];
  ln?: string | string[];
  ct?: string | string[];
  st?: string | string[];
  zp?: string | string[];
  country?: string | string[];
  external_id?: string | string[];
  fbc?: string;
  fbp?: string;
  client_ip_address?: string;
  client_user_agent?: string;
};

type MetaBusinessSdkBaseEventInput = {
  event_name: string;
  event_time: number;
  event_id: string;
  opt_out?: boolean;
  user_data: MetaBusinessSdkUserDataInput;
  custom_data: Record<string, unknown>;
  data_processing_options?: string[];
  data_processing_options_country?: number;
  data_processing_options_state?: number;
};

export type MetaBusinessSdkWebsiteEventInput = MetaBusinessSdkBaseEventInput & {
  action_source: 'website';
  event_source_url: string;
};

export type MetaBusinessSdkNonWebsiteEventInput = MetaBusinessSdkBaseEventInput & {
  action_source: 'physical_store' | 'phone_call' | 'chat' | 'email' | 'other';
  event_source_url: string | undefined;
};

export type MetaBusinessSdkEventInput =
  | MetaBusinessSdkWebsiteEventInput
  | MetaBusinessSdkNonWebsiteEventInput;

export type MetaBusinessSdkRequestInput = {
  data: MetaBusinessSdkEventInput[];
  test_event_code?: string;
};

export type MetaBusinessSdkResponsePayload = {
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
  id?: string;
  num_processed_entries?: number;
  error?: {
    code?: string | number;
    error_subcode?: string | number;
    message?: string;
    type?: string;
    fbtrace_id?: string;
  };
  [key: string]: unknown;
};

export type MetaBusinessSdkSendResult = {
  ok: boolean;
  status: number;
  responsePayload: MetaBusinessSdkResponsePayload | null;
  responseHeaders: Record<string, string>;
  graphApiVersion: string;
  sdkVersion: string;
};

type MetaBusinessSdkTransportResponse = {
  __metaBusinessSdkTransport: true;
  ok: boolean;
  status: number;
  body: MetaBusinessSdkResponsePayload | null;
  headers: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (typeof value === 'string' && value.length > 0) return [value];
  if (!Array.isArray(value)) return undefined;
  const values = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return values.length > 0 ? values : undefined;
}

function buildUserData(input: MetaBusinessSdkUserDataInput) {
  const { UserData } = getMetaBusinessSdkRuntime();
  const userData = new (UserData as any)();

  const emails = asStringArray(input.em);
  const phones = asStringArray(input.ph);
  const firstNames = asStringArray(input.fn);
  const lastNames = asStringArray(input.ln);
  const cities = asStringArray(input.ct);
  const states = asStringArray(input.st);
  const zips = asStringArray(input.zp);
  const countries = asStringArray(input.country);
  const externalIds = asStringArray(input.external_id);

  if (emails) userData.setEmails(emails);
  if (phones) userData.setPhones(phones);
  if (firstNames) userData.setFirstNames(firstNames);
  if (lastNames) userData.setLastNames(lastNames);
  if (cities) userData.setCities(cities);
  if (states) userData.setStates(states);
  if (zips) userData.setZips(zips);
  if (countries) userData.setCountries(countries);
  if (externalIds) userData.setExternalIds(externalIds);
  if (input.client_ip_address) userData.setClientIpAddress(input.client_ip_address);
  if (input.client_user_agent) userData.setClientUserAgent(input.client_user_agent);
  if (input.fbc) userData.setFbc(input.fbc);
  if (input.fbp) userData.setFbp(input.fbp);

  return userData;
}

function buildContent(input: Record<string, unknown>): BusinessSdkContent {
  const { Content } = getMetaBusinessSdkRuntime();
  const content = new (Content as any)() as BusinessSdkContent;
  const id = asString(input.id);
  const quantity = asNumber(input.quantity);
  const itemPrice = asNumber(input.item_price);
  const title = asString(input.title);
  const description = asString(input.description);
  const brand = asString(input.brand);
  const category = asString(input.category);
  const deliveryCategory = asString(input.delivery_category);

  if (id) content.setId(id);
  if (quantity !== undefined) content.setQuantity(quantity);
  if (itemPrice !== undefined) content.setItemPrice(itemPrice);
  if (title) content.setTitle(title);
  if (description) content.setDescription(description);
  if (brand) content.setBrand(brand);
  if (category) content.setCategory(category);
  if (deliveryCategory) content.setDeliveryCategory(deliveryCategory);

  // Meta's SDK Content class currently exposes only the standard content fields.
  // Preserve existing catalog/variant metadata while still using the SDK Content normalizer.
  const extraProperties = Object.fromEntries(
    Object.entries(input).filter(([key, value]) =>
      ![
        'id',
        'quantity',
        'item_price',
        'title',
        'description',
        'brand',
        'category',
        'delivery_category',
      ].includes(key) && value !== undefined && value !== null
    )
  );

  if (Object.keys(extraProperties).length > 0) {
    const sdkNormalize = content.normalize.bind(content);
    content.normalize = () => ({ ...sdkNormalize(), ...extraProperties });
  }

  return content;
}

function buildCustomData(input?: Record<string, unknown>) {
  if (!input) return undefined;

  const { CustomData } = getMetaBusinessSdkRuntime();
  const customData = new (CustomData as any)();
  const standardKeys = new Set([
    'value',
    'net_revenue',
    'currency',
    'content_name',
    'content_category',
    'content_ids',
    'contents',
    'content_type',
    'order_id',
    'predicted_ltv',
    'num_items',
    'search_string',
    'item_number',
    'delivery_category',
    'status',
  ]);

  const value = asNumber(input.value);
  const netRevenue = asNumber(input.net_revenue);
  const predictedLtv = asNumber(input.predicted_ltv);
  const numItems = asNumber(input.num_items);
  const currency = asString(input.currency);
  const contentName = asString(input.content_name);
  const contentCategory = asString(input.content_category);
  const contentType = asString(input.content_type);
  const orderId = asString(input.order_id);
  const searchString = asString(input.search_string);
  const itemNumber = asString(input.item_number);
  const deliveryCategory = asString(input.delivery_category);
  const status = asString(input.status);
  const contentIds = asStringArray(input.content_ids);
  const contents = Array.isArray(input.contents)
    ? input.contents.filter(isRecord).map(buildContent)
    : undefined;

  if (value !== undefined) customData.setValue(value);
  if (netRevenue !== undefined) customData.setNetRevenue(netRevenue);
  if (currency) customData.setCurrency(currency);
  if (contentName) customData.setContentName(contentName);
  if (contentCategory) customData.setContentCategory(contentCategory);
  if (contentIds) customData.setContentIds(contentIds);
  if (contents && contents.length > 0) customData.setContents(contents);
  if (contentType) customData.setContentType(contentType);
  if (orderId) customData.setOrderId(orderId);
  if (predictedLtv !== undefined) customData.setPredictedLtv(predictedLtv);
  if (numItems !== undefined) customData.setNumItems(numItems);
  if (searchString) customData.setSearchString(searchString);
  if (itemNumber) customData.setItemNumber(itemNumber);
  if (deliveryCategory) customData.setDeliveryCategory(deliveryCategory);
  if (status) customData.setStatus(status);

  const customProperties = Object.fromEntries(
    Object.entries(input).filter(
      ([key, propertyValue]) => !standardKeys.has(key) && propertyValue !== undefined && propertyValue !== null
    )
  );
  if (Object.keys(customProperties).length > 0) {
    customData.setCustomProperties(customProperties);
  }

  return customData;
}

function buildServerEvent(input: MetaBusinessSdkEventInput) {
  const { ServerEvent } = getMetaBusinessSdkRuntime();
  const event = new (ServerEvent as any)()
    .setEventName(input.event_name)
    .setEventTime(input.event_time)
    .setEventId(input.event_id)
    .setActionSource(input.action_source)
    .setUserData(buildUserData(input.user_data));

  if (input.event_source_url) event.setEventSourceUrl(input.event_source_url);
  if (input.opt_out !== undefined) event.setOptOut(input.opt_out);

  const customData = buildCustomData(input.custom_data);
  if (customData) event.setCustomData(customData);

  if (input.data_processing_options) {
    event.setDataProcessingOptions(input.data_processing_options);
  }
  if (input.data_processing_options_country !== undefined) {
    event.setDataProcessingOptionsCountry(input.data_processing_options_country);
  }
  if (input.data_processing_options_state !== undefined) {
    event.setDataProcessingOptionsState(input.data_processing_options_state);
  }

  return event;
}

function applyConfiguredGraphApiVersion(url: string) {
  return url.replace(/\/v\d{1,3}\.\d+\//, `/${META_GRAPH_API_VERSION}/`);
}

class MetaBusinessSdkHttpService implements HttpService {
  async executeRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    params: Record<string, unknown>
  ): Promise<MetaBusinessSdkTransportResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), META_CAPI_TIMEOUT_MS);

    try {
      const response = await fetch(applyConfiguredGraphApiVersion(url), {
        method,
        headers,
        body: JSON.stringify(params),
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as MetaBusinessSdkResponsePayload | null;

      return {
        __metaBusinessSdkTransport: true,
        ok: response.ok,
        status: response.status,
        body,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function isTransportResponse(value: unknown): value is MetaBusinessSdkTransportResponse {
  return (
    isRecord(value) &&
    value.__metaBusinessSdkTransport === true &&
    typeof value.ok === 'boolean' &&
    typeof value.status === 'number'
  );
}

export async function sendMetaCapiWithBusinessSdk(params: {
  pixelId: string;
  accessToken: string;
  payload: MetaBusinessSdkRequestInput;
}): Promise<MetaBusinessSdkSendResult> {
  const runtime = getMetaBusinessSdkRuntime();
  const runtimeVersion = getMetaBusinessSdkRuntimeVersion();
  const events = params.payload.data.map(buildServerEvent);
  const eventRequest = new (runtime.EventRequest as any)(params.accessToken, params.pixelId, events)
    .setPartnerAgent(META_BUSINESS_SDK_PARTNER_AGENT)
    .setHttpService(new MetaBusinessSdkHttpService());

  if (params.payload.test_event_code) {
    eventRequest.setTestEventCode(params.payload.test_event_code);
  }

  const result = await eventRequest.execute();
  if (!isTransportResponse(result)) {
    const responsePayload = isRecord(result)
      ? (result as MetaBusinessSdkResponsePayload)
      : null;
    return {
      ok: true,
      status: 200,
      responsePayload,
      responseHeaders: {},
      graphApiVersion: META_GRAPH_API_VERSION,
      sdkVersion: runtimeVersion,
    };
  }

  return {
    ok: result.ok,
    status: result.status,
    responsePayload: result.body,
    responseHeaders: result.headers,
    graphApiVersion: META_GRAPH_API_VERSION,
    sdkVersion: runtimeVersion,
  };
}
