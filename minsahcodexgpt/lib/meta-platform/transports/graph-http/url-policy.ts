const PATH_SEGMENT_PATTERN = /^[A-Za-z0-9._~!$&'()*+,;=:@%-]+$/;
const VERSION_PATTERN = /^v\d{2,3}\.\d+$/;

export function assertMetaGraphBaseUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new TypeError('META_GRAPH_BASE_URL_INVALID');
  }
  if (url.hostname !== 'graph.facebook.com') throw new TypeError('META_GRAPH_BASE_HOST_NOT_ALLOWED');
  return url;
}

export function normalizeMetaGraphPath(path: string): string {
  const raw = path.trim();
  if (raw === '/') return '';
  if (!raw) throw new TypeError('META_GRAPH_PATH_REQUIRED');
  if (/^[a-z][a-z\d+.-]*:/i.test(raw) || raw.startsWith('//') || raw.includes('?') || raw.includes('#')) {
    throw new TypeError('META_GRAPH_PATH_ABSOLUTE_OR_DECORATED');
  }
  const segments = raw.replace(/^\/+/, '').split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..' || !PATH_SEGMENT_PATTERN.test(segment))) {
    throw new TypeError('META_GRAPH_PATH_INVALID');
  }
  return segments.join('/');
}

export function buildMetaGraphUrl(input: {
  readonly baseUrl: URL;
  readonly graphApiVersion: string;
  readonly path: string;
  readonly query?: Readonly<Record<string, string | number | boolean | readonly (string | number | boolean)[] | null | undefined>>;
}): URL {
  if (!VERSION_PATTERN.test(input.graphApiVersion)) throw new TypeError('META_GRAPH_VERSION_INVALID');
  const normalizedPath = normalizeMetaGraphPath(input.path);
  const url = new URL(`/${input.graphApiVersion}/${normalizedPath}`, input.baseUrl);
  for (const [key, value] of Object.entries(input.query ?? {})) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(key)) throw new TypeError('META_GRAPH_QUERY_KEY_INVALID');
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, Array.isArray(value) ? value.map(String).join(',') : String(value));
  }
  return url;
}

export function assertMetaGraphRelativeBatchPath(path: string): string {
  return normalizeMetaGraphPath(path);
}
