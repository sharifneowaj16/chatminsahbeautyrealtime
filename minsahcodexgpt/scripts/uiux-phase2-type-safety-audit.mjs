import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];

async function includes(relativePath, pattern, label) {
  const content = await readFile(path.join(root, relativePath), 'utf8');
  const passed = typeof pattern === 'string' ? content.includes(pattern) : pattern.test(content);
  checks.push({ label, passed });
}

await includes('package.json', 'node scripts/prisma-client-freshness.mjs && tsc --noEmit', 'typecheck verifies Prisma freshness before strict TypeScript');
await includes('generated/prisma/.schema.sha256', /^[a-f0-9]{64}\s*$/i, 'generated Prisma snapshot is schema-stamped');
await includes('app/api/products/route.ts', 'satisfies Prisma.ProductFindManyArgs', 'product queries use typed Prisma arguments');
await includes('app/api/products/route.ts', 'type ListingProduct = Prisma.ProductGetPayload', 'listing payload has an explicit generated Prisma type');
await includes('app/api/products/route.ts', 'type FullProduct = Prisma.ProductGetPayload', 'full payload has an explicit generated Prisma type');
await includes('lib/tracking/health.ts', "@/generated/prisma/client", 'tracking health imports Prisma types from the configured generated client');
await includes('lib/tracking/failure-retention.ts', "@/generated/prisma/client", 'tracking retention imports Prisma types from the configured generated client');

const failed = checks.filter((check) => !check.passed);
for (const check of checks) {
  console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.label}`);
}

if (failed.length > 0) {
  console.error(`Phase 2 type-safety audit failed: ${failed.length}/${checks.length} checks failed.`);
  process.exit(1);
}

console.log(`Phase 2 type-safety audit passed: ${checks.length}/${checks.length} checks passed.`);
