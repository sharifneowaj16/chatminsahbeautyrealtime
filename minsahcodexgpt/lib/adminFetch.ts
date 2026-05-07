'use client';

type AdminFetchInit = RequestInit & {
  json?: unknown;
  redirectOnUnauthorized?: boolean;
  retryOnUnauthorized?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

function buildAdminRequestInit(init: AdminFetchInit = {}): RequestInit {
  const { json, redirectOnUnauthorized, retryOnUnauthorized, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);
  let body = requestInit.body;

  if (json !== undefined) {
    body = JSON.stringify(json);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  return {
    ...requestInit,
    headers,
    body,
    credentials: 'include',
  };
}

async function refreshAdminSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/admin/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const loginUrl = new URL('/admin/login', window.location.origin);
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (currentPath && window.location.pathname !== '/admin/login') {
    loginUrl.searchParams.set('redirect', currentPath);
  }
  window.location.assign(loginUrl.toString());
}

function handleUnauthorized(redirectOnUnauthorized: boolean | undefined): never {
  if (redirectOnUnauthorized !== false) {
    redirectToLogin();
  }

  throw new Error('Unauthorized');
}

export async function adminFetch(
  input: RequestInfo | URL,
  init: AdminFetchInit = {}
): Promise<Response> {
  const response = await fetch(input, buildAdminRequestInit(init));

  if (response.status !== 401 || init.retryOnUnauthorized === false) {
    return response;
  }

  const refreshed = await refreshAdminSession();
  if (!refreshed) {
    handleUnauthorized(init.redirectOnUnauthorized);
  }

  const retryResponse = await fetch(input, buildAdminRequestInit({
    ...init,
    retryOnUnauthorized: false,
  }));

  if (retryResponse.status === 401) {
    handleUnauthorized(init.redirectOnUnauthorized);
  }

  return retryResponse;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function adminFetchJson<T>(
  input: RequestInfo | URL,
  init: AdminFetchInit = {}
): Promise<T> {
  const response = await adminFetch(input, init);
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}
