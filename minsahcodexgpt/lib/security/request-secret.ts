import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

function normalizedSecret(value?: string | null) {
  const secret = value?.trim();
  return secret || null;
}

/** Constant-time comparison that also handles differently sized strings safely. */
export function secureCompareText(left?: string | null, right?: string | null) {
  const normalizedLeft = normalizedSecret(left);
  const normalizedRight = normalizedSecret(right);
  if (!normalizedLeft || !normalizedRight) return false;

  const leftDigest = createHash('sha256').update(normalizedLeft).digest();
  const rightDigest = createHash('sha256').update(normalizedRight).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function extractBearerToken(authorizationHeader?: string | null) {
  const raw = authorizationHeader?.trim();
  if (!raw) return null;
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return (match?.[1] ?? raw).trim() || null;
}

export type SharedSecretAuthorizationResult = {
  ok: boolean;
  configured: boolean;
};

/**
 * Authorize internal/cron/webhook requests against one or more configured
 * secrets. Any configured secret may match (OR), preserving existing provider
 * behavior while removing duplicated and non-constant-time comparisons.
 */
export function authorizeSharedSecretRequest(
  request: NextRequest,
  options: {
    secrets: Array<string | null | undefined>;
    headerNames?: string[];
    allowAuthorizationHeader?: boolean;
    allowQueryParamInNonProduction?: boolean;
    queryParamName?: string;
    allowWhenUnconfiguredInNonProduction?: boolean;
  },
): SharedSecretAuthorizationResult {
  const secrets = [...new Set(options.secrets.map(normalizedSecret).filter(Boolean))] as string[];

  if (secrets.length === 0) {
    return {
      configured: false,
      ok:
        Boolean(options.allowWhenUnconfiguredInNonProduction) &&
        process.env.NODE_ENV !== 'production',
    };
  }

  const candidates: string[] = [];
  if (options.allowAuthorizationHeader !== false) {
    const bearer = extractBearerToken(request.headers.get('authorization'));
    if (bearer) candidates.push(bearer);
  }

  for (const headerName of options.headerNames ?? ['x-cron-secret']) {
    const value = normalizedSecret(request.headers.get(headerName));
    if (value) candidates.push(value);
  }

  if (
    options.allowQueryParamInNonProduction &&
    process.env.NODE_ENV !== 'production'
  ) {
    const queryValue = normalizedSecret(
      request.nextUrl.searchParams.get(options.queryParamName ?? 'secret'),
    );
    if (queryValue) candidates.push(queryValue);
  }

  return {
    configured: true,
    ok: candidates.some((candidate) =>
      secrets.some((secret) => secureCompareText(candidate, secret)),
    ),
  };
}

export function verifyHmacSha256Signature(params: {
  rawBody: string;
  signatureHeader?: string | null;
  secret?: string | null;
}) {
  const secret = normalizedSecret(params.secret);
  if (!secret) return { configured: false, verified: false } as const;

  const provided = params.signatureHeader
    ?.replace(/^sha256=/i, '')
    .trim();
  if (!provided || !/^[a-f0-9]{64}$/i.test(provided)) {
    return { configured: true, verified: false } as const;
  }

  const expected = createHmac('sha256', secret)
    .update(params.rawBody)
    .digest('hex');

  return {
    configured: true,
    verified: secureCompareText(expected, provided),
  } as const;
}
