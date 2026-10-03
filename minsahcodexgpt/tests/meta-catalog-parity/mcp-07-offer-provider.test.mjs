import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveInitialVariantSelection, resolveActiveOffer } from '../../components/offer/offer-context-logic.ts';

test('MCP-07: initial variant selection resolves from URL or variant count', () => {
  const variants = [
    { id: 'var-1', sku: 'SKU-1', price: 1000 },
    { id: 'var-2', sku: 'SKU-2', price: 1200 },
  ];

  // 1. URL parameter matches variant
  assert.equal(
    resolveInitialVariantSelection({ variants, urlVariantParam: 'var-2' }),
    'var-2'
  );

  // 2. URL parameter does not match any variant -> falls back to multi-variant default (null)
  assert.equal(
    resolveInitialVariantSelection({ variants, urlVariantParam: 'unknown-id' }),
    null
  );

  // 3. Multi-variant with no URL parameter -> null (user must select or sees product level)
  assert.equal(
    resolveInitialVariantSelection({ variants, urlVariantParam: null }),
    null
  );

  // 4. Single-variant product -> automatically preselects the only variant
  assert.equal(
    resolveInitialVariantSelection({ variants: [variants[0]], urlVariantParam: null }),
    'var-1'
  );

  // 5. Zero-variant product -> null
  assert.equal(
    resolveInitialVariantSelection({ variants: [], urlVariantParam: null }),
    null
  );
});

test('MCP-07: resolveActiveOffer returns selected variant offer or falls back to product offer', () => {
  const productOffer = {
    regularPrice: 1000,
    effectivePrice: 1000,
    currency: 'BDT',
    availability: 'in stock',
    retailerId: 'PROD-101',
    canPurchase: true,
  };

  const variantOffer = {
    regularPrice: 1200,
    effectivePrice: 1200,
    currency: 'BDT',
    availability: 'out of stock',
    retailerId: 'VAR-2',
    canPurchase: false,
  };

  const variants = [
    { id: 'var-1', offer: { ...productOffer, retailerId: 'VAR-1' } },
    { id: 'var-2', offer: variantOffer },
  ];

  // When no variant is selected -> product offer
  const defaultOffer = resolveActiveOffer({
    productOffer,
    variants,
    selectedVariantId: null,
  });
  assert.equal(defaultOffer.retailerId, 'PROD-101');
  assert.equal(defaultOffer.canPurchase, true);

  // When variant 'var-2' is selected -> variant offer
  const activeOffer = resolveActiveOffer({
    productOffer,
    variants,
    selectedVariantId: 'var-2',
  });
  assert.equal(activeOffer.retailerId, 'VAR-2');
  assert.equal(activeOffer.canPurchase, false);
});
