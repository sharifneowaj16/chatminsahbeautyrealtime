import 'server-only';

import { createHash } from 'node:crypto';
import path from 'node:path';
import { assertPublicMetaMediaHost, parseAndValidateMetaMediaUrl } from './url-policy';
import { detectMetaMediaMimeType, isMetaMediaMimeAllowed, normalizeMetaMediaMimeType } from './mime';
import type { MetaDownloadedMedia, MetaMediaDownloadOptions } from './types';

function clamp(value: number | undefined, fallback: number, min: number, max: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? Number(value) : fallback, min), max);
}

function safeFileName(url: URL, mimeType: string): string {
  const base = path.basename(decodeURIComponent(url.pathname)) || `meta-media-${Date.now()}`;
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 160);
  if (cleaned.includes('.')) return cleaned;
  const extension = mimeType === 'image/jpeg' ? '.jpg' : mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : mimeType === 'video/mp4' ? '.mp4' : mimeType === 'application/pdf' ? '.pdf' : '';
  return `${cleaned || 'meta-media'}${extension}`;
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<Buffer> {
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error('META_MEDIA_SIZE_BLOCKED');
  if (!response.body) throw new Error('META_MEDIA_BODY_MISSING');
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel('META_MEDIA_SIZE_BLOCKED').catch(() => undefined);
      throw new Error('META_MEDIA_SIZE_BLOCKED');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function downloadMetaMedia(options: MetaMediaDownloadOptions): Promise<MetaDownloadedMedia> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxBytes = clamp(options.maxBytes, 25 * 1024 * 1024, 1_024, 100 * 1024 * 1024);
  const timeoutMs = clamp(options.timeoutMs, 30_000, 1_000, 120_000);
  const maxRedirects = clamp(options.maxRedirects, 3, 0, 5);
  const sourceUrl = parseAndValidateMetaMediaUrl(options.url, options.allowedHosts);
  let currentUrl = sourceUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    await assertPublicMetaMediaHost({ url: currentUrl, resolver: options.resolver });
    const controller = new AbortController();
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error('META_MEDIA_TIMEOUT')), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(currentUrl, {
        method: 'GET',
        headers: { Accept: '*/*', ...(options.authorization && currentUrl.origin === sourceUrl.origin ? { Authorization: options.authorization } : {}) },
        cache: 'no-store',
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
    if (response.status >= 300 && response.status < 400) {
      if (redirectCount === maxRedirects) throw new Error('META_MEDIA_REDIRECT_LIMIT');
      const location = response.headers.get('location');
      if (!location) throw new Error('META_MEDIA_REDIRECT_LOCATION_MISSING');
      currentUrl = parseAndValidateMetaMediaUrl(new URL(location, currentUrl).toString(), options.allowedHosts);
      continue;
    }
    if (!response.ok) throw new Error(`META_MEDIA_HTTP_${response.status}`);
    const declaredMime = normalizeMetaMediaMimeType(response.headers.get('content-type'));
    if (!isMetaMediaMimeAllowed({ mimeType: declaredMime, allowedMimeTypes: options.allowedMimeTypes, allowedMimePrefixes: options.allowedMimePrefixes })) {
      throw new Error('META_MEDIA_MIME_BLOCKED');
    }
    const bytes = await readBoundedBody(response, maxBytes);
    const detectedMimeType = detectMetaMediaMimeType(bytes);
    if (detectedMimeType && declaredMime !== 'application/octet-stream' && detectedMimeType !== declaredMime) {
      throw new Error('META_MEDIA_MIME_MISMATCH');
    }
    const mimeType = detectedMimeType ?? declaredMime;
    if (!isMetaMediaMimeAllowed({ mimeType, allowedMimeTypes: options.allowedMimeTypes, allowedMimePrefixes: options.allowedMimePrefixes })) {
      throw new Error('META_MEDIA_MIME_BLOCKED');
    }
    return Object.freeze({
      sourceUrl: sourceUrl.toString(),
      finalUrl: currentUrl.toString(),
      bytes,
      mimeType,
      detectedMimeType,
      fileName: safeFileName(currentUrl, mimeType),
      size: bytes.byteLength,
      digest: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  throw new Error('META_MEDIA_REDIRECT_LIMIT');
}
