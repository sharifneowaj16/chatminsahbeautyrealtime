#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const checks = [];
function check(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? '✅' : '❌'} ${name}`);
}

const trust = read('lib/shopTrust.ts');
const products = read('app/api/products/route.ts');
const search = read('app/api/search/route.ts');
const transformer = read('lib/search/productTransformer.ts');
const adapter = read('lib/productAdapter.ts');
const fallback = read('lib/search/db-fallback.ts');
const card = read('app/components/shop/ProductCard.tsx');
const grid = read('app/components/shop/ShopGrid.tsx');
const mapping = read('lib/elasticsearch.ts');
const context = read('contexts/ProductsContext.tsx');
const pkg = JSON.parse(read('package.json') || '{}');

check('Shared shop trust resolver exists', trust.includes('export function resolveProductTrustBadges'));
check('Resolver returns full Phase 3 trust payload', ['isCODAvailable', 'freeShippingEligible', 'returnEligible', 'authenticityBadge', 'deliveryBadge', 'badges'].every((token) => trust.includes(token)));
check('Resolver requires active delivery offer for free delivery', trust.includes('isDeliveryOfferActive') && trust.includes("offerType === 'FREE'"));
check('Resolver blocks free delivery for out-of-stock/deleted/inactive products', trust.includes('isProductSellable') && trust.includes('deletedAt') && trust.includes('isActive === false'));
check('Products API uses shared trust resolver', products.includes("@/lib/shopTrust") && products.includes('resolveProductTrustBadges'));
check('Products API no longer has local free-delivery shortcut helper', !products.includes('function isFreeDeliveryOfferActive') && !products.includes('product.isFragile !== true'));
check('Search ES transformer uses shared trust resolver', transformer.includes("@/lib/shopTrust") && transformer.includes('resolveProductTrustBadges'));
check('Search ES transformer no longer uses non-fragile as free-delivery shortcut', !transformer.includes('freeShippingEligible: product.isFragile !== true'));
check('Search DB fallback emits same trust payload', fallback.includes("@/lib/shopTrust") && ['codAvailable', 'returnEligible', 'authenticityBadge', 'deliveryBadge', 'badges'].every((token) => fallback.includes(token)));
check('Legacy product adapter uses resolver and not !isFragile fallback', adapter.includes('resolveProductTrustBadges') && !adapter.includes('!p.isFragile'));
check('ShopGrid carries trust payload from products/search into ProductCard', ['isCODAvailable', 'returnEligible', 'authenticityBadge', 'deliveryBadge', 'badges'].every((token) => grid.includes(token)));
check('ProductCard does not hardcode authenticity badge unconditionally', card.includes('product.authenticityBadge') && !card.includes('>Authentic</span>'));
check('ProductCard hides unknown delivery badge instead of showing generic delivery timing', card.includes('product.deliveryBadge') && !card.includes('deliveryText'));
check('Elasticsearch mapping includes complete trust fields', ['isCODAvailable', 'returnEligible', 'authenticityBadge', 'deliveryBadge', 'badges'].every((token) => mapping.includes(token)));
check('Admin product context does not default unknown free shipping to true', context.includes('freeShippingEligible: product.freeShippingEligible === true'));
check('package.json exposes qa:shop-trust', pkg.scripts?.['qa:shop-trust'] === 'node scripts/shop-trust-parity-audit.mjs');

const passed = checks.filter((item) => item.ok).length;
console.log(`\nShop trust parity audit: ${passed}/${checks.length} checks passed.`);
if (passed !== checks.length) process.exit(1);
