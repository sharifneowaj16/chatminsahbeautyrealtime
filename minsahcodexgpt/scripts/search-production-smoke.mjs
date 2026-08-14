#!/usr/bin/env node
const baseUrlInput = process.env.SEARCH_PRODUCTION_BASE_URL;
const verifyQuery = process.env.SEARCH_VERIFY_QUERY || 'serum';
const verifyCategory = process.env.SEARCH_VERIFY_CATEGORY || '';
const verifyBrand = process.env.SEARCH_VERIFY_BRAND || '';
const adminCookie = process.env.SEARCH_ADMIN_COOKIE || '';
const writeClicks = process.env.SEARCH_VERIFY_WRITE_CLICKS === 'true';

const checks = [];
function check(name, pass, detail = '') {
  checks.push({ name, pass: Boolean(pass), detail });
}
function makeUrl(path) {
  const base = new URL(baseUrlInput);
  return new URL(path, base).toString();
}
async function requestJson(path, options = {}) {
  const url = makeUrl(path);
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { url, response, json, text };
}
function productList(json) {
  return Array.isArray(json?.products) ? json.products : Array.isArray(json?.data?.products) ? json.data.products : [];
}
function totalCount(json) {
  return Number(json?.total ?? json?.data?.total ?? json?.pagination?.total ?? 0);
}

if (!baseUrlInput) {
  console.error('SEARCH_PRODUCTION_BASE_URL is required, for example:');
  console.error('SEARCH_PRODUCTION_BASE_URL="https://example.com" npm run search:production-smoke');
  process.exitCode = 2;
} else {
  try {
    const searchParams = new URLSearchParams({ q: verifyQuery, page: '1', limit: '10' });
    if (verifyCategory) searchParams.set('category', verifyCategory);
    if (verifyBrand) searchParams.set('brand', verifyBrand);

    const search = await requestJson(`/api/search?${searchParams.toString()}`);
    const products = productList(search.json);
    check('Search API returns HTTP 200', search.response.status === 200, search.url);
    check('Search API returns success-like JSON', search.json?.success !== false, JSON.stringify(search.json).slice(0, 300));
    check('Search API declares source', ['elasticsearch', 'database_fallback'].includes(search.json?.source), `source=${search.json?.source}`);
    check('Search API returns product array', Array.isArray(products), `products=${typeof products}`);
    check('Search API total/result count available', totalCount(search.json) >= products.length, `total=${totalCount(search.json)}, products=${products.length}`);

    const suggestions = await requestJson(`/api/search/suggestions?${new URLSearchParams({ q: verifyQuery, limit: '8' }).toString()}`);
    check('Suggestions API returns HTTP 200', suggestions.response.status === 200, suggestions.url);
    check('Suggestions API returns suggestions array', Array.isArray(suggestions.json?.suggestions), JSON.stringify(suggestions.json).slice(0, 300));

    const trending = await requestJson('/api/search/suggestions?trending=true&trendingLimit=8');
    check('Trending suggestions endpoint returns HTTP 200', trending.response.status === 200, trending.url);
    check('Trending suggestions endpoint returns persistent source marker', /persistent|redis|trending/i.test(String(trending.json?.source || '')), `source=${trending.json?.source}`);

    const health = await requestJson('/api/search/health');
    check('Public health returns HTTP 200', health.response.status === 200, health.url);
    check('Public health response is minimal', health.json && Object.keys(health.json).length <= 3 && !('cluster' in health.json) && !('documentCount' in health.json), JSON.stringify(health.json));

    for (const path of ['/api/search/analytics', '/api/search/metrics', '/api/search/clicks']) {
      const publicEndpoint = await requestJson(path);
      check(`Public ${path} is admin-protected`, [401, 403].includes(publicEndpoint.response.status), `${publicEndpoint.response.status} ${publicEndpoint.url}`);
    }

    if (adminCookie) {
      const adminHealth = await requestJson('/api/search/health?detailed=true', { headers: { Cookie: adminCookie } });
      check('Admin detailed health request does not return public unauthorized status', ![401, 403].includes(adminHealth.response.status), `${adminHealth.response.status} ${adminHealth.url}`);
      check('Admin detailed health returns detailed or degraded status', /healthy|degraded|unhealthy/i.test(String(adminHealth.json?.status || adminHealth.json?.search?.source || '')), JSON.stringify(adminHealth.json).slice(0, 400));
    } else {
      console.log('ℹ️  SEARCH_ADMIN_COOKIE not set; skipping admin detailed health smoke.');
    }

    if (!writeClicks) {
      console.log('ℹ️  Write click smoke disabled by default. Set SEARCH_VERIFY_WRITE_CLICKS=true only with analytics-excluded test traffic.');
    } else {
      const firstProduct = products[0];
      if (!firstProduct?.id) {
        check('Click tracking write smoke has a product to click', false, 'No product id returned from search');
      } else {
        const click = await requestJson('/api/search/clicks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: verifyQuery,
            productId: firstProduct.id,
            productName: firstProduct.name,
            position: 1,
            resultCount: totalCount(search.json) || products.length,
            filters: {
              ...(verifyCategory ? { category: verifyCategory } : {}),
              ...(verifyBrand ? { brand: verifyBrand } : {}),
            },
          }),
        });
        check('Click tracking write smoke accepted or deduped controlled test click', click.response.status === 200 && click.json?.success === true, `${click.response.status} ${JSON.stringify(click.json).slice(0, 300)}`);
      }
    }
  } catch (error) {
    check('Production smoke completed without fatal error', false, error?.stack || error?.message || String(error));
  }

  const failed = checks.filter((item) => !item.pass);
  for (const item of checks) {
    console.log(`${item.pass ? '✅' : '❌'} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
  }
  console.log(`\nSearch production smoke: ${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length > 0) process.exitCode = 1;
}
