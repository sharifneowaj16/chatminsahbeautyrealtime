// lib/storage/minio.ts
// Server-only — never import this in client components
import { Client } from 'minio';
import { createLogger } from '@/lib/logger';

const logger = createLogger('storage:minio');

// ─── Singleton ──────────────────────────────────────────────────────────────
const globalForMinio = globalThis as unknown as { minio: Client | undefined };
const globalWithInit = globalThis as unknown as { minioInitialized: boolean | undefined };

function createMinioClient(): Client {
  const endpoint  = process.env.MINIO_ENDPOINT || 'localhost';
  const port      = parseInt(process.env.MINIO_PORT || '9000', 10);
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const useSSL    = process.env.MINIO_USE_SSL === 'true';

  if (!accessKey || !secretKey) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('MinIO credentials not set in production.');
      throw new Error('MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be set in production');
    }
    logger.warn('MinIO credentials not set. Using development defaults.');
  }

  return new Client({ endPoint: endpoint, port, useSSL, accessKey: accessKey || '', secretKey: secretKey || '' });
}

export const minio = globalForMinio.minio ?? createMinioClient();
globalForMinio.minio = minio;

export const BUCKET_NAME  = process.env.MINIO_BUCKET_NAME || 'minsah-beauty';
const PUBLIC_URL           = process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL || '';

// ─── Cache TTL (1 year — immutable product images) ──────────────────────────
// Browser + CDN দুটোই এই header দেখে cache করবে
const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

// ─── Bucket init ─────────────────────────────────────────────────────────────
export async function ensureBucketInitialized(): Promise<void> {
  if (globalWithInit.minioInitialized) return;
  globalWithInit.minioInitialized = true;
  try {
    await initializeBucket();
  } catch (error) {
    globalWithInit.minioInitialized = false;
    throw error;
  }
}

export async function initializeBucket(): Promise<void> {
  try {
    const exists = await minio.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minio.makeBucket(BUCKET_NAME, 'us-east-1');
      logger.info(`Bucket '${BUCKET_NAME}' created`);
    }

    const policy = {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [
          `arn:aws:s3:::${BUCKET_NAME}/products/*`,
          `arn:aws:s3:::${BUCKET_NAME}/categories/*`,
          `arn:aws:s3:::${BUCKET_NAME}/brands/*`,
          `arn:aws:s3:::${BUCKET_NAME}/avatars/*`,
          `arn:aws:s3:::${BUCKET_NAME}/banners/*`,
          `arn:aws:s3:::${BUCKET_NAME}/blog/*`,
          `arn:aws:s3:::${BUCKET_NAME}/media/*`,
          `arn:aws:s3:::${BUCKET_NAME}/uploads/*`,
        ],
      }],
    };

    await minio.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
    logger.info('MinIO bucket policy set');
  } catch (error) {
    logger.error('Failed to initialize MinIO bucket:', error);
    throw error;
  }
}

// ─── Image processing ────────────────────────────────────────────────────────
// sharp dynamically import করা হচ্ছে — server-only, bundle split নষ্ট না করে
interface ProcessedImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

/**
 * Product image process করে WebP-তে convert করে + resize করে।
 * - Max 1200×1200 (product gallery)
 * - WebP quality 82 — বেশিরভাগ ক্ষেত্রে 80-90% size কমে
 * - যদি sharp না থাকে, original return করে (graceful fallback)
 */
export async function processProductImage(
  inputBuffer: Buffer,
  originalContentType: string,
): Promise<ProcessedImage> {
  try {
    const sharp = (await import('sharp')).default;

    const webpBuffer = await sharp(inputBuffer)
      .resize(1200, 1200, {
        fit: 'inside',          // aspect ratio রাখে, crop করে না
        withoutEnlargement: true, // ছোট image কে বড় করে না
      })
      .webp({ quality: 82, effort: 4 }) // effort 4 = good compression, fast enough
      .toBuffer();

    logger.info(`Image processed: ${inputBuffer.length} → ${webpBuffer.length} bytes (WebP)`);

    return {
      buffer: webpBuffer,
      contentType: 'image/webp',
      extension: 'webp',
    };
  } catch (err) {
    // sharp fail হলে original দিয়ে চালিয়ে যাই
    logger.warn('sharp processing failed, using original:', err as Record<string, unknown>);
    return {
      buffer: inputBuffer,
      contentType: originalContentType,
      extension: originalContentType.split('/')[1] || 'jpg',
    };
  }
}

/**
 * Thumbnail process (64×64 — variant swatches, search results)
 */
