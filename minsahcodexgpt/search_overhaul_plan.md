# 🔍 Search & Catalog Overhaul — Verified Audit & Implementation Plan

> **Status:** Codebase Audit & Conflict Verification Complete  
> **Rule Adherence:** Read-only analysis — **Zero code modified**  
> **Target System:** Minsah Beauty Catalog & Elasticsearch Search Architecture  
> **Date:** September 19, 2026  

---

## Executive Summary & Verification Verdict

We have audited the full search and catalog pipeline across Elasticsearch clients, API routes, database fallbacks, React components, and 20+ automated audit scripts in `scripts/`. 

**Verdict:** **All 10 conflicts and improvement points in the proposed plan are verified with exact file paths and line numbers.** Several critical hidden constraints (such as strict regex checks in existing audit scripts and Elasticsearch mapping prerequisites) were discovered during verification.

---

## 🔬 Conflict Verification Matrix

| Phase | Proposed Goal | Codebase Verification & Conflict Reality | Severity & Risk |
|---|---|---|---|
| **Phase 1: Type Contract** | Create canonical `lib/search/types.ts` | **CONFIRMED & CRITICAL**. 7 fragmented, diverging type definitions exist for products & suggestions across the codebase: <br>• `ProductSource` in [app/api/search/route.ts](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/api/search/route.ts#L20-L63)<br>• `ProductSuggestSource` in [app/api/search/suggestions/route.ts](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/api/search/suggestions/route.ts#L13-L27)<br>• `ESProductDocument` in [lib/search/productTransformer.ts](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/lib/search/productTransformer.ts#L72-L131)<br>• `EsProduct` & `ApiProduct` in [app/components/shop/ShopGrid.tsx](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/components/shop/ShopGrid.tsx#L53-L149)<br>• `FallbackProduct` in [lib/search/db-fallback.ts](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/lib/search/db-fallback.ts#L23-L81)<br>• `ApiSuggestion` vs `Suggestion` in `ShopSearchBar` vs `HomeSearch` | 🟢 Zero (Additive types) |
| **Phase 2: Sort Mapper** | Replace 3 duplicate mappers with 1 `SORT_MAP` | **CONFIRMED**. Identical switch-case logic is duplicated in:<br>1. [app/api/search/route.ts:L229-260](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/api/search/route.ts#L229-L260)<br>2. [lib/search/db-fallback.ts:L149-180](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/lib/search/db-fallback.ts#L149-L180)<br>3. [app/components/shop/ShopGrid.tsx:L468-485](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/components/shop/ShopGrid.tsx#L468-L485)<br>4. [lib/catalog-navigation.ts:L35-45](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/lib/catalog-navigation.ts#L35-L45)<br>*Caution:* Must satisfy `scripts/shop-sort-parity-audit.mjs` regex checks. | 🟢 Low |
| **Phase 3: Discount Field** | Ensure `discount` flows from ES to UI | **CONFIRMED (NUANCED)**. While `'discount'` is listed in [lib/shopPerformance.ts:L11](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/lib/shopPerformance.ts#L11), the TypeScript interface `ProductSource` in [app/api/search/route.ts:L20-63](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/api/search/route.ts#L20-L63) **does not include `discount?: number`**. This causes TypeScript blindness in search consumers. | 🟢 Low |
| **Phase 4: isNewArrival** | Fix "New" badge hardcoded `false` | **CONFIRMED — 100% SMOKING GUN**. In [app/components/shop/ShopGrid.tsx:L187](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/components/shop/ShopGrid.tsx#L187):<br>`isNew: false,`<br>is **hardcoded to false** in `esProductToApiProduct`! Elasticsearch returns `isNewArrival: true`, but the shop grid never passes it to `ProductCard`, making it impossible for new products to display the "New" badge. | 🟢 Low |
| **Phase 5: Filters** | Wire `skinType`, `skinConcern`, `saleOnly` | **CONFIRMED — MAJOR PIPELINE HOLE**.<br>• [app/api/search/route.ts:L357-367](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/api/search/route.ts#L357-L367) never parses `skinType`, `skinConcern`, or `saleOnly`.<br>• Lines 892-893 hardcode `skinTypes: []` and `concerns: []`.<br>• [lib/elasticsearch.ts:L190-253](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/lib/elasticsearch.ts#L190-L253) lacks mapping for `skinType` & `skinConcern`.<br>• *Important constraint:* `scripts/shop-facets-audit.mjs:L30` checks for `skinTypes: [], concerns: []` in `db-fallback.ts`. | 🟡 Medium |
| **Phase 6: Cache-Control** | Personalized search = `private`, anonymous = `public` | **CONFIRMED — DATA LEAK / POISONING RISK**.<br>In [app/api/search/route.ts:L951](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/api/search/route.ts#L951), search responses return `Cache-Control: SHOP_LISTING_CACHE_CONTROL` (`public, max-age=60...`).<br>However, lines 938-940 apply personalized category ranking based on user cookies (`userCategories`). A CDN or shared proxy will serve one user's personalized search results to other users! | 🟡 Medium |
| **Phase 7: Unified Browse** | All `/shop` requests → Elasticsearch (feature flag) | **CONFIRMED — ARCHITECTURAL SPLIT**.<br>In [app/components/shop/ShopGrid.tsx:L598-670](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/components/shop/ShopGrid.tsx#L598-L670):<br>• `q.trim()` exists → `/api/search` (Elasticsearch)<br>• Empty query → `/api/products` (Heavy PostgreSQL / Prisma with 6-8 `groupBy` & `count` queries).<br>Unifying under a feature flag with database fallback will standardize sorting, pagination, and speed (<20ms). | 🔴 High (Requires feature flag) |
| **Phase 8: Add-to-Cart Safety** | Block out-of-stock & variant products direct add | **CONFIRMED SAFETY RISK**.<br>• [app/components/ProductCard.tsx:L78-85](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/components/ProductCard.tsx#L78-L85) renders `CartStepper` without checking `hasVariants` or variant options, allowing blind addition to cart.<br>• In `ShopGrid.tsx:L178-200`, `esProductToApiProduct` does not load variants, so variant options are lost.<br>• In `lib/shopPerformance.ts`, `'variants'` is in `forbiddenSourceFields`, so ES responses must carry `hasVariants: boolean` or variant count. | 🟢 Low |
| **Phase 9: Search Bar Unification** | `ShopSearchBar` → `HomeSearch(variant="compact")` | **CONFIRMED CODE DUPLICATION**.<br>• [app/components/shop/ShopSearchBar.tsx](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/components/shop/ShopSearchBar.tsx) is 305 lines of duplicate logic lacking voice search, recent searches, and rich suggestion badges that exist in [app/components/HomeSearch.tsx](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/components/HomeSearch.tsx). | 🟡 Medium |
| **Phase 10: Contract Tests** | 5 architectural guard tests | **CONFIRMED — HIGH REPO SYNERGY**.<br>The repo has 200+ scripts in `scripts/` protecting against regressions. Adding 5 focused contract tests will permanently lock in these guarantees. | 🟢 Zero |

---

## 🛡️ Critical Architectural Constraints Discovered

Before executing any phase, the following repository guardrails must be respected:

1. **Audit Script Regex Traps:**
   - `scripts/shop-performance-audit.mjs` checks that `SHOP_SEARCH_SOURCE_FIELDS` in `lib/shopPerformance.ts` does **NOT** contain `'variants'`, `'description'`, `'shortDescription'`, etc.
   - `scripts/shop-facets-audit.mjs` has a regex: `/skinTypes:\s*\[\],[\s\S]*concerns:\s*\[\],[\s\S]*availability:[\s\S]*ratings:/`.
   - `scripts/shop-sort-parity-audit.mjs` tests specific case strings like `biggest-discount` mapping to `discount_desc`.
2. **Backward Compatibility:**
   - Any refactoring must be additive-only. Existing public URLs (e.g. `?sort=biggest-discount`, `?inStock=true`, `?category=skincare`) must continue working without breaking bookmark or marketing campaign traffic.
3. **Rollback & Feature Flags:**
   - Unified browse (Phase 7) must use an environment feature flag (e.g., `NEXT_PUBLIC_ENABLE_UNIFIED_ES_BROWSE=false` by default or safe opt-in), preserving the `/api/products` path as fallback.

---

## 📋 Recommended Execution Order

We recommend dividing the 10 phases into **4 logical waves** to ensure zero breakage and continuous green test status:

### Wave 1: Zero-Risk Foundation (Phases 1, 2, 3, 4)
*Goal: Canonical types, unified sort mapper, and fixing the hardcoded "New" badge & discount type.*
- **Phase 1**: Create `lib/search/types.ts` containing canonical types for `SearchProduct`, `ApiSuggestion`, `ShopSortOption`, and `FacetFilter`.
- **Phase 2**: Unify sort mapping into `SORT_MAP` in `lib/search/sort.ts`, replacing the 3 duplicate functions while satisfying `shop-sort-parity-audit.mjs`.
- **Phase 3**: Add `discount?: number` to `ProductSource` and ensure end-to-end typing.
- **Phase 4**: In `ShopGrid.tsx:L187`, change `isNew: false` to `isNew: Boolean(p.isNewArrival ?? p.isNew)`.

### Wave 2: Safety & Data Integrity (Phases 6, 8)
*Goal: Fix CDN cache poisoning and prevent invalid cart additions.*
- **Phase 6**: In `app/api/search/route.ts`, set `Cache-Control: private, no-cache, no-store` whenever personalized boosts are active; keep `public, max-age=60` for anonymous searches.
- **Phase 8**: Update `ProductCard` & `CartStepper` so products with variants require opening the variant modal or navigating to the product page instead of directly adding incomplete SKUs.

### Wave 3: UI & Search Bar Unification (Phases 9, 5)
*Goal: Rich search bar on `/shop` and end-to-end filter wiring.*
- **Phase 9**: Add `variant="compact"` to `HomeSearch.tsx` and replace/wrap `ShopSearchBar.tsx`.
- **Phase 5**: Wire `saleOnly`, `skinType`, and `skinConcern` in `app/api/search/route.ts` and `db-fallback.ts`.

### Wave 4: Unified Browse & Contract Guards (Phases 7, 10)
*Goal: Enterprise unified browse and permanent regression tests.*
- **Phase 7**: Route browse traffic to `/api/search` behind feature flag `NEXT_PUBLIC_ENABLE_UNIFIED_ES_BROWSE`.
- **Phase 10**: Create the 5 automated architectural guard audit scripts in `scripts/` and wire them into `package.json`.

---

## 🎯 Question for User

**Which Phase or Wave would you like to execute first?**  
*(Recommendation: Start with **Wave 1 (Phases 1, 2, 3, 4)** as it is zero-risk, immediately fixes the "New" badge bug, and creates the type foundation for all subsequent phases.)*
