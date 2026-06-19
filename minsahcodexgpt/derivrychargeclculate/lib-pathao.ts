interface PathaoTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

let cachedToken: { value: string; expiresAt: number } | null = null;
type PathaoHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

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