export async function processThumbImage(inputBuffer: Buffer): Promise<ProcessedImage> {
  try {
    const sharp = (await import('sharp')).default;
    const thumbBuffer = await sharp(inputBuffer)
      .resize(200, 200, { fit: 'cover' })
      .webp({ quality: 75, effort: 3 })
      .toBuffer();
    return { buffer: thumbBuffer, contentType: 'image/webp', extension: 'webp' };
  } catch {
    return { buffer: inputBuffer, contentType: 'image/jpeg', extension: 'jpg' };
  }
}

// ─── Core upload ──────────────────────────────────────────────────────────────
/**
 * Raw upload (non-image files বা bypass করতে চাইলে)
 */
export async function uploadFile(
  file: Buffer,
  fileName: string,
  folder: string = 'uploads',
  contentType: string = 'application/octet-stream',
): Promise<{ key: string; url: string }> {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
  const key = `${folder}/${Date.now()}-${sanitizedName}`;

  await minio.putObject(BUCKET_NAME, key, file, file.length, {
    'Content-Type': contentType,
    // Cache headers — MinIO এগুলো object metadata হিসেবে store করে
    // এবং GET response-এ serve করে
    'Cache-Control': IMAGE_CACHE_CONTROL,
    'x-amz-meta-cache-control': IMAGE_CACHE_CONTROL,
  });

  return { key, url: getPublicUrl(key) };
}

/**
 * Product image upload — auto compress + WebP convert + cache headers
 */
export async function uploadProductImage(
  file: Buffer,
  productId: string,
  fileName: string,
  contentType: string = 'image/jpeg',
): Promise<{ key: string; url: string }> {
  const { buffer, contentType: newContentType, extension } = await processProductImage(file, contentType);

  // Extension replace করি — .png → .webp ইত্যাদি
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const newFileName = `${baseName}.${extension}`;
  const sanitizedName = newFileName.replace(/[^a-zA-Z0-9._-]/g, '-');
  const key = `products/${productId}/${Date.now()}-${sanitizedName}`;

  await minio.putObject(BUCKET_NAME, key, buffer, buffer.length, {
    'Content-Type': newContentType,
    'Cache-Control': IMAGE_CACHE_CONTROL,
    'x-amz-meta-cache-control': IMAGE_CACHE_CONTROL,
    'x-amz-meta-original-size': String(file.length),
  });

  logger.info(`Product image uploaded: key=${key}, size=${buffer.length}`);
  return { key, url: getPublicUrl(key) };
}

export async function uploadFileToFolder(
  file: Buffer,
  folder: string,
  fileName: string,
  contentType: string = 'application/octet-stream',
): Promise<{ key: string; url: string }> {
  return uploadFile(file, fileName, folder, contentType);
}

export async function uploadAvatar(
  file: Buffer,
  userId: string,
  fileName: string,
  contentType: string = 'image/jpeg',
): Promise<{ key: string; url: string }> {
  await deleteFolder(`avatars/${userId}`);

  const { buffer, contentType: newContentType, extension } = await processProductImage(file, contentType);
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const key = `avatars/${userId}/${Date.now()}-${baseName}.${extension}`;

  await minio.putObject(BUCKET_NAME, key, buffer, buffer.length, {
    'Content-Type': newContentType,
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600', // avatar — shorter TTL
  });

  return { key, url: getPublicUrl(key) };
}

export async function uploadCategoryImage(
  file: Buffer,
  categoryId: string,
  fileName: string,
  contentType: string = 'image/jpeg',
): Promise<{ key: string; url: string }> {
  const { buffer, contentType: ct, extension } = await processProductImage(file, contentType);
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const key = `categories/${categoryId}/${Date.now()}-${baseName}.${extension}`;
  await minio.putObject(BUCKET_NAME, key, buffer, buffer.length, {
    'Content-Type': ct,
    'Cache-Control': IMAGE_CACHE_CONTROL,
  });
  return { key, url: getPublicUrl(key) };
}

export async function uploadBrandLogo(
  file: Buffer,
  brandId: string,
  fileName: string,
  contentType: string = 'image/jpeg',
): Promise<{ key: string; url: string }> {
  const { buffer, contentType: ct, extension } = await processProductImage(file, contentType);
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const key = `brands/${brandId}/${Date.now()}-${baseName}.${extension}`;
  await minio.putObject(BUCKET_NAME, key, buffer, buffer.length, {
    'Content-Type': ct,
    'Cache-Control': IMAGE_CACHE_CONTROL,
  });
  return { key, url: getPublicUrl(key) };
}

