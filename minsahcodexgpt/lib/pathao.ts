interface PathaoTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

let cachedToken: { value: string; expiresAt: number } | null = null;
let cachedStores: { value: PathaoStore[]; expiresAt: number } | null = null;
type PathaoHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface PathaoStore {
  storeId: number;
  storeName: string | null;
  storeAddress: string | null;
  isActive: boolean;
  cityId: number | null;
  zoneId: number | null;
  hubId: number | null;
  isDefaultStore: boolean;
  isDefaultReturnStore: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function debugPathaoLog(message: string, details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.log(message, details);
}

export function getPathaoBaseUrl(): string {
  const defaultBaseUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://api-hermes.pathao.com'
      : 'https://courier-api-sandbox.pathao.com';

  return (process.env.PATHAO_BASE_URL ?? defaultBaseUrl).replace(/\/+$/, '');
}

async function fetchPathaoToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.value;
  }

  const clientId = process.env.PATHAO_CLIENT_ID;
  const clientSecret = process.env.PATHAO_CLIENT_SECRET;
  const username = process.env.PATHAO_USERNAME;
  const password = process.env.PATHAO_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error('Pathao credentials are not configured');
  }

  const baseUrl = getPathaoBaseUrl();
  const tokenPath = '/aladdin/api/v1/issue-token';
  const response = await fetch(`${baseUrl}${tokenPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      username,
      password,
      grant_type: 'password',
    }),
    cache: 'no-store',
  });

  debugPathaoLog('[Pathao] token request completed', {
    baseUrl,
    path: tokenPath,
    status: response.status,
  });

  if (!response.ok) {
    throw new Error(`Pathao token request failed (${response.status})`);
  }

  const data = (await response.json()) as { data?: PathaoTokenResponse } & PathaoTokenResponse;
  const token = data.data?.access_token ?? data.access_token;

  if (!token) {
    throw new Error('Pathao token missing in response');
  }

  const expiresInSec = data.data?.expires_in ?? data.expires_in ?? 3600;
  cachedToken = {
    value: token,
    expiresAt: now + expiresInSec * 1000,
  };

  return token;
}

export async function pathaoRequest<TResponse>(
  path: string,
  payload?: unknown,
  method?: PathaoHttpMethod
): Promise<TResponse> {
  const token = await fetchPathaoToken();
  const baseUrl = getPathaoBaseUrl();
  const requestMethod = method ?? (payload === undefined ? 'GET' : 'POST');
  const response = await fetch(`${baseUrl}${path}`, {
    method: requestMethod,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    cache: 'no-store',
  });

  debugPathaoLog('[Pathao] api request completed', {
    baseUrl,
    path,
    method: requestMethod,
    status: response.status,
  });

  if (!response.ok) {
    throw new Error(`Pathao API request failed (${response.status})`);
  }

  const data = (await response.json()) as TResponse;

  debugPathaoLog('[Pathao] api response shape', {
    path,
    keys: isRecord(data) ? Object.keys(data) : [],
  });

  return data;
}

export function extractPathaoArray<TItem>(value: unknown): TItem[] {
  let current = value;

  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current)) {
      return current as TItem[];
    }

    if (!isRecord(current) || !('data' in current)) {
      return [];
    }

    current = current.data;
  }

  return Array.isArray(current) ? (current as TItem[]) : [];
}

export function extractPathaoObject(value: unknown): Record<string, unknown> {
  let current = value;

  for (let depth = 0; depth < 4; depth += 1) {
    if (isRecord(current)) {
      const nested = current.data;
      if (isRecord(nested)) {
        current = nested;
        continue;
      }

      return current;
    }

    break;
  }

  return isRecord(current) ? current : {};
}

function normalizeBooleanFlag(value: unknown): boolean {
  return value === 1 || value === true || value === '1' || value === 'true';
}

function normalizeNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizePathaoStore(value: unknown): PathaoStore | null {
  if (!isRecord(value)) {
    return null;
  }

  const storeId = normalizeNumber(value.store_id ?? value.storeId ?? value.id);
  if (!storeId) {
    return null;
  }

  return {
    storeId,
    storeName: typeof value.store_name === 'string' ? value.store_name : null,
    storeAddress: typeof value.store_address === 'string' ? value.store_address : null,
    isActive: normalizeBooleanFlag(value.is_active),
    cityId: normalizeNumber(value.city_id),
    zoneId: normalizeNumber(value.zone_id),
    hubId: normalizeNumber(value.hub_id),
    isDefaultStore: normalizeBooleanFlag(value.is_default_store),
    isDefaultReturnStore: normalizeBooleanFlag(value.is_default_return_store),
  };
}

export async function fetchPathaoStores(): Promise<PathaoStore[]> {
  const now = Date.now();
  if (cachedStores && cachedStores.expiresAt > now) {
    return cachedStores.value;
  }

  const response = await pathaoRequest<unknown>('/aladdin/api/v1/stores', undefined, 'GET');
  const storesPayload = extractPathaoObject(response);
  const rawStores = Array.isArray(storesPayload.data) ? storesPayload.data : extractPathaoArray(response);
  const stores = rawStores
    .map(normalizePathaoStore)
    .filter((store): store is PathaoStore => !!store);

  cachedStores = {
    value: stores,
    expiresAt: now + 5 * 60 * 1000,
  };

  return stores;
}

export async function resolvePathaoStore(): Promise<{
  storeId: number;
  store: PathaoStore | null;
  source: 'env' | 'default_store' | 'first_active_store';
}> {
  const configuredStoreId = normalizeNumber(process.env.PATHAO_STORE_ID);
  let stores: PathaoStore[];
  try {
    stores = await fetchPathaoStores();
  } catch (error) {
    if (configuredStoreId) {
      return {
        storeId: configuredStoreId,
        store: null,
        source: 'env',
      };
    }

    throw error;
  }

  const activeStores = stores.filter((store) => store.isActive);

  if (configuredStoreId) {
    const configuredStore = stores.find((store) => store.storeId === configuredStoreId) ?? null;
    if (!configuredStore || configuredStore.isActive) {
      return {
        storeId: configuredStoreId,
        store: configuredStore,
        source: 'env',
      };
    }
  }

  const defaultStore = activeStores.find((store) => store.isDefaultStore) ?? null;
  if (defaultStore) {
    return {
      storeId: defaultStore.storeId,
      store: defaultStore,
      source: 'default_store',
    };
  }

  const firstActiveStore = activeStores[0] ?? null;
  if (firstActiveStore) {
    return {
      storeId: firstActiveStore.storeId,
      store: firstActiveStore,
      source: 'first_active_store',
    };
  }

  if (configuredStoreId) {
    return {
      storeId: configuredStoreId,
      store: null,
      source: 'env',
    };
  }

  throw new Error('No active Pathao store found');
}
