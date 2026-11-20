import 'server-only';

import { createEnvironmentMetaCredentialProvider } from '../../credentials/environment-provider';
import type { MetaCredentialProvider } from '../../credentials/types';
import { getMetaPlatformConnectionConfig } from '../connection/config';
import { MetaBusinessSdkClientFactory } from '../../transports/business-sdk/client-factory';
import { MetaGraphHttpClient } from '../../transports/graph-http/client';
import {
  createMetaCatalogProductSet,
  createMetaOwnedCatalog,
  createMetaProductFeed,
  listMetaCatalogProducts,
  listMetaCatalogProductSets,
  listMetaOwnedCatalogs,
  scheduleMetaProductFeed,
  submitMetaCatalogItemsBatch,
  updateMetaCatalog,
  updateMetaCatalogProductSet,
  uploadMetaProductFeed,
} from '../../transports/business-sdk/adapters/catalog';
import { normalizeCatalogBatchItemOutcomes, normalizeCatalogBatchStatus, objectValue } from './normalization';
import type { MetaCatalogBatchStatusResult } from './types';

export const META_CATALOG_FIELDS = Object.freeze([
  'id', 'name', 'vertical', 'product_count', 'feed_count', 'business',
  'commerce_merchant_settings', 'catalog_segment_filter', 'default_image_url',
]);
export const META_PRODUCT_SET_FIELDS = Object.freeze(['id', 'name', 'filter', 'product_count', 'product_catalog']);

export type MetaPlatformCatalogConfig = Readonly<{
  connectionKey: string;
  graphApiVersion: string;
  businessId: string;
  catalogId: string;
}>;

export function getMetaPlatformCatalogConfig(env: NodeJS.ProcessEnv = process.env): MetaPlatformCatalogConfig {
  const connection = getMetaPlatformConnectionConfig(env);
  if (!connection.businessId) throw new Error('META_BUSINESS_ID_REQUIRED');
  if (!connection.catalogId) throw new Error('META_CATALOG_ID_REQUIRED');
  return Object.freeze({
    connectionKey: connection.connectionName,
    graphApiVersion: connection.graphApiVersion,
    businessId: connection.businessId,
    catalogId: connection.catalogId,
  });
}

function cleanObject(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== undefined));
}
type MetaGraphResult = { readonly ok: true; readonly value: { readonly data: unknown } } | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } };
function unwrapGraph<T>(result: MetaGraphResult): T {
  if (!result.ok) throw Object.assign(new Error(result.error.message), { code: result.error.code, metaError: result.error });
  return result.value.data as T;
}

export class MetaPlatformCatalogService {
  readonly #credentials: MetaCredentialProvider;
  readonly #factory: MetaBusinessSdkClientFactory;
  readonly #config: MetaPlatformCatalogConfig;

  constructor(input: { readonly credentialProvider?: MetaCredentialProvider; readonly config?: MetaPlatformCatalogConfig } = {}) {
    this.#credentials = input.credentialProvider ?? createEnvironmentMetaCredentialProvider();
    this.#factory = new MetaBusinessSdkClientFactory({ credentialProvider: this.#credentials, appCredentialProvider: this.#credentials });
    this.#config = input.config ?? getMetaPlatformCatalogConfig();
  }

