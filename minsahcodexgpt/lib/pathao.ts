interface PathaoTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function getPathaoBaseUrl(): string {
  return (process.env.PATHAO_BASE_URL ?? 'https://courier-api-sandbox.pathao.com').replace(/\/+$/, '');
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

  const response = await fetch(`${getPathaoBaseUrl()}/aladdin/api/v1/issue-token`, {
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

export async function pathaoRequest<TResponse>(path: string, payload?: unknown): Promise<TResponse> {
  const token = await fetchPathaoToken();
  const response = await fetch(`${getPathaoBaseUrl()}${path}`, {
    method: payload === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Pathao API request failed (${response.status})`);
  }

  return (await response.json()) as TResponse;
}
