import type { NextRequest } from 'next/server';

export type AdminCsrfDecision = Readonly<{
  allowed: boolean;
  reasonCode: string;
}>;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function requestOrigin(request: NextRequest): string {
  return request.nextUrl.origin.toLowerCase();
}

export function evaluateAdminCsrf(request: NextRequest): AdminCsrfDecision {
  const method = request.method.toUpperCase();
  if (SAFE_METHODS.has(method)) return Object.freeze({ allowed: true, reasonCode: 'SAFE_METHOD' });

  const authorization = request.headers.get('authorization')?.trim() ?? '';
  if (/^Bearer\s+\S+$/i.test(authorization)) {
    return Object.freeze({ allowed: true, reasonCode: 'BEARER_AUTH' });
  }

  const marker = request.headers.get('x-admin-request');
  if (marker !== '1') return Object.freeze({ allowed: false, reasonCode: 'ADMIN_CSRF_HEADER_REQUIRED' });

  const directOrigin = request.headers.get('origin')?.trim().toLowerCase() ?? '';
  const referer = request.headers.get('referer')?.trim() ?? '';
  let refererOrigin = '';
  try { refererOrigin = referer ? new URL(referer).origin.toLowerCase() : ''; } catch { refererOrigin = ''; }
  const origin = directOrigin || refererOrigin;
  if (!origin || origin !== requestOrigin(request)) {
    return Object.freeze({ allowed: false, reasonCode: 'ADMIN_CSRF_ORIGIN_MISMATCH' });
  }

  const fetchSite = request.headers.get('sec-fetch-site')?.trim().toLowerCase();
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return Object.freeze({ allowed: false, reasonCode: 'ADMIN_CSRF_FETCH_SITE_BLOCKED' });
  }

  return Object.freeze({ allowed: true, reasonCode: 'SAME_ORIGIN_ADMIN_REQUEST' });
}
