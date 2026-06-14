/**
 * lib/elasticsearch/indexing.ts
 *
 * Product indexing operations for Elasticsearch v9.
 *
 * ES v9 notes:
 *   - bulk() accepts { operations: [...] } (no body)
 *   - indices.create() accepts settings/mappings directly
 *   - All responses fully typed
 */

import { esClient, PRODUCT_INDEX, productIndexMapping, indexExists } from '../elasticsearch';
import { transformProductToES } from '../search/productTransformer';
import prisma from '../prisma';

// ─── Prisma include for full product data ──────────────────────────────

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  category: { include: { parent: { include: { parent: true } } } },
  brand: true,
  reviews: { select: { rating: true } },
} as const;

// ─── Create index with mappings ────────────────────────────────────────

export async function createProductIndex(): Promise<boolean> {
  try {
    const exists = await indexExists(PRODUCT_INDEX);

    if (exists) {
      console.log(`ℹ️  Index "${PRODUCT_INDEX}" already exists — skipping creation`);
      return true;
    }

    await esClient.indices.create({
      index: PRODUCT_INDEX,
      settings: productIndexMapping.settings,
      mappings: productIndexMapping.mappings,
    });

    console.log(`✅ Index "${PRODUCT_INDEX}" created with beauty_search analyzer`);
    return true;
  } catch (error) {
    console.error('❌ Error creating product index:', error);
    return false;
  }
}

// ─── Index a single product ────────────────────────────────────────────

export async function indexProduct(product: any): Promise<boolean> {
  try {
    const doc = transformProductToES(product);

    await esClient.index({
      index: PRODUCT_INDEX,
      id: product.id,
      document: doc,
    });

    // No refresh here — let ES auto-refresh (1s default) for performance
    console.log(`✅ Product ${product.id} indexed`);
    return true;
  } catch (error) {
    console.error(`❌ Error indexing product ${product.id}:`, error);
    return false;
  }
}

// ─── Update a product (partial) ────────────────────────────────────────

