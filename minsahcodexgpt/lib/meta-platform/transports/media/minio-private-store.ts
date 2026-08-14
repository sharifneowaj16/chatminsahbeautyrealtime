import 'server-only';

import { BUCKET_NAME, ensureBucketInitialized, minio } from '@/lib/storage/minio';
import type { MetaPrivateMediaStore } from './types';

export function createMetaPrivateMinioStore(): MetaPrivateMediaStore {
  const store: MetaPrivateMediaStore = {
    async put(input) {
      await ensureBucketInitialized();
      await minio.putObject(BUCKET_NAME, input.key, input.bytes, input.bytes.length, {
        'Content-Type': input.mimeType,
        'Cache-Control': 'private, no-store, max-age=0',
        'x-amz-meta-cache-control': 'private, no-store, max-age=0',
        ...Object.fromEntries(Object.entries(input.metadata).map(([key, value]) => [`x-amz-meta-${key.toLowerCase()}`, value.slice(0, 512)])),
      });
      const stat = await minio.statObject(BUCKET_NAME, input.key);
      if (Number(stat.size) !== input.bytes.length) throw new Error('META_MEDIA_STORAGE_VERIFICATION_FAILED');
      return Object.freeze({ key: input.key, size: Number(stat.size) });
    },
  };
  return Object.freeze(store);
}
