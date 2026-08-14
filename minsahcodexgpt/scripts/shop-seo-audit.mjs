import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [];
function check(name, pass, detail = '') {
  checks.push({ name, pass: Boolean(pass), detail });
}

const shopPage = read('app/(storefront)/shop/page.tsx');
const categoryPage = read('app/categories/[slug]/page.tsx');
const brandPage = read('app/brands/[slug]/page.tsx');
const sitemap = read('app/sitemap.ts');
const robots = read('app/robots.ts');
const packageJson = JSON.parse(read('package.json'));
const shopSeo = exists('lib/shopSeo.ts') ? read('lib/shopSeo.ts') : '';
const structuredData = exists('lib/seoStructuredData.ts') ? read('lib/seoStructuredData.ts') : '';

check('lib/shopSeo.ts exists', exists('lib/shopSeo.ts'));
check('lib/seoStructuredData.ts exists', exists('lib/seoStructuredData.ts'));
check('shop SEO state helper canonicalizes category shop URLs to /categories/[slug]', /canonicalPath\s*=\s*`\/categories\/\$\{encodeURIComponent\(category\)\}`/.test(shopSeo));
check('shop SEO state helper canonicalizes brand shop URLs to /brands/[slug]', /canonicalPath\s*=\s*`\/brands\/\$\{encodeURIComponent\(brand\)\}`/.test(shopSeo));
check('shop SEO state noindexes deep filters/search/sort/pagination', shopSeo.includes('DEEP_FILTER_KEYS') && shopSeo.includes('NON_CANONICAL_SORT_VALUES') && shopSeo.includes('page > 1'));
check('shop metadata uses getShopSeoState', shopPage.includes('getShopSeoState(searchParams)'));
check('shop metadata uses canonicalUrl from SEO state', shopPage.includes('canonical: canonicalUrl'));
check('shop metadata uses getShopRobotsMetadata', shopPage.includes('getShopRobotsMetadata(shouldNoIndex)'));
check('shop page server-renders ItemList JSON-LD', shopPage.includes('getShopItemListJsonLd') && shopPage.includes('itemListJsonLd'));
check('structured data helper builds ItemList', structuredData.includes("'@type': 'ItemList'") && structuredData.includes('itemListElement'));
check('structured data helper builds Product offers with BDT', structuredData.includes("'@type': 'Offer'") && structuredData.includes("priceCurrency: 'BDT'"));
check('structured data helper uses stock-based availability', structuredData.includes('https://schema.org/InStock') && structuredData.includes('https://schema.org/OutOfStock'));
check('structured data helper does not create fake review schema without reviewCount', structuredData.includes('reviewCount') && structuredData.includes('reviewCount > 0'));
check('category page imports ItemList helper', categoryPage.includes('buildProductItemListJsonLd'));
check('category page emits ItemList JSON-LD script', categoryPage.includes('itemListJsonLd && <script'));
check('category page has canonical metadata', categoryPage.includes('alternates: { canonical: url }'));
check('category page has index/follow robots metadata', categoryPage.includes('robots: { index: true, follow: true'));
check('brand page imports ItemList helper', brandPage.includes('buildProductItemListJsonLd'));
check('brand page emits ItemList JSON-LD script', brandPage.includes('itemListJsonLd && <script'));
check('brand page has canonical metadata', brandPage.includes('alternates: { canonical: url }'));
check('brand page has index/follow robots metadata', brandPage.includes('robots: { index: true, follow: true'));
check('sitemap includes /shop only as base route', sitemap.includes("absoluteUrl('/shop')") && !sitemap.includes('/shop?'));
check('sitemap includes category landing pages', sitemap.includes('absoluteUrl(`/categories/${category.slug}`)'));
check('sitemap includes brand landing pages', sitemap.includes('absoluteUrl(`/brands/${brand.slug}`)'));
check('robots keeps sitemap declaration', robots.includes('sitemap: `${siteUrl}/sitemap.xml`'));
check('qa:shop-seo script is registered', packageJson.scripts?.['qa:shop-seo'] === 'node scripts/shop-seo-audit.mjs');
check('audit:shop-release includes qa:shop-seo', packageJson.scripts?.['audit:shop-release']?.includes('qa:shop-seo'));

const passed = checks.filter((item) => item.pass).length;
const failed = checks.filter((item) => !item.pass);

for (const item of checks) {
  console.log(`${item.pass ? '✅' : '❌'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}

console.log(`\nShop SEO audit: ${passed}/${checks.length} checks passed`);

if (failed.length > 0) {
  console.error('\nFailed checks:');
  for (const item of failed) console.error(`- ${item.name}`);
  process.exit(1);
}
