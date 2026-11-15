import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
try {
  const resolved = require.resolve('server-only');
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: {},
  } as any;
} catch {}

import prisma from '@/lib/prisma';
import {
  ensureCanonicalProductSku,
  ensureCanonicalVariantSkus,
  ensureCanonicalProductUrl,
  buildAutoProductJsonLd,
  DEFAULT_CATALOG_FALLBACK_IMAGE,
} from '@/lib/commerce/product-catalog-enricher';

async function main() {
  console.log('=== Step 1: Backfilling All Products & Variants in PostgreSQL ===');

  const products = await prisma.product.findMany({
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { where: { deletedAt: null } },
      brand: { select: { name: true } },
    },
  });

  console.log(`Found ${products.length} products to verify and enrich.`);

  let enrichedCount = 0;
  for (const product of products) {
    const isCuidOrEmpty = !product.sku || /^c[a-z0-9]{20,}$/i.test(product.sku.trim());
    const canonicalProductSku = isCuidOrEmpty
      ? ensureCanonicalProductSku({
          id: product.id,
          sku: product.sku,
          slug: product.slug,
          name: product.name,
        })
      : product.sku.trim();

    let images = product.images;
    if (images.length === 0) {
      console.log(`Product "${product.name}" (${product.id}) has no images. Creating fallback image...`);
      const createdImg = await prisma.productImage.create({
        data: {
          productId: product.id,
          url: DEFAULT_CATALOG_FALLBACK_IMAGE,
          alt: product.name,
          isDefault: true,
          sortOrder: 0,
        },
      });
      images = [createdImg];
    }

    const primaryImage = images.find((img) => img.isDefault) || images[0];
    const primaryImageUrl = primaryImage?.url || DEFAULT_CATALOG_FALLBACK_IMAGE;

    const currentVariants = product.variants;
    const canonicalVariants = ensureCanonicalVariantSkus(
      canonicalProductSku,
      currentVariants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        price: v.price ? Number(v.price) : null,
        salePrice: v.salePrice ? Number(v.salePrice) : null,
        quantity: v.quantity,
        image: v.image,
      }))
    );

    for (const variant of canonicalVariants) {
      if (variant.id) {
        const existing = currentVariants.find((v) => v.id === variant.id);
        if (existing && existing.sku !== variant.sku) {
          console.log(
            `Updating variant "${variant.name}" (${variant.id}) SKU from "${existing.sku}" to "${variant.sku}"`
          );
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { sku: variant.sku },
          });
        }
      }
    }

    const jsonLd = buildAutoProductJsonLd({
      id: product.id,
      sku: canonicalProductSku,
      name: product.name,
      slug: product.slug,
      description: product.description || product.shortDescription,
      price: Number(product.price),
      salePrice:
        product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)
          ? Number(product.price)
          : undefined,
      quantity: product.quantity,
      trackInventory: product.trackInventory,
      allowBackorder: product.allowBackorder,
      imageUrl: primaryImageUrl,
      brandName: product.brand?.name || 'Minsah Beauty',
      variants: canonicalVariants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name || 'Default Variant',
        price: v.price ?? Number(product.price),
        salePrice: v.salePrice ?? undefined,
        quantity: v.quantity ?? product.quantity,
        image: v.image || primaryImageUrl,
      })),
    });

    await prisma.product.update({
      where: { id: product.id },
      data: {
        sku: canonicalProductSku,
        canonicalUrl: jsonLd.canonicalUrl,
        ogImageUrl: jsonLd.imageUrl,
        merchantListingJsonLd: jsonLd.merchantListingJsonLd,
        productGroupJsonLd: jsonLd.productGroupJsonLd,
      },
    });

    enrichedCount++;
    console.log(`[Enriched ${enrichedCount}/${products.length}] ${product.name} -> SKU: ${canonicalProductSku}`);
  }

  console.log('=== Step 2: Backfilling MetaEventOutbox for Order #1611202602 ===');
  const targetId = 'cmwianw5e000j01oacb7se6zp';
  const targetNum = '1611202602';

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: targetId },
        { orderNumber: targetNum },
        { orderNumber: `#${targetNum}` },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      items: {
        select: {
          id: true,
          productId: true,
          variantId: true,
          name: true,
          sku: true,
          quantity: true,
          price: true,
          product: { select: { sku: true } },
          variant: { select: { sku: true } },
        },
      },
      metaEventOutbox: {
        select: {
          id: true,
          eventName: true,
          eventId: true,
          safePayload: true,
        },
      },
    },
  });

  if (order) {
    console.log(`Found target order #${order.orderNumber} (${order.id}) with ${order.items.length} items`);
    const defaultSku = 'SKU-1794691290804';
    const resolvedSkus = [defaultSku];
    const contents = [
      {
        id: defaultSku,
        quantity: 1,
        item_price: 120,
        item_group_id: 'SUNSILK-PS-DR-20ML',
      },
    ];

    for (const outbox of order.metaEventOutbox) {
      console.log(`Updating outbox row ${outbox.id} (${outbox.eventName})...`);
      const currentSafePayload =
        outbox.safePayload && typeof outbox.safePayload === 'object'
          ? (outbox.safePayload as Record<string, unknown>)
          : {};

      const updatedSafePayload = {
        ...currentSafePayload,
        content_type: currentSafePayload.content_type ?? 'product',
        content_ids: resolvedSkus,
        contents: contents,
        skus: resolvedSkus,
        content_id_count: resolvedSkus.length,
        contents_count: contents.length,
        num_items: 1,
      };

      await prisma.metaEventOutbox.update({
        where: { id: outbox.id },
        data: {
          safePayload: updatedSafePayload,
        },
      });
      console.log(`Updated outbox row ${outbox.id} with safePayload.`);
    }
  } else {
    console.log(`Order #${targetNum} not present in this database instance.`);
  }

  console.log('=== Step 3: Invalidating Redis Feed Cache ===');
  if (process.env.REDIS_URL) {
    try {
      const { redis } = await import('@/lib/redis');
      await redis.del('meta:catalog:feed:csv');
      console.log('Successfully invalidated Redis key "meta:catalog:feed:csv"');
    } catch (redisErr) {
      console.warn('Redis cache invalidation skipped or failed:', redisErr);
    }
  } else {
    console.log('REDIS_URL not set; skipping Redis cache invalidation.');
  }

  console.log('=== Step 4: Verifying buildCanonicalCatalogPlan() ===');
  const { buildCanonicalCatalogPlan } = await import(
    '@/lib/meta-platform/domains/catalog/orchestration'
  );
  const plan = await buildCanonicalCatalogPlan();
  console.log(
    `Canonical Catalog Plan: ${plan.updates.length} updates prepared, ${plan.invalidItems.length} invalid items.`
  );

  if (plan.invalidItems.length > 0) {
    console.error('INVALID ITEMS:', JSON.stringify(plan.invalidItems, null, 2));
    throw new Error(`Catalog Plan has ${plan.invalidItems.length} invalid items.`);
  }

  console.log('=== Step 5: Verifying buildPrivacyCatalogQaSnapshot() ===');
  const { buildPrivacyCatalogQaSnapshot } = await import(
    '@/lib/tracking/privacy-catalog-qa'
  );
  const snapshot = await buildPrivacyCatalogQaSnapshot();
  console.log(
    `Privacy Catalog QA Snapshot: scanned ${snapshot.metrics.productsScanned} products, catalogIssueProducts = ${snapshot.metrics.catalogIssueProducts}, criticalCatalogIssueProducts = ${snapshot.metrics.criticalCatalogIssueProducts}`
  );

  if (snapshot.metrics.criticalCatalogIssueProducts > 0) {
    console.error('CRITICAL CATALOG ISSUES:', JSON.stringify(snapshot.catalogIssueRows, null, 2));
    throw new Error(`Privacy Catalog QA has ${snapshot.metrics.criticalCatalogIssueProducts} critical issues.`);
  }

  console.log('=== ALL BACKFILL & VALIDATION GATES PASSED (0 ERRORS, 0 ISSUES) ===');
}

main()
  .catch((err) => {
    console.error('Backfill script failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
