const BLOCKED_AUTH_LOOP_PREFIXES = ['/login', '/register', '/logout', '/forgot-password', '/reset-password', '/verify-otp'];

/**
 * Strictly allows only same-origin relative paths (e.g. "/account", "/shop?sort=newest").
 * Rejects protocol-relative URLs ("//evil.com"), external schemes, backslashes, and auth loops.
 */
export function sanitizeRedirectPath(
  raw: string | null | undefined,
  fallback = '/account'
): string {
  if (!raw || typeof raw !== 'string') return fallback;

  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 512) return fallback;
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('\\') || /[\r\n\t\0]/.test(trimmed)) return fallback;

  try {
    const parsed = new URL(trimmed, 'https://minsahbeauty.local');
    if (parsed.origin !== 'https://minsahbeauty.local') return fallback;

    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    const lowerPath = parsed.pathname.toLowerCase();
    if (
      BLOCKED_AUTH_LOOP_PREFIXES.some(
        (prefix) => lowerPath === prefix || lowerPath.startsWith(`${prefix}/`)
      )
    ) {
      return fallback;
    }

    return normalized;
  } catch {
    return fallback;
  }
}