export async function uploadBannerImage(
  file: Buffer,
  bannerId: string,
  fileName: string,
  contentType: string = 'image/jpeg',
): Promise<{ key: string; url: string }> {
  const { buffer, contentType: ct, extension } = await processProductImage(file, contentType);
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const key = `banners/${bannerId}/${Date.now()}-${baseName}.${extension}`;
  await minio.putObject(BUCKET_NAME, key, buffer, buffer.length, {
    'Content-Type': ct,
    'Cache-Control': IMAGE_CACHE_CONTROL,
  });
  return { key, url: getPublicUrl(key) };
}

export async function uploadBlogImage(
  file: Buffer,
  blogId: string,
  fileName: string,
  contentType: string = 'image/jpeg',
): Promise<{ key: string; url: string }> {
  const { buffer, contentType: ct, extension } = await processProductImage(file, contentType);
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const key = `blog/${blogId}/${Date.now()}-${baseName}.${extension}`;
  await minio.putObject(BUCKET_NAME, key, buffer, buffer.length, {
    'Content-Type': ct,
    'Cache-Control': IMAGE_CACHE_CONTROL,
  });
  return { key, url: getPublicUrl(key) };
}

export async function uploadMediaFile(
  file: Buffer,
  fileName: string,
  contentType: string = 'application/octet-stream',
): Promise<{ key: string; url: string }> {
  return uploadFile(file, fileName, 'media', contentType);
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteFile(key: string): Promise<void> {
  await minio.removeObject(BUCKET_NAME, key);
}

export async function deleteFolder(folder: string): Promise<void> {
  const objects = await listObjects(folder);
  const names = objects.map((o) => o.name);
  if (names.length > 0) await minio.removeObjects(BUCKET_NAME, names);
}

// ─── List ─────────────────────────────────────────────────────────────────────
export async function listObjects(
  prefix: string,
): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
  return new Promise((resolve, reject) => {
    const items: Array<{ name: string; size: number; lastModified: Date }> = [];
    const stream = minio.listObjects(BUCKET_NAME, prefix, true);
    stream.on('data', (obj) => items.push({ name: obj.name ?? '', size: obj.size ?? 0, lastModified: obj.lastModified ?? new Date() }));
    stream.on('error', reject);
    stream.on('end', () => resolve(items));
  });
}

export async function listAllObjects(
  prefix = '',
): Promise<Array<{ name: string; size: number; lastModified: Date; url: string }>> {
  const objects = await listObjects(prefix);
  return objects.map((o) => ({ ...o, url: getPublicUrl(o.name) }));
}

// ─── Presigned URLs ───────────────────────────────────────────────────────────
export async function getPresignedUploadUrl(key: string, expirySeconds = 3600): Promise<string> {
  return minio.presignedPutObject(BUCKET_NAME, key, expirySeconds);
}

export async function getPresignedDownloadUrl(key: string, expirySeconds = 3600): Promise<string> {
  return minio.presignedGetObject(BUCKET_NAME, key, expirySeconds);
}

// ─── Public URL ───────────────────────────────────────────────────────────────
export function getPublicUrl(key: string): string {
  if (PUBLIC_URL) {
    // trailing slash safe — double slash এড়ানোর জন্য
    const base = PUBLIC_URL.replace(/\/$/, '');
    return `${base}/${BUCKET_NAME}/${key}`;
  }
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port     = process.env.MINIO_PORT || '9000';
  const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
  return `${protocol}://${endpoint}:${port}/${BUCKET_NAME}/${key}`;
}

// ─── File info ────────────────────────────────────────────────────────────────
export async function getFileInfo(key: string): Promise<{ size: number; lastModified: Date; contentType: string } | null> {
  try {
    const stat = await minio.statObject(BUCKET_NAME, key);
    return {
      size: stat.size,
      lastModified: stat.lastModified,
      contentType: stat.metaData['content-type'] || 'application/octet-stream',
    };
  } catch (error) {
    if ((error as { code?: string }).code === 'NotFound') return null;
    throw error;
  }
}

export async function fileExists(key: string): Promise<boolean> {
  return (await getFileInfo(key)) !== null;
}

// ─── Validation ───────────────────────────────────────────────────────────────
export function validateImageUpload(
  file: { size: number; type: string },
  maxSizeMB = 10,
): { valid: boolean; error?: string } {
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) return { valid: false, error: `Image must be ${maxSizeMB}MB or smaller` };

  // avif ও accept করি এখন
  const allowed = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
  if (!allowed.has(file.type)) return { valid: false, error: 'Only JPEG, PNG, WebP, AVIF, GIF allowed' };

  return { valid: true };
}

export default minio;
