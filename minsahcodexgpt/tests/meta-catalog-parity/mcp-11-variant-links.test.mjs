import assert from 'node:assert/strict';
import test from 'node:test';
import { mapProductToCatalogItems } from '../../lib/meta/catalog/mapper.ts';
import { resolveInitialVariantSelection, resolveActiveOffer } from '../../components/offer/offer-context-logic.ts';
import { resolveProductOffer } from '../../lib/commerce/product-offer.ts';

test('MCP-11: Catalog feed generates deep links with ?variant=<id> for variants', () => {
  const productSource = {
    id: 'prod-main-id',
    slug: 'hydrating-glow-serum',
    name: 'Hydrating Glow Serum',
    price: 1500,
    images: [{ url: '/img/serum.jpg', isDefault: true }],
    variants: [
      {
        id: 'var-30ml',
        sku: 'GLOW-30ML',
        name: '30ml Mini',
        price: 1500,
        quantity: 10,
        reservedQuantity: 0,
        isActive: true,
        deletedAt: null,
      },
      {
        id: 'var-100ml',
        sku: 'GLOW-100ML',
        name: '100ml Jumbo',
        price: 3200,
        salePrice: 2800,
        offerStartDate: new Date(Date.now() - 3600000),
        offerEndDate: new Date(Date.now() + 86400000),
        quantity: 5,
        reservedQuantity: 0,
        isActive: true,
        deletedAt: null,
      },
    ],
  };

  const mapped = mapProductToCatalogItems({
    product: productSource,
    resolveIdentity: ({ variantId, variantSku, productSku }) => ({
      itemId: variantSku || productSku || 'ID',
      groupId: 'GROUP-ID',
    }),
    siteUrl: 'https://minsahbeauty.com',
  });

  assert.equal(mapped.length, 2);
  assert.equal(mapped[0].item.link, 'https://minsahbeauty.com/products/hydrating-glow-serum?variant=var-30ml');
  assert.equal(mapped[1].item.link, 'https://minsahbeauty.com/products/hydrating-glow-serum?variant=var-100ml');
});

test('MCP-11: Landing with ?variant=<id> preselects variant and resolves variant price, stock, and availability', () => {
  const variants = [
    {
      id: 'var-1',
      sku: 'SHADE-LIGHT',
      name: 'Light',
      price: 1200,
      stock: 15,
      offer: {
        effectivePrice: 1200,
        regularPrice: 1200,
        compareAtPrice: null,
        availability: 'in stock',
        canPurchase: true,
        availableQuantity: 15,
      },
    },
    {
      id: 'var-2',
      sku: 'SHADE-DEEP',
      name: 'Deep',
      price: 1400,
      stock: 0,
      offer: {
        effectivePrice: 1400,
        regularPrice: 1400,
        compareAtPrice: 1600,
        availability: 'out of stock',
        canPurchase: false,
        availableQuantity: 0,
      },
    },
  ];

  // 1. Landing with ?variant=var-2 selects var-2
  const selectedId = resolveInitialVariantSelection({
    variants,
    urlVariantParam: 'var-2',
  });
  assert.equal(selectedId, 'var-2');

  // 2. Active offer resolved for selected variant
  const activeOffer = resolveActiveOffer({
    productOffer: {
      effectivePrice: 1200,
      regularPrice: 1200,
      availability: 'in stock',
      canPurchase: true,
    },
    variants,
    selectedVariantId: selectedId,
  });

  assert.equal(activeOffer.effectivePrice, 1400);
  assert.equal(activeOffer.availability, 'out of stock');
  assert.equal(activeOffer.canPurchase, false);

  // 3. Fallback to SKU matching if url param passes SKU
  const selectedBySku = resolveInitialVariantSelection({
    variants,
    urlVariantParam: 'SHADE-LIGHT',
  });
  assert.equal(selectedBySku, 'var-1');
});
