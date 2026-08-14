const SENSITIVE_KEY = /(email|e-mail|phone|mobile|name|address|street|city|state|zip|postal|country|ip_address|client_ip|user_agent|authorization|access.?token|secret|password|rawPayload|fieldData)/i;
const EMAIL_VALUE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_VALUE = /(?:\+?88)?01[3-9]\d{8}/g;
const TOKEN_VALUE = /\b(?:EA[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._~-]{16,})\b/gi;

export function redactPiiString(value: string) {
  return value
    .replace(EMAIL_VALUE, '[REDACTED_EMAIL]')
    .replace(PHONE_VALUE, '[REDACTED_PHONE]')
    .replace(TOKEN_VALUE, '[REDACTED_SECRET]');
}

export function redactOperationalPayload(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[REDACTED_DEPTH_LIMIT]';
  if (typeof value === 'string') return redactPiiString(value);
  if (Array.isArray(value)) return value.map((item) => redactOperationalPayload(item, depth + 1));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
    key,
    SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactOperationalPayload(entry, depth + 1),
  ]));
}

export function findRawPiiPaths(value: unknown, path = '$', found: string[] = []): string[] {
  if (typeof value === 'string') {
    if (EMAIL_VALUE.test(value) || PHONE_VALUE.test(value) || TOKEN_VALUE.test(value)) found.push(path);
    EMAIL_VALUE.lastIndex = 0;
    PHONE_VALUE.lastIndex = 0;
    TOKEN_VALUE.lastIndex = 0;
    return found;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => findRawPiiPaths(item, `${path}[${index}]`, found));
    return found;
  }
  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      if (SENSITIVE_KEY.test(key) && typeof entry === 'string' && entry && !/^\[REDACTED/.test(entry)) {
        found.push(`${path}.${key}`);
      } else {
        findRawPiiPaths(entry, `${path}.${key}`, found);
      }
    });
  }
  return Array.from(new Set(found));
}
