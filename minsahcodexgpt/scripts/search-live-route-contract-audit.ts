if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
  } catch {
    // ignore if .env missing
  }
}

interface CheckItem {
  name: string;
  passed: boolean;
  evidence?: string;
}

const checks: CheckItem[] = [];
function check(name: string, passed: boolean, evidence = '') {
  checks.push({ name, passed: Boolean(passed), evidence });
}

async function runLiveRouteContracts() {
  const { NextRequest } = await import('next/server');
  const { GET } = await import('../app/api/search/route');
  const { SHOP_LISTING_CACHE_CONTROL } = await import('../lib/shopPerformance');

  console.log('\n================================================================');
  console.log('🚀 SEARCH & CATALOG LIVE ROUTE HTTP CONTRACT AUDIT');
  console.log('================================================================\n');

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // Test 1: Browse Mode (Empty `q`) Contract
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Testing Test 1: Browse Mode Contract (GET /api/search)...');
    const browseReq = new NextRequest('http://localhost:3000/api/search?page=1&limit=10');
    const browseRes = await GET(browseReq);
    const browseBody = await browseRes.json();

    check('Live Contract 1: Browse returns HTTP 200 OK', browseRes.status === 200, `status=${browseRes.status}`);
    check('Live Contract 1: Browse body indicates success: true', browseBody.success === true);
    check('Live Contract 1: Browse source is elasticsearch or database_fallback',
      browseBody.source === 'elasticsearch' || browseBody.source === 'database_fallback',
      `source=${browseBody.source}`
    );
    check('Live Contract 1: Browse returns products array', Array.isArray(browseBody.products));
    check('Live Contract 1: Browse pagination adheres to limit and page', browseBody.page === 1 && browseBody.limit === 10);
    check('Live Contract 1: Browse facets object contains all required groups',
      browseBody.facets &&
      Array.isArray(browseBody.facets.categories) &&
      Array.isArray(browseBody.facets.brands) &&
      Array.isArray(browseBody.facets.priceRanges) &&
      Array.isArray(browseBody.facets.availability) &&
      Array.isArray(browseBody.facets.ratings)
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2: Search Query Mode Contract (q="cream")
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Testing Test 2: Search Query Contract (GET /api/search?q=cream)...');
    const searchReq = new NextRequest('http://localhost:3000/api/search?q=cream&page=1&limit=5');
    const searchRes = await GET(searchReq);
    const searchBody = await searchRes.json();

    check('Live Contract 2: Search returns HTTP 200 OK', searchRes.status === 200, `status=${searchRes.status}`);
    check('Live Contract 2: Search preserves query token in response', searchBody.query === 'cream', `query=${searchBody.query}`);
    check('Live Contract 2: Search returns total numeric hit count', typeof searchBody.total === 'number' && searchBody.total >= 0);

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3: Multi-Filter Live Contract (skinType, skinConcern, saleOnly, minPrice)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Testing Test 3: Filter Contract (GET /api/search?skinType=oily&saleOnly=true&minPrice=200)...');
    const filterReq = new NextRequest('http://localhost:3000/api/search?skinType=oily&skinConcern=acne&saleOnly=true&minPrice=200');
    const filterRes = await GET(filterReq);
    const filterBody = await filterRes.json();

    check('Live Contract 3: Filter query returns HTTP 200 OK', filterRes.status === 200);
    check('Live Contract 3: meta.filters records all active filter keys',
      Array.isArray(filterBody.meta?.filters) &&
      filterBody.meta.filters.includes('skinType') &&
      filterBody.meta.filters.includes('skinConcern') &&
      filterBody.meta.filters.includes('saleOnly') &&
      filterBody.meta.filters.includes('price'),
      `filters=[${filterBody.meta?.filters?.join(', ')}]`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Test 4: Sort Mapping Contract (biggest-discount, price-low-high)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Testing Test 4: Sort Mapping Contract...');
    const sortDiscountReq = new NextRequest('http://localhost:3000/api/search?sort=biggest-discount');
    const sortDiscountRes = await GET(sortDiscountReq);
    const sortDiscountBody = await sortDiscountRes.json();

    check('Live Contract 4: biggest-discount normalizes to discount_desc in route meta',
      sortDiscountBody.meta?.sort === 'discount_desc',
      `meta.sort=${sortDiscountBody.meta?.sort}`
    );

    const sortPriceReq = new NextRequest('http://localhost:3000/api/search?sort=price-low-high');
    const sortPriceRes = await GET(sortPriceReq);
    const sortPriceBody = await sortPriceRes.json();

    check('Live Contract 4: price-low-high normalizes to price_asc in route meta',
      sortPriceBody.meta?.sort === 'price_asc',
      `meta.sort=${sortPriceBody.meta?.sort}`
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Test 5: Cache-Control & Headers Contract
    // ─────────────────────────────────────────────────────────────────────────
    console.log('Testing Test 5: Headers & Cache Contract...');
    const cacheHeader = browseRes.headers.get('Cache-Control');
    const isFallback = browseBody.source === 'database_fallback';
    check('Live Contract 5: Route returns safe Cache-Control header',
      Boolean(cacheHeader && (cacheHeader.includes('public') || cacheHeader.includes('no-cache') || cacheHeader.includes('no-store'))),
      `Cache-Control=${cacheHeader}`
    );
    check('Live Contract 5: Route returns X-Search-Source and X-Approx-Payload-Bytes',
      Boolean(browseRes.headers.get('X-Search-Source')) &&
      Boolean(browseRes.headers.get('X-Approx-Payload-Bytes'))
    );

  } catch (error: any) {
    console.error('❌ Live Route Execution Error:', error);
    check('Live Route Execution encountered an unhandled exception', false, error?.message);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Output Results
  // ─────────────────────────────────────────────────────────────────────────
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.length - passed;

  console.log('\n================================================================');
  for (const item of checks) {
    console.log(`${item.passed ? '✅' : '❌'} ${item.name}${item.evidence ? ` — ${item.evidence}` : ''}`);
  }
  console.log(`\nAudit Summary: ${passed}/${checks.length} live route contracts passed.`);

  if (failed > 0) {
    console.error(`\n❌ FAILED: ${failed} live contract(s) violated!`);
    process.exit(1);
  } else {
    console.log('\n🎉 SUCCESS: All live route HTTP contracts passed with 100% compliance!\n');
    process.exit(0);
  }
}

runLiveRouteContracts();
