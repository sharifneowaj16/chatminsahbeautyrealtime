import 'server-only';
import type { MetaConnectionBootstrap } from './config';
import type { MetaGraphClient } from './client';
import { isAssetNotFoundError, safeMetaConnectionError } from './errors';
import type { MetaAssetHealth, MetaAssetKey } from './types';

type GraphNode = { id?: string; name?: string; username?: string };

type AssetDescriptor = {
  key: MetaAssetKey;
  id?: string;
  path?: string;
  fields: string;
  token?: string;
};

function normalizeId(value: string) {
  return value.startsWith('act_') ? value.slice(4) : value;
}

async function verifyAsset(client: MetaGraphClient, descriptor: AssetDescriptor): Promise<MetaAssetHealth> {
  if (!descriptor.id || !descriptor.path) {
    return { configured: false, ok: true, status: 'UNCONFIGURED', id: null };
  }
  try {
    const node = await client.get<GraphNode>(descriptor.path, { fields: descriptor.fields }, descriptor.token);
    if (!node.id || normalizeId(node.id) !== normalizeId(descriptor.id)) {
      return {
        configured: true,
        ok: false,
        status: 'ASSET_NOT_FOUND',
        id: descriptor.id,
        error: { code: 'META_ASSET_ID_MISMATCH', message: 'Meta returned a different asset identifier.' },
      };
    }
    return {
      configured: true,
      ok: true,
      status: 'HEALTHY',
      id: descriptor.id,
      name: node.name ?? node.username ?? null,
    };
  } catch (error) {
    const safe = safeMetaConnectionError(error, 'META_ASSET_CHECK_FAILED');
    return {
      configured: true,
      ok: false,
      status: isAssetNotFoundError(safe) ? 'ASSET_NOT_FOUND' : 'ERROR',
      id: descriptor.id,
      error: { code: safe.code, message: safe.message, subcode: safe.subcode, traceId: safe.traceId },
    };
  }
}

export async function verifyMetaAssets(input: {
  client: MetaGraphClient;
  config: MetaConnectionBootstrap;
}) {
  const c = input.config;
  const descriptors: AssetDescriptor[] = [
    { key: 'app', id: c.appId, path: c.appId ? `/${c.appId}` : undefined, fields: 'id,name' },
    { key: 'business', id: c.businessId, path: c.businessId ? `/${c.businessId}` : undefined, fields: 'id,name,verification_status' },
    { key: 'catalog', id: c.catalogId, path: c.catalogId ? `/${c.catalogId}` : undefined, fields: 'id,name,vertical,business' },
    { key: 'dataset', id: c.datasetId, path: c.datasetId ? `/${c.datasetId}` : undefined, fields: 'id,name' },
    { key: 'pixel', id: c.pixelId, path: c.pixelId ? `/${c.pixelId}` : undefined, fields: 'id,name' },
    { key: 'page', id: c.pageId, path: c.pageId ? `/${c.pageId}` : undefined, fields: 'id,name,tasks', token: c.pageAccessToken },
    { key: 'adAccount', id: c.adAccountId, path: c.adAccountId ? `/${c.adAccountId}` : undefined, fields: 'id,name,account_status,currency' },
    { key: 'instagramAccount', id: c.instagramAccountId, path: c.instagramAccountId ? `/${c.instagramAccountId}` : undefined, fields: 'id,username' },
  ];
  const entries = await Promise.all(descriptors.map(async (descriptor) => [descriptor.key, await verifyAsset(input.client, descriptor)] as const));
  return Object.fromEntries(entries) as Record<MetaAssetKey, MetaAssetHealth>;
}
