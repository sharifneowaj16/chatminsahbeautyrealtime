#!/usr/bin/env tsx
/**
 * scripts/recompressImages.ts
 *
 * Existing MinIO-তে যে PNG/JPEG images আছে সেগুলো WebP-তে convert করে
 * re-upload করে + Cache-Control header যোগ করে।
 *
 * Usage:
 *   npx tsx scripts/recompressImages.ts
 *   npx tsx scripts/recompressImages.ts --folder products --dry-run
 *
 * Options:
 *   --folder <name>   শুধু এই folder process করবে (default: products)
 *   --dry-run         কিছু upload করবে না, শুধু report করবে
 *   --limit <n>       max N images process করবে
 */

import 'dotenv/config';
import { Client } from 'minio';
import sharp from 'sharp';

// ─── Config ────────────────────────────────────────────────────────────────
const BUCKET      = process.env.MINIO_BUCKET_NAME || 'minsah-beauty';
const ENDPOINT    = process.env.MINIO_ENDPOINT    || 'localhost';
const PORT        = parseInt(process.env.MINIO_PORT || '9000', 10);
const USE_SSL     = process.env.MINIO_USE_SSL === 'true';
const ACCESS_KEY  = process.env.MINIO_ACCESS_KEY  || '';
const SECRET_KEY  = process.env.MINIO_SECRET_KEY  || '';

const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const MAX_DIMENSION = 1200;
const WEBP_QUALITY  = 82;
const BATCH_SIZE    = 5;

// ─── Args ──────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const dryRun   = args.includes('--dry-run');
const folder   = args.includes('--folder') ? args[args.indexOf('--folder') + 1] : 'products';
const limitArg = args.includes('--limit')  ? parseInt(args[args.indexOf('--limit') + 1]) : Infinity;

// ─── MinIO client ──────────────────────────────────────────────────────────
const client = new Client({
  endPoint:  ENDPOINT,
  port:      PORT,
  useSSL:    USE_SSL,
  accessKey: ACCESS_KEY,
  secretKey: SECRET_KEY,
});

// ─── Helpers ───────────────────────────────────────────────────────────────
function listObjects(prefix: string): Promise<Array<{ name: string; size: number }>> {
  return new Promise((resolve, reject) => {
    const items: Array<{ name: string; size: number }> = [];
    const stream = client.listObjects(BUCKET, prefix, true);
    stream.on('data', (obj) => items.push({ name: obj.name ?? '', size: obj.size ?? 0 }));
    stream.on('error', reject);
    stream.on('end', () => resolve(items));
  });
}

// minio v8+ — getObject এখন Promise<stream> return করে, callback নেই
async function getObject(key: string): Promise<Buffer> {
  const stream = await client.getObject(BUCKET, key);
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function isImage(key: string): boolean {
  const ext = key.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'tiff', 'bmp'].includes(ext ?? '');
}

function isAlreadyWebp(key: string): boolean {
  return key.toLowerCase().endsWith('.webp');
}

function getWebpKey(key: string): string {
  return key.replace(/\.[^.]+$/, '.webp');
}

// ─── Process single image ──────────────────────────────────────────────────
interface Result {
  key: string;
  status: 'converted' | 'skipped' | 'error' | 'dry-run';
  originalSize: number;
  newSize?: number;
  savings?: string;
  error?: string;
}

async function processImage(key: string, originalSize: number): Promise<Result> {
  if (isAlreadyWebp(key)) {
    return { key, status: 'skipped', originalSize };
  }

  if (!isImage(key)) {
    return { key, status: 'skipped', originalSize };
  }

  try {
    const buffer = await getObject(key);

    const webpBuffer = await sharp(buffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();

    const webpKey = getWebpKey(key);
    const savings = (((originalSize - webpBuffer.length) / originalSize) * 100).toFixed(1);

    if (!dryRun) {
      await client.putObject(BUCKET, webpKey, webpBuffer, webpBuffer.length, {
        'Content-Type': 'image/webp',
        'Cache-Control': CACHE_CONTROL,
        'x-amz-meta-cache-control': CACHE_CONTROL,
        'x-amz-meta-original-key': key,
        'x-amz-meta-original-size': String(originalSize),
      });

      if (webpKey !== key) {
        await client.removeObject(BUCKET, key);
      }
    }

    return {
      key,
      status: dryRun ? 'dry-run' : 'converted',
      originalSize,
      newSize: webpBuffer.length,
      savings: `${savings}%`,
    };
  } catch (err) {
    return { key, status: 'error', originalSize, error: String(err) };
  }
}

// ─── Batch processor ───────────────────────────────────────────────────────
async function processBatch(items: Array<{ name: string; size: number }>): Promise<Result[]> {
  const results: Result[] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((item) => processImage(item.name, item.size)));
    results.push(...batchResults);
    process.stdout.write(`  Progress: ${Math.min(i + BATCH_SIZE, items.length)}/${items.length}\r`);
  }
  return results;
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== MinIO Image Recompression ===');
  console.log(`  Bucket  : ${BUCKET}`);
  console.log(`  Folder  : ${folder}`);
  console.log(`  Dry run : ${dryRun}`);
  console.log(`  Limit   : ${isFinite(limitArg) ? limitArg : 'none'}`);
  console.log('');

  console.log(`Listing objects in ${folder}/...`);
  const allObjects = await listObjects(`${folder}/`);
  const imageObjects = allObjects
    .filter((o) => isImage(o.name))
    .slice(0, limitArg);

  console.log(`Found ${allObjects.length} total objects, ${imageObjects.length} images to process\n`);

  if (imageObjects.length === 0) {
    console.log('Nothing to process.');
    return;
  }

  const results = await processBatch(imageObjects);
  console.log('\n');

  const converted = results.filter((r) => r.status === 'converted' || r.status === 'dry-run');
  const errors    = results.filter((r) => r.status === 'error');
  const skipped   = results.filter((r) => r.status === 'skipped');

  const totalOriginal = converted.reduce((s, r) => s + r.originalSize, 0);
  const totalNew      = converted.reduce((s, r) => s + (r.newSize ?? r.originalSize), 0);
  const totalSavings  = totalOriginal - totalNew;

  console.log('=== Results ===');
  console.log(`  Converted : ${converted.length}`);
  console.log(`  Skipped   : ${skipped.length}`);
  console.log(`  Errors    : ${errors.length}`);
  if (totalOriginal > 0) {
    console.log(`  Total savings : ${(totalSavings / 1024 / 1024).toFixed(1)} MB (${((totalSavings / totalOriginal) * 100).toFixed(1)}%)`);
  }

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach((r) => console.log(`  ${r.key}: ${r.error}`));
  }

  if (converted.length > 0) {
    console.log('\nTop savings:');
    converted
      .sort((a, b) => (b.originalSize - (b.newSize ?? 0)) - (a.originalSize - (a.newSize ?? 0)))
      .slice(0, 5)
      .forEach((r) => {
        const saved = r.originalSize - (r.newSize ?? 0);
        console.log(`  ${r.key}: ${(saved / 1024).toFixed(0)} KB saved (${r.savings})`);
      });
  }

  if (dryRun) {
    console.log('\n⚠️  DRY RUN — কিছু upload হয়নি। --dry-run flag সরিয়ে আবার run করুন।');
  }
}

main().then(() => {
  console.log('\nDone.');
  process.exit(0);
}).catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
