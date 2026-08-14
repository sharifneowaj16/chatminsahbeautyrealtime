import 'server-only';

import type { MetaDownloadedMedia, MetaMediaMalwareScanner, MetaPrivateMediaStore, MetaStoredMedia } from './types';

export async function storeMetaMediaSecurely(input: {
  readonly media: MetaDownloadedMedia;
  readonly scanner: MetaMediaMalwareScanner;
  readonly store: MetaPrivateMediaStore;
  readonly storageKey: string;
  readonly metadata?: Readonly<Record<string, string>>;
}): Promise<MetaStoredMedia> {
  if (!/^[A-Za-z0-9][A-Za-z0-9/_.-]{0,500}$/.test(input.storageKey) || input.storageKey.includes('..')) {
    throw new TypeError('META_MEDIA_STORAGE_KEY_INVALID');
  }
  const scan = await input.scanner.scan({ bytes: input.media.bytes, mimeType: input.media.mimeType, fileName: input.media.fileName });
  if (scan.result !== 'CLEAN') throw new Error(scan.result === 'INFECTED' ? 'META_MEDIA_MALWARE_DETECTED' : 'META_MEDIA_SCAN_FAILED');
  const stored = await input.store.put({
    key: input.storageKey,
    bytes: input.media.bytes,
    mimeType: input.media.mimeType,
    metadata: Object.freeze({
      sourceDigest: input.media.digest,
      scanResult: 'CLEAN',
      ...(scan.engine ? { scanEngine: scan.engine.slice(0, 100) } : {}),
      ...(input.metadata ?? {}),
    }),
  });
  if (stored.key !== input.storageKey || stored.size !== input.media.size) throw new Error('META_MEDIA_STORAGE_VERIFICATION_FAILED');
  return Object.freeze({ storageKey: stored.key, size: stored.size, mimeType: input.media.mimeType, digest: input.media.digest, scanResult: 'CLEAN' });
}
