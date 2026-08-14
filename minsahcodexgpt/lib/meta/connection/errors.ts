export type SafeMetaConnectionError = {
  code: string;
  message: string;
  subcode?: string | number;
  traceId?: string;
  httpStatus?: number;
};

const TOKEN_PATTERNS = [
  /EA[A-Za-z0-9_-]{20,}/g,
  /Bearer\s+[A-Za-z0-9._|:-]+/gi,
  /access_token=[^&\s]+/gi,
  /input_token=[^&\s]+/gi,
  /appsecret_proof=[^&\s]+/gi,
];

export function redactMetaSecrets(value: string) {
  return TOKEN_PATTERNS.reduce((current, pattern) => current.replace(pattern, '[REDACTED]'), value);
}

export function safeMetaConnectionError(error: unknown, fallbackCode = 'META_CONNECTION_ERROR'): SafeMetaConnectionError {
  const candidate = error as {
    message?: unknown;
    code?: unknown;
    subcode?: unknown;
    traceId?: unknown;
    httpStatus?: unknown;
    status?: unknown;
  };
  return {
    code: typeof candidate?.code === 'string' || typeof candidate?.code === 'number'
      ? String(candidate.code)
      : fallbackCode,
    message: redactMetaSecrets(typeof candidate?.message === 'string' ? candidate.message : 'Meta connection request failed'),
    subcode: typeof candidate?.subcode === 'string' || typeof candidate?.subcode === 'number' ? candidate.subcode : undefined,
    traceId: typeof candidate?.traceId === 'string' ? candidate.traceId : undefined,
    httpStatus: typeof candidate?.httpStatus === 'number'
      ? candidate.httpStatus
      : typeof candidate?.status === 'number'
        ? candidate.status
        : undefined,
  };
}

export function isInvalidTokenError(error: SafeMetaConnectionError) {
  return error.code === '190' || error.subcode === 463 || error.subcode === 467;
}

export function isAssetNotFoundError(error: SafeMetaConnectionError) {
  return error.code === '100' || error.code === '803' || error.httpStatus === 404;
}