export async function updateProduct(
  productId: string,
  updates: Record<string, unknown>
): Promise<boolean> {
  try {
    await esClient.update({
      index: PRODUCT_INDEX,
      id: productId,
      doc: updates,
    });

    console.log(`✅ Product ${productId} updated`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating product ${productId}:`, error);
    return false;
  }
}

// ─── Delete a product ──────────────────────────────────────────────────

export async function deleteProduct(productId: string): Promise<boolean> {
  try {
    await esClient.delete({
      index: PRODUCT_INDEX,
      id: productId,
    });

    console.log(`✅ Product ${productId} deleted from index`);
    return true;
  } catch (error: unknown) {
    // 404 = not in index, that's fine
    if (
      typeof error === 'object' &&
      error !== null &&
      'meta' in error &&
      (error as { meta: { statusCode: number } }).meta?.statusCode === 404
    ) {
      console.warn(`⚠️  Product ${productId} was not in index`);
      return true;
    }
    console.error(`❌ Error deleting product ${productId}:`, error);
    return false;
  }
}

// ─── Bulk index products ───────────────────────────────────────────────

export async function bulkIndexProducts(
  products: any[]
): Promise<boolean> {
  try {
    if (products.length === 0) return true;

    const operations = products.flatMap((product) => {
      const doc = transformProductToES(product);
      return [
        { index: { _index: PRODUCT_INDEX, _id: product.id } },
        doc,
      ];
    });

    const result = await esClient.bulk({ operations, refresh: false });

    if (result.errors) {
      const erroredDocuments = result.items.filter(
        (item) => item.index?.error
      );
      console.error(
        `⚠️  Bulk index had ${erroredDocuments.length} errors:`,
        erroredDocuments.map((d) => d.index?.error)
      );
      return false;
    }

    console.log(`✅ Bulk indexed ${products.length} products`);
    return true;
  } catch (error) {
    console.error('❌ Error bulk indexing products:', error);
    return false;
  }
}

// ─── Index ALL products from database ──────────────────────────────────

export async function indexAllProducts(): Promise<boolean> {
  const BATCH_SIZE = 500;

  try {
    const total = await prisma.product.count();
    console.log(`📊 Total products in database: ${total}`);

    if (total === 0) {
      console.log('ℹ️  No products to index');
      return true;
    }

    let skip = 0;
    let indexed = 0;

    while (skip < total) {
      const products = await prisma.product.findMany({
        skip,
        take: BATCH_SIZE,
        include: productInclude,
      });

      if (products.length === 0) break;

      const operations = products.flatMap((product) => {
        const doc = transformProductToES(product);
        return [
          { index: { _index: PRODUCT_INDEX, _id: product.id } },
          doc,
        ];
      });

      const result = await esClient.bulk({ operations, refresh: false });

      if (result.errors) {
        const erroredDocuments = result.items.filter(
          (item) => item.index?.error
        );
        console.error(
          `⚠️  Batch errors: ${erroredDocuments.length}`,
          erroredDocuments.slice(0, 3).map((d) => d.index?.error)
        );
      }

      indexed += products.length;
      console.log(`📦 Progress: ${indexed}/${total}`);
      skip += BATCH_SIZE;
    }

    // Refresh once at the end
    await esClient.indices.refresh({ index: PRODUCT_INDEX });

    const stats = await esClient.count({ index: PRODUCT_INDEX });
    console.log(`✅ Total documents in index: ${stats.count}`);

    return true;
  } catch (error) {
    console.error('❌ Error indexing all products:', error);
    return false;
  }
}

// ─── Reindex all (delete + recreate + index) ───────────────────────────

export async function reindexAllProducts(): Promise<boolean> {
  try {
    console.log('🔄 Starting full reindex…');

    const exists = await indexExists(PRODUCT_INDEX);

    if (exists) {
      console.log('🗑️  Deleting existing index…');
      await esClient.indices.delete({ index: PRODUCT_INDEX });
    }

    console.log('📦 Creating new index…');
    await createProductIndex();

    console.log('📊 Indexing all products…');
    await indexAllProducts();

    console.log('✅ Reindex completed');
    return true;
  } catch (error) {
    console.error('❌ Error reindexing products:', error);
    return false;
  }
}

// ─── Simple search wrapper ─────────────────────────────────────────────

export async function searchProducts(
  query: string,
  options: {
    page?: number;
    limit?: number;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sort?: string;
  } = {}
) {
  const {
    page = 1,
    limit = 20,
    category,
    minPrice,
    maxPrice,
    inStock,
    sort = 'relevance',
  } = options;

  const must: any[] = [];
  const filter: any[] = [];

  if (query.trim()) {
    must.push({
      multi_match: {
        query,
        fields: [
          'name^5',
          'focusKeyword^4',
          'brand^3',
          'secondaryKeywords^3',
          'searchTags^3',
          'synonyms^3',
          'banglaSearchTerms^3',
          'category^2',
          'buyingIntentKeywords^2.5',
          'reviewKeywords^2',
          'entities^2',
          'description^1.5',
          'tags^2',
        ],
        type: 'best_fields',
        fuzziness: 'AUTO',
        prefix_length: 2,
      },
    });
  } else {
    must.push({ match_all: {} });
  }

  if (category) filter.push({ term: { category } });

  if (minPrice !== undefined || maxPrice !== undefined) {
    const range: Record<string, number> = {};
    if (minPrice !== undefined) range.gte = minPrice;
    if (maxPrice !== undefined) range.lte = maxPrice;
    filter.push({ range: { price: range } });
  }

  if (inStock) filter.push({ term: { inStock: true } });

  let sortOrder: any[] = [{ _score: 'desc' }];
  switch (sort) {
    case 'price_asc':  sortOrder = [{ price: 'asc' }, { _score: 'desc' }]; break;
    case 'price_desc': sortOrder = [{ price: 'desc' }, { _score: 'desc' }]; break;
    case 'newest':     sortOrder = [{ createdAt: 'desc' }, { _score: 'desc' }]; break;
    case 'rating':     sortOrder = [{ rating: 'desc' }, { _score: 'desc' }]; break;
  }

  const response = await esClient.search({
    index: PRODUCT_INDEX,
    from: (page - 1) * limit,
    size: limit,
    query: { bool: { must, filter } },
    sort: sortOrder,
    highlight: { fields: { name: {}, description: {} } },
  });

  const hits = response.hits.hits;
  const products = hits.map((hit) => ({
    ...(hit._source as Record<string, unknown>),
    _score: hit._score,
    _highlights: hit.highlight,
  }));

  // ES v9: hits.total is always { value, relation }
  const total =
    typeof response.hits.total === 'object'
      ? response.hits.total.value
      : (response.hits.total ?? 0);

  return { products, total, page, limit, totalPages: Math.ceil(total / limit) };
}
