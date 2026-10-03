#!/usr/bin/env node
/**
 * Automated Landing Parity QA Audit Script (MCP-14)
 * Emulates Meta Commerce crawler parity inspection across product states.
 * Verifies 100% attribute parity between:
 *  1. Catalog Feed (mapProductToCatalogItems)
 *  2. OpenGraph Meta Tags (buildProductOgOther)
 *  3. Schema.org JSON-LD (buildDynamicProductJsonLd)
 *  4. Canonical Offer Snapshot (resolveProductOffer)
 */

import { resolveProductOffer } from '../lib/commerce/product-offer.ts';
import { mapProductToCatalogItems } from '../lib/meta/catalog/mapper.ts';
import { buildProductOgOther } from '../app/(storefront)/products/[id]/components/seo/buildProductOgOther.ts';
import { buildDynamicProductJsonLd } from '../app/(storefront)/products/[id]/components/seo/buildProductJsonLd.ts';

const NOW = new Date('2026-10-03T12:00:00Z');

const TEST_SCENARIOS = [
  {
    name: 'Active In-Stock Product',
    product: {
      id: 'prod-001',
      sku: 'MB-SKU-001',
      slug: 'rose-water-toner',
      name: 'Rose Water Hydrating Toner',
      price: 850,
      compareAtPrice: 1000,
      salePrice: null,
      quantity: 25,
      reservedQuantity: 5,
      trackInventory: true,
      allowBackorder: false,
      isActive: true,
      deletedAt: null,
      brand: { name: 'Minsah Glow' },
      category: { name: 'Skincare' },
      images: [{ url: 'https://minsahbeauty.com/img/rose.jpg', isDefault: true }],
      variants: [],
    },
    expectedPrice: 850,
    expectedAvailability: 'in stock',
    expectedSchemaAvailability: 'https://schema.org/InStock',
  },
  {
    name: 'Product with Active Flash Sale',
    product: {
      id: 'prod-002',
      sku: 'MB-SKU-002',
      slug: 'vitamin-c-serum',
      name: 'Brightening Vitamin C Serum',
      price: 1500,
      compareAtPrice: 1800,
      salePrice: 1200,
      offerStartDate: new Date('2026-10-01T00:00:00Z'),
      offerEndDate: new Date('2026-10-10T23:59:59Z'), // Active relative to 2026-10-03
      quantity: 50,
      reservedQuantity: 0,
      trackInventory: true,
      allowBackorder: false,
      isActive: true,
      deletedAt: null,
      brand: { name: 'Minsah Radiance' },
      category: { name: 'Serums' },
      images: [{ url: 'https://minsahbeauty.com/img/vitc.jpg', isDefault: true }],
      variants: [],
    },
    expectedPrice: 1200,
    expectedAvailability: 'in stock',
    expectedSchemaAvailability: 'https://schema.org/InStock',
  },
  {
    name: 'Product with Expired Sale (Reverted to Regular Price)',
    product: {
      id: 'prod-003',
      sku: 'MB-SKU-003',
      slug: 'peptides-cream',
      name: 'Youth Restoring Peptide Cream',
      price: 2200,
      compareAtPrice: 2500,
      salePrice: 1700,
      offerStartDate: new Date('2026-09-01T00:00:00Z'),
      offerEndDate: new Date('2026-09-15T23:59:59Z'), // Expired!
      quantity: 12,
      reservedQuantity: 2,
      trackInventory: true,
      allowBackorder: false,
      isActive: true,
      deletedAt: null,
      brand: { name: 'Minsah Glow' },
      category: { name: 'Moisturizers' },
      images: [{ url: 'https://minsahbeauty.com/img/peptide.jpg', isDefault: true }],
      variants: [],
    },
    expectedPrice: 2200, // Reverted to regular price
    expectedAvailability: 'in stock',
    expectedSchemaAvailability: 'https://schema.org/InStock',
  },
  {
    name: 'Out of Stock Product (Reserved Equals Quantity)',
    product: {
      id: 'prod-004',
      sku: 'MB-SKU-004',
      slug: 'matte-lipstick-01',
      name: 'Velvet Matte Lipstick Shade 01',
      price: 650,
      compareAtPrice: null,
      salePrice: null,
      quantity: 10,
      reservedQuantity: 10, // Available = 0
      trackInventory: true,
      allowBackorder: false,
      isActive: true,
      deletedAt: null,
      brand: { name: 'Minsah Velvet' },
      category: { name: 'Lips' },
      images: [{ url: 'https://minsahbeauty.com/img/lip01.jpg', isDefault: true }],
      variants: [],
    },
    expectedPrice: 650,
    expectedAvailability: 'out of stock',
    expectedSchemaAvailability: 'https://schema.org/OutOfStock',
  },
  {
    name: 'Multi-Variant Product Deep Link Parity',
    product: {
      id: 'prod-005',
      sku: 'MB-SKU-005',
      slug: 'foundation-serum',
      name: 'Liquid Foundation Serum',
      price: 1800,
      compareAtPrice: 2000,
      salePrice: null,
      quantity: 20,
      reservedQuantity: 0,
      trackInventory: true,
      allowBackorder: false,
      isActive: true,
      deletedAt: null,
      brand: { name: 'Minsah Face' },
      category: { name: 'Makeup' },
      images: [{ url: 'https://minsahbeauty.com/img/found.jpg', isDefault: true }],
      variants: [
        {
          id: 'var-warm-sand',
          sku: 'MB-SKU-005-SAND',
          name: 'Warm Sand',
          price: 1850,
          compareAtPrice: 2100,
          salePrice: 1650,
          offerStartDate: new Date('2026-10-01T00:00:00Z'),
          offerEndDate: new Date('2026-10-15T00:00:00Z'),
          quantity: 8,
          reservedQuantity: 0,
        },
      ],
    },
    isVariant: true,
    variantIndex: 0,
    expectedPrice: 1650,
    expectedAvailability: 'in stock',
    expectedSchemaAvailability: 'https://schema.org/InStock',
  },
];

