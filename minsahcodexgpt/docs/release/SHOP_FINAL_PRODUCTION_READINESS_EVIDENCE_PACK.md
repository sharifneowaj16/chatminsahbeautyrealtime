# Shop Final Production Readiness Evidence Pack

**Date:** 2026-07-07  
**Scope:** Minsah Shop phased release after Phase 7B, Phase 8, Phase 9, Phase 10, Phase 11, and Phase 12.  
**Release decision:** Ready for deploy candidate after automated static release gate passes and the manual production checklist is completed in the real runtime environment.

## 1. Release objective

This evidence pack turns the completed shop phases into one deployable production-readiness checkpoint. It does not introduce new customer-facing functionality. It documents what must be verified before the final production push and locks the evidence files into the project so future releases can repeat the same checks.

## 2. Automated release gate

Run from the project root:

```bash
npm run audit:shop-release
```

The release gate must include and pass all of these guards:

```txt
qa:shop-query-contract
qa:search-filter
qa:search
qa:product-url-tracking
qa:master-tracking
qa:shop-trust
qa:shop-facets
qa:shop-sort
qa:shop-mobile-ux
qa:shop-cro-analytics
qa:shop-seo
qa:shop-performance
qa:shop-merchandising
qa:shop-polish
qa:shop-phase7b
qa:shop-production-readiness
audit:security
```

## 3. Phase completion evidence

| Area | Evidence | Status |
| --- | --- | --- |
| URL/query contract | `qa:shop-query-contract` | Required pass |
| Search filter exactness | `qa:search-filter`, `qa:search` | Required pass |
| Product URL tracking | `qa:product-url-tracking`, `qa:master-tracking` | Required pass |
| Trust parity | `qa:shop-trust` | Required pass |
| Server-side facets | `qa:shop-facets` | Required pass |
| Sort parity | `qa:shop-sort` | Required pass |
| Mobile filter/sort accessibility | `qa:shop-mobile-ux` | Required pass |
| Phase 7B runtime/accessibility pack | `qa:shop-phase7b`, `qa:shop-a11y-runtime` in runtime | Static pass + runtime manual pass |
| CRO analytics persistence | `qa:shop-cro-analytics` | Required pass |
| SEO/crawl/structured data | `qa:shop-seo` | Required pass |
| Performance payload/runtime guard | `qa:shop-performance` | Required pass |
| Merchandising/personalization | `qa:shop-merchandising` | Required pass |
| Empty/error/polish | `qa:shop-polish` | Required pass |
| Final production evidence | `qa:shop-production-readiness` | Required pass |
| Security | `audit:security` | Required pass |

## 4. Runtime/manual evidence required before production

Some checks cannot be proven by static scripts inside a zip artifact. They must be captured against a running deployment or local production build:

```bash
npm install
npm run db:migrate
npm run elasticsearch:reindex
npm run build
npm run start
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run qa:shop-a11y-runtime
npm run audit:shop-release
```

Then manually capture evidence for:

- `/shop` loads and product grid is usable on mobile and desktop.
- Mobile filter drawer opens, traps focus, closes with Escape, closes with backdrop, and can be swiped down.
- Mobile sort sheet opens separately from filter drawer and keeps public sort values only.
- No-result state shows recovery chips and the chips update the URL correctly.
- Brand search inside filter drawer works and selected brands stay visible.
- `/api/products?view=listing` and `/api/search` return `X-Approx-Payload-Bytes`.
- Canonical and robots tags are correct for clean and deep filtered shop URLs.
- JSON-LD appears in page source for shop/category/brand pages.
- `view_item_list`, `select_item`, `filter_apply`, `sort_apply`, `add_to_cart`, and `buy_now_click` appear in tracking logs.
- `buy_now_click` remains `intent_only` and must not be treated as purchase.

## 5. Go / no-go rule

Deploy can proceed only if:

1. `npm run audit:shop-release` passes.
2. `npm run qa:shop-a11y-runtime` passes in a real browser runtime.
3. Manual checklist in `docs/qa/PHASE13_FINAL_PRODUCTION_MANUAL_CHECKLIST.md` is completed.
4. Rollback plan in `docs/production/SHOP_PRODUCTION_DEPLOY_RUNBOOK.md` is reviewed.
5. No unresolved blocker is marked as P0 or P1.

## 6. Known runtime-only items

These are intentionally not treated as static zip blockers:

- Real Lighthouse/Core Web Vitals numbers.
- Live Elasticsearch index freshness.
- Real database migration execution.
- Browser-level Playwright/axe execution.
- Third-party analytics provider confirmation.
- CDN/cache behavior.

They are production verification items and must be captured in the manual checklist.
