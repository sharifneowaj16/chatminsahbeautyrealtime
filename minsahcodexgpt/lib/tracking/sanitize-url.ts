const SENSITIVE_URL_PARAMS = [
  'bpt',
  'token',
  'access_token',
  'signature',
  'sig',
  'email',
  'phone',
  'mobile',
  'msisdn',
  'password',
  'key',
  'secret',
  'auth',
  'authorization',
];

const FALLBACK_ORIGIN = 'https://minsahbeauty.cloud';

function removeSensitiveParams(url: URL) {
  for (const param of SENSITIVE_URL_PARAMS) {
    url.searchParams.delete(param);
  }
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function sanitizeTrackingUrl(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  try {
    const absoluteInput = isAbsoluteUrl(trimmed);
    const url = new URL(trimmed, FALLBACK_ORIGIN);
    removeSensitiveParams(url);

    if (!absoluteInput) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

export function sanitizeTrackingPath(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed, FALLBACK_ORIGIN);
    removeSensitiveParams(url);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}

export function hasSensitiveUrlParam(value?: string | null): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;

  try {
    const url = new URL(trimmed, FALLBACK_ORIGIN);
    return SENSITIVE_URL_PARAMS.some((param) => url.searchParams.has(param));
  } catch {
    return false;
  }
}
