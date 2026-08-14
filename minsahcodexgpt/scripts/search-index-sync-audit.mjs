#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = (relativePath) => path.join(root, relativePath);
const exists = (relativePath) => fs.existsSync(file(relativePath));
const read = (relativePath) => exists(relativePath) ? fs.readFileSync(file(relativePath), 'utf8') : '';

const checks = [];
function check(name, pass, detail = '') {
  checks.push({ name, pass: Boolean(pass), detail });
}
function hasAll(text, parts) {
  return parts.every((part) => text.includes(part));
}

const adminListPath = 'app/api/admin/products/route.ts';
const adminDetailPath = 'app/api/admin/products/[id]/route.ts';
const queuePath = 'lib/queue/productQueue.ts';
const workerPath = 'lib/workers/productWorker.ts';
const indexingPath = 'lib/elasticsearch/indexing.ts';
const transformerPath = 'lib/search/productTransformer.ts';
const activeFilterPath = 'lib/search/activeProductFilter.ts';
const pkgPath = 'package.json';

const adminList = read(adminListPath);
const adminDetail = read(adminDetailPath);
const queue = read(queuePath);
const worker = read(workerPath);
const indexing = read(indexingPath);
const transformer = read(transformerPath);
const activeFilter = read(activeFilterPath);
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { scripts: {} };

check('Admin product create route exists', exists(adminListPath), adminListPath);
check('Admin product update/delete route exists', exists(adminDetailPath), adminDetailPath);
check('Product queue exists', exists(queuePath), queuePath);
check('Product worker exists', exists(workerPath), workerPath);
check('Elasticsearch indexing helper exists', exists(indexingPath), indexingPath);

check(
  'Phase 21: admin create queues product indexing after DB create',
  hasAll(adminList, ['enqueueProductIndex', 'createProductFromPayload', "'admin product create'", 'searchSyncQueued']),
  adminListPath
);

check(
  'Phase 21: admin update queues product reindex after DB update',
  hasAll(adminDetail, ['enqueueProductIndex', 'updateProduct(id, body)', "'admin product update'", 'searchSyncQueued']),
  adminDetailPath
);

check(
  'Phase 21: admin soft delete updates product visibility and queues ES delete',
  hasAll(adminDetail, ['deletedAt: new Date()', 'isActive: false', 'quantity: 0', 'enqueueProductDelete', "'admin product soft-delete'"]),
  adminDetailPath
);

check(
  'Phase 21: admin hard delete queues ES delete',
  hasAll(adminDetail, ['prisma.product.delete', 'enqueueProductDelete', "'admin product hard-delete'"]),
  adminDetailPath
);

check(
  'Phase 21: product queue has index/delete/reindex job payloads and helpers',
  hasAll(queue, ['IndexJobData', 'DeleteJobData', 'ReindexJobData', 'enqueueProductIndex', 'enqueueProductDelete', 'enqueueProductReindex']),
  queuePath
);

check(
  'Phase 21: product queue is retry-safe with attempts and exponential backoff',
  hasAll(queue, ['attempts: 5', "type: 'exponential'", 'removeOnComplete', 'removeOnFail']) && /jobId:\s*makeJobId/.test(queue),
  queuePath
);

check(
  'Phase 21: worker consumes index/delete/reindex jobs',
  hasAll(worker, ["'product-sync'", "case 'index'", "case 'delete'", "case 'reindex'", 'handleIndex', 'handleDelete', 'handleReindex']),
  workerPath
);

check(
  'Phase 21: worker indexes only current DB state, not client payload',
  hasAll(worker, ['prisma.product.findUnique', 'include: productInclude', 'transformProductToES(product)', 'esClient.index']),
  workerPath
);

check(
  'Phase 21: worker removes missing/inactive/deleted products from ES',
  hasAll(worker, ['Product ${productId} not found in DB', 'await handleDelete(productId)', 'isSellableSearchProduct(product)', 'inactive/deleted']),
  workerPath
);

check(
  'Phase 21: worker full reindex only pulls active non-deleted products',
  hasAll(worker, ['ACTIVE_PRODUCT_PRISMA_WHERE', 'prisma.product.findMany', 'esClient.bulk', 'esClient.indices.refresh']),
  workerPath
);

check(
  'Phase 21: indexing helper deletes non-sellable products instead of indexing them',
  hasAll(indexing, ['indexProduct(product: any)', 'isSellableSearchProduct(product)', 'return await deleteProduct(product.id)']),
  indexingPath
);

check(
  'Phase 21: partial ES update deletes products made inactive/deleted/draft/hidden',
  hasAll(indexing, ['updates.isActive === false', 'updates.deletedAt != null', "updates.status === 'draft'", "updates.visibility === 'hidden'", 'deleteProduct(productId)']),
  indexingPath
);

check(
  'Phase 21: bulk and full index filter to active non-deleted products',
  hasAll(indexing, ['products.filter(isSellableSearchProduct)', 'ACTIVE_PRODUCT_PRISMA_WHERE', 'prisma.product.count', 'prisma.product.findMany']),
  indexingPath
);

check(
  'Phase 21: reindex recreates ES index before indexing current active catalog',
  hasAll(indexing, ['reindexAllProducts', 'indices.delete', 'createProductIndex()', 'indexAllProducts()']),
  indexingPath
);

check(
  'Phase 20/21: product transformer and active filter agree on sellable catalog fields',
  hasAll(transformer, ['isSellableSearchProduct', 'isActive:', 'deletedAt:', 'status,', 'visibility,']) &&
    hasAll(activeFilter, ['ACTIVE_PRODUCT_PRISMA_WHERE', 'buildActiveProductESFilters']),
  `${transformerPath}, ${activeFilterPath}`
);

check('package.json exposes worker command', pkg.scripts?.worker === 'tsx lib/workers/productWorker.ts', pkgPath);
check('package.json exposes qa:search-index', pkg.scripts?.['qa:search-index'] === 'node scripts/search-index-sync-audit.mjs', pkgPath);
check('package.json exposes qa:phase21 alias', pkg.scripts?.['qa:phase21'] === 'node scripts/search-index-sync-audit.mjs', pkgPath);

const failed = checks.filter((item) => !item.pass);
for (const item of checks) {
  console.log(`${item.pass ? '✅' : '❌'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}

console.log(`\nSearch index sync audit: ${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length > 0) process.exitCode = 1;
