# Phase 30 — Manual Search Production Verification Evidence

This folder is the required live-production evidence handoff for Search Hardening Phase 30.

Automated audits prove static/code contracts only. These files must be completed against the real production deployment before search is marked 10/10 production verified.

Do not mark search 10/10 production verified until every required Phase 30 proof file is completed with live production evidence.

## Overall status

| Field | Value |
| --- | --- |
| Status | PENDING LIVE PRODUCTION EXECUTION |
| Production URL | TODO |
| Verification date/time | TODO |
| Tester | TODO |
| Git commit / deploy version | TODO |
| Elasticsearch index | TODO |
| Redis / DB environment | TODO |

## Required evidence files

| File | Purpose | Status |
| --- | --- | --- |
| `search-filter-proof.md` | Product name, synonym, fuzzy, category, subcategory, tags, brand, price, and sort proof | PENDING |
| `search-index-sync-proof.md` | Admin create/update/delete/stock/price index freshness proof | PENDING |
| `search-security-proof.md` | Analytics/admin-only, public health minimal, highlight XSS safety proof | PENDING |
| `search-click-integrity-proof.md` | Fake click abuse, dedupe, rate limit, inactive product click rejection, verified conversion attribution proof | PENDING |
| `search-fallback-proof.md` | Elasticsearch healthy/down database fallback proof | PENDING |
| `search-suggestion-proof.md` | Autocomplete, popular queries, trending products, synonyms, zero-result fallback proof | PENDING |
| `search-ui-proof.md` | URL/API-driven filters, facets, sort, pagination, filtered click context proof | PENDING |

## Required command evidence

Run and paste output summaries into the matching files:

```bash
npm run qa:search
npm run qa:phase17
npm run audit:security
npm run typecheck
npm run build
```

Optional read-only production smoke test:

```bash
SEARCH_PRODUCTION_BASE_URL="https://your-production-domain.com" \
SEARCH_VERIFY_QUERY="serum" \
SEARCH_VERIFY_CATEGORY="Skin Care" \
SEARCH_VERIFY_BRAND="Some Brand" \
npm run search:production-smoke
```

Do not run write/click tests against production unless the test products, admin account, order/payment sandbox, and analytics exclusion are prepared.

## Evidence rules

1. Every check must include the exact URL/action, expected result, actual result, and pass/fail.
2. Attach screenshots, request/response snippets, admin screenshots, or logs where applicable.
3. Use test products that are excluded from marketing/analytics reporting where possible.
4. Do not mark a file PASS until all critical checks inside it pass.
5. Do not mark the overall status PASS until all seven evidence files are PASS and the required commands pass.