console.log('╔═══════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║       AUTOMATED META CATALOG ↔ STOREFRONT LANDING PARITY AUDIT (MCP-14)               ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;

for (const scenario of TEST_SCENARIOS) {
  const p = scenario.product;
  const selectedVariant = scenario.isVariant ? p.variants[scenario.variantIndex] : undefined;

  // 1. Resolve Offer Snapshot (SSOT)
  const offer = resolveProductOffer({
    product: p,
    variant: selectedVariant,
    now: NOW,
  });

  // 2. Resolve Catalog Items via mapper
  const resolveIdentity = ({ productId, variantId, productSku, variantSku }) => ({
    itemId: variantId ? `${productId}_${variantId}` : (productSku || productId),
    itemSource: variantId ? 'composite_variant' : 'product_sku',
    isVariant: Boolean(variantId),
    retailerId: variantId ? `${productId}_${variantId}` : (productSku || productId),
  });

  const catalogResults = mapProductToCatalogItems({
    product: p,
    resolveIdentity,
    siteUrl: 'https://minsahbeauty.com',
    currency: 'BDT',
    now: NOW,
  });

  const canonicalItem = scenario.isVariant
    ? catalogResults.find((r) => r.item.retailerId === `${p.id}_${selectedVariant.id}`)?.item
    : catalogResults[0]?.item;

  // 3. Resolve OpenGraph Tags
  const ogOther = buildProductOgOther({
    product: p,
    offer,
    siteUrl: 'https://minsahbeauty.com',
  });

  // 4. Resolve Schema.org JSON-LD
  const schema = buildDynamicProductJsonLd({
    product: p,
    productUrl: offer.link,
    now: NOW,
  });

  // Verification checks:
  const checks = [];

  // Check A: Price parity
  const catalogEffectivePrice = canonicalItem?.sale ? canonicalItem.sale.price.amount : canonicalItem?.price.amount;
  const ogPrice = Number(ogOther['product:price:amount']);
  const offerPrice = offer.effectivePrice;
  const schemaOffer = Array.isArray(schema.offers) ? schema.offers[0] : schema.offers;
  const schemaPrice = Number(schemaOffer?.price);

  const priceParity =
    offerPrice === scenario.expectedPrice &&
    catalogEffectivePrice === scenario.expectedPrice &&
    ogPrice === scenario.expectedPrice &&
    schemaPrice === scenario.expectedPrice;

  checks.push({
    name: 'Effective Price (BDT)',
    pass: priceParity,
    detail: `Catalog=${catalogEffectivePrice}, OG=${ogPrice}, Schema=${schemaPrice}, Offer=${offerPrice}, Expected=${scenario.expectedPrice}`,
  });

  // Check B: Availability parity
  const catalogAvail = canonicalItem?.availability;
  const ogAvail = ogOther['product:availability'];
  const offerAvail = offer.availability;
  const schemaAvail = schemaOffer?.availability;

  const availParity =
    offerAvail === scenario.expectedAvailability &&
    catalogAvail === scenario.expectedAvailability &&
    ogAvail === scenario.expectedAvailability &&
    schemaAvail === scenario.expectedSchemaAvailability;

  checks.push({
    name: 'Availability Status',
    pass: availParity,
    detail: `Catalog=${catalogAvail}, OG=${ogAvail}, Offer=${offerAvail}, Schema=${schemaAvail}`,
  });

  // Check C: Currency parity
  const catalogCurrency = canonicalItem?.price.currency;
  const ogCurrency = ogOther['product:price:currency'];
  const schemaCurrency = schemaOffer?.priceCurrency;
  const currencyParity =
    offer.currency === 'BDT' &&
    catalogCurrency === 'BDT' &&
    ogCurrency === 'BDT' &&
    schemaCurrency === 'BDT';

  checks.push({
    name: 'Currency Uniformity (BDT)',
    pass: currencyParity,
    detail: `Offer=${offer.currency}, Catalog=${catalogCurrency}, OG=${ogCurrency}, Schema=${schemaCurrency}`,
  });

  // Check D: Variant deep link preservation
  if (scenario.isVariant) {
    const hasVariantQuery =
      offer.link.includes(`?variant=${selectedVariant.id}`) &&
      canonicalItem?.link?.includes(`?variant=${selectedVariant.id}`) &&
      schemaOffer?.url?.includes(`?variant=${selectedVariant.id}`);
    checks.push({
      name: 'Variant Deep Link',
      pass: hasVariantQuery,
      detail: `OfferLink=${offer.link}, CatalogLink=${canonicalItem?.link}, SchemaOfferUrl=${schemaOffer?.url}`,
    });
  }

  const allScenarioPassed = checks.every((c) => c.pass);
  if (allScenarioPassed) {
    passCount++;
    console.log(`✅ PASS: [${scenario.name}]`);
  } else {
    failCount++;
    console.error(`❌ FAIL: [${scenario.name}]`);
  }

  for (const c of checks) {
    const symbol = c.pass ? '   ✔' : '   ✖';
    console.log(`${symbol} ${c.name}: ${c.detail}`);
  }
  console.log('');
}

console.log('─────────────────────────────────────────────────────────────────────────────────────────');
console.log(`Parity Verdict: ${passCount} Passed, ${failCount} Failed across ${TEST_SCENARIOS.length} Scenarios`);
console.log('─────────────────────────────────────────────────────────────────────────────────────────\n');

if (failCount > 0) {
  console.error('[PARITY AUDIT FAILED] Divergence detected between Catalog, OG, JSON-LD, and Offer.');
  process.exit(1);
} else {
  console.log('[PARITY AUDIT PASS] 100% Exact Attribute Parity Verified across all Scenarios.');
  process.exit(0);
}