  get config() { return this.#config; }

  async #client(correlationId?: string) {
    return this.#factory.getClient({ capability: 'catalog-commerce', connectionKey: this.#config.connectionKey, credentialRole: 'BUSINESS_SYSTEM_USER', graphApiVersion: this.#config.graphApiVersion, correlationId });
  }
  #graph() {
    return new MetaGraphHttpClient({ credentialProvider: this.#credentials, appCredentialProvider: this.#credentials });
  }
  #catalogId(value?: string) { return value?.trim() || this.#config.catalogId; }

  async listCatalogs(fields: readonly string[] = META_CATALOG_FIELDS, params: Record<string, unknown> = {}, correlationId?: string) {
    return listMetaOwnedCatalogs(await this.#client(correlationId), { businessId: this.#config.businessId, fields, params });
  }
  async createCatalog(input: { name: string; vertical?: string }, correlationId?: string) {
    return createMetaOwnedCatalog(await this.#client(correlationId), { businessId: this.#config.businessId, fields: META_CATALOG_FIELDS, params: { name: input.name, vertical: input.vertical ?? 'commerce' } });
  }
  async updateCatalog(catalogId: string, input: Record<string, unknown>, correlationId?: string) {
    return updateMetaCatalog(await this.#client(correlationId), { catalogId, fields: META_CATALOG_FIELDS, params: cleanObject(input) });
  }
  async listProducts(catalogId: string | undefined, fields: readonly string[], params: Record<string, unknown> = {}, correlationId?: string) {
    return listMetaCatalogProducts(await this.#client(correlationId), { catalogId: this.#catalogId(catalogId), fields, params });
  }
  async submitItemsBatch(input: { catalogId?: string; requests: readonly Record<string, unknown>[]; correlationId?: string }) {
    return submitMetaCatalogItemsBatch(await this.#client(input.correlationId), { catalogId: this.#catalogId(input.catalogId), requests: input.requests });
  }
  async checkBatchStatus(input: { catalogId?: string; handle: string; correlationId?: string }): Promise<MetaCatalogBatchStatusResult> {
    const catalogId = this.#catalogId(input.catalogId);
    const payload = unwrapGraph<unknown>(await this.#graph().request({
      method: 'GET',
      path: `${encodeURIComponent(catalogId)}/check_batch_request_status`,
      query: { handle: input.handle },
      capability: 'catalog-commerce',
      connectionKey: this.#config.connectionKey,
      credentialRole: 'BUSINESS_SYSTEM_USER',
      graphApiVersion: this.#config.graphApiVersion,
      operation: 'catalog.check_batch_request_status',
      correlationId: input.correlationId,
      timeoutMs: 30_000,
    }));
    const root = objectValue(payload);
    const first = Array.isArray(root?.data) ? objectValue(root.data[0]) : root;
    const rawStatus = first?.status ?? first?.validation_status ?? first?.state;
    const errors = first?.errors ?? first?.error ?? root?.errors ?? null;
    return Object.freeze({
      handle: input.handle,
      catalogId,
      status: normalizeCatalogBatchStatus(rawStatus),
      rawStatus: typeof rawStatus === 'string' ? rawStatus : null,
      errors,
      itemOutcomes: normalizeCatalogBatchItemOutcomes(payload),
      response: payload,
    });
  }
  async createProductFeed(input: { catalogId?: string; name: string; country?: string; locale?: string; defaultCurrency?: string }, correlationId?: string) {
    return createMetaProductFeed(await this.#client(correlationId), { catalogId: this.#catalogId(input.catalogId), fields: ['id', 'name'], params: {
      name: input.name, country: input.country ?? 'BD', locale: input.locale ?? 'en_US', default_currency: input.defaultCurrency ?? 'BDT',
    } });
  }
  async uploadProductFeed(input: { feedId: string; url: string }, correlationId?: string) {
    return uploadMetaProductFeed(await this.#client(correlationId), { feedId: input.feedId, fields: ['id'], params: { url: input.url } });
  }
  async scheduleProductFeed(input: { feedId: string; url: string; interval?: string; hour?: number; minute?: number; dayOfWeek?: string }, correlationId?: string) {
    return scheduleMetaProductFeed(await this.#client(correlationId), { feedId: input.feedId, fields: ['id'], params: cleanObject({
      url: input.url, interval: input.interval ?? 'DAILY', hour: input.hour ?? 2, minute: input.minute ?? 0, day_of_week: input.dayOfWeek,
    }) });
  }
  async listProductSets(catalogId?: string, correlationId?: string) {
    return listMetaCatalogProductSets(await this.#client(correlationId), { catalogId: this.#catalogId(catalogId), fields: META_PRODUCT_SET_FIELDS, params: { limit: 200 } });
  }
  async upsertProductSet(input: { catalogId: string; providerProductSetId?: string | null; name: string; filter: Record<string, unknown> }, correlationId?: string) {
    const client = await this.#client(correlationId);
    return input.providerProductSetId
      ? updateMetaCatalogProductSet(client, { productSetId: input.providerProductSetId, fields: META_PRODUCT_SET_FIELDS, params: { name: input.name, filter: input.filter } })
      : createMetaCatalogProductSet(client, { catalogId: input.catalogId, fields: META_PRODUCT_SET_FIELDS, params: { name: input.name, filter: input.filter } });
  }
  async fetchDiagnostics(input: { catalogId?: string; limit?: number; correlationId?: string }) {
    const catalogId = this.#catalogId(input.catalogId);
    const limit = Math.max(1, Math.min(input.limit ?? 100, 100));
    const rows: unknown[] = [];
    const seenCursors = new Set<string>();
    let after: string | null = null;
    let pages = 0;
    while (pages < 10) {
      const payload = unwrapGraph<unknown>(await this.#graph().request({
        method: 'GET', path: `${encodeURIComponent(catalogId)}/diagnostics`,
        query: { limit, fields: 'type,severity,title,description,actionable_description,number_of_affected_items,sample_affected_items', ...(after ? { after } : {}) },
        capability: 'catalog-commerce', connectionKey: this.#config.connectionKey, credentialRole: 'BUSINESS_SYSTEM_USER', graphApiVersion: this.#config.graphApiVersion,
        operation: 'catalog.diagnostics', correlationId: input.correlationId, timeoutMs: 30_000,
      }));
      const root = objectValue(payload);
      if (Array.isArray(root?.data)) rows.push(...root.data);
      const cursors = objectValue(objectValue(root?.paging)?.cursors);
      const next = typeof cursors?.after === 'string' && cursors.after.trim() ? cursors.after.trim() : null;
      pages += 1;
      if (!next || !Array.isArray(root?.data) || root.data.length === 0) break;
      if (seenCursors.has(next)) throw new Error('META_GRAPH_PAGINATION_CURSOR_LOOP');
      seenCursors.add(next);
      after = next;
    }
    return Object.freeze({ catalogId, rows: Object.freeze(rows), pages });
  }
}
