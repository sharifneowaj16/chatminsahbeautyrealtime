# Meta v6 Loop Engineering — Phase 6 (2026-07-17)

- Added versioned fail-closed consent and privacy policy resolution for browser Pixel/CAPI, public CAPI, Purchase outbox, and sender delivery.
- Changed non-essential tracking default to false with conservative historical consent backfill.
- Added policy/consent/retention metadata to the Meta outbox and shared server-side PII normalization, hashing, double-hash prevention, and redaction.
- Added durable consent, deletion, suppression, retention cleanup, and PII audit models, workers, schedules, and SUPER_ADMIN governance API.
- Updated public privacy and production operations documentation for withdrawal, retention, deletion, and backup limitations.
- Added 12 Phase 6 unit tests, 45 privacy audit checks, and restored 57/57 exclusion plus 25/25 retention gates.
- Raised the Meta v6 blocker audit from 10/14 to 11/14 by resolving A8.
- Prisma generation/migration, live Redis recovery, and business/legal retention approval remain explicit release gates.

# Meta v6 Loop Engineering — Phase 2 (2026-07-17)

- Added canonical catalog domain DTO, validation, fingerprinting and endpoint-specific adapters.
- Corrected Items Batch fields, money formatting, backorder availability and future sale windows.
- Added Product/ProductVariant catalog lifecycle schema and forward-only migration.
- Added managed item hashes, typed catalog states and per-batch item final status records.
- Added 8 Phase 2 unit tests, 20 static checks and 23 semantic checks.
- Raised Meta v6 blocker audit from 2/14 to 7/14.
- Resolved the existing AuthShell storefront ownership regression; repository tests are now 16/16.
- Prisma client regeneration remains an explicit network-enabled release gate; no stale snapshot was falsely stamped.

## UI/UX Phase 02 — Type Safety / Release Readiness

- Restored a strict zero-error TypeScript baseline after separating 397 cascading missing-Prisma-client errors from 47 real application errors.
- Added a committed generated Prisma client snapshot with schema SHA-256 freshness verification.
- Replaced `/api/products` conditional Prisma `as any` query typing with explicit listing/full generated payload contracts.
- Fixed real cart, search, tracking, homepage, payment bridge, variant, and fallback type mismatches without weakening `strict`.
- Added `qa:uiux-phase2`; final Phase 02 gate passes 7/7 checks and `npm run typecheck` exits 0.
- Added `UIUX_PHASE_02_TYPE_SAFETY_RELEASE_READINESS_REPORT.md`.

## Phase 11 — Post-Fix Regression Hardening

- Added `scripts/phase11-post-fix-regression-audit.mjs` to verify the Phase 1–10 UI/UX fixes still exist in source after sequential packaging.
- Added `qa:phase11-postfix-regression` and `qa:postfix-uiux-regression` package scripts.
- Re-ran release-claim verification and the new post-fix regression audit; combined check passed 59/59 source assertions.
- Added root/public asset aliases for every currently referenced static UI image/icon so customer/admin pages no longer point at missing assets: `public/logo.png`, `public/product-placeholder.jpg`, `public/favicon.ico`, `public/shortlist-icon-192.png`, and `public/shortlist-og-image.png`.
- Verified all static image/icon references under `app/`, `components/`, `contexts/`, `lib/`, and `scripts/` resolve to files under `public/`.
- Added `PHASE11_POST_FIX_REGRESSION_HARDENING_REPORT.md`.

## Phase 10 — QA Governance + Release Confidence

- Added `scripts/release-claim-source-verification.mjs` to statically verify that major Phase 1–9 UI/UX claims have matching source markers.
- Added `qa:release-claims` and `qa:phase10-release-governance` package scripts.
- Added `RELEASE_SOURCE_VERIFICATION_CHECKLIST.md` so future phase reports require source evidence, verification commands, and known limitations.
- Added a Phase 10 source-verification addendum to `PHASE9_CHECKOUT_PAYMENT_UX_POLISH.md` to document the earlier validation-gating report/source mismatch and the current source markers.
- Verified `npm run qa:release-claims` passes 20/20 checks in this artifact.
- Added `PHASE10_QA_GOVERNANCE_RELEASE_CONFIDENCE_REPORT.md`.

## Phase 9 — Account/Admin Accessibility Fixes

- Polished account product image alt text across order history, review, return, review form, and wishlist surfaces.
- Added sequence-specific alt text for return evidence images and marked decorative fallback package icons as hidden from assistive tech.
- Removed stale hardcoded admin sidebar badges from Products, Orders, and Marketing; kept only the dynamic Inbox unread badge.
- Added admin sidebar/navigation accessibility labels, submenu `aria-expanded`/`aria-controls`, and safer explicit button types.
- Added `PHASE9_ACCOUNT_ADMIN_ACCESSIBILITY_FIXES_REPORT.md`.

## Phase 8 — Global Accessibility + Mobile Design Fixes

- Updated global body/html readability defaults: `line-height: 1.5` and browser text scaling restored with `text-size-adjust: 100%`.
- Added shared mobile safe-area utilities: `minsah-bottom-safe`, `minsah-sticky-action-safe`, and readable microcopy utility.
- Added semantic Minsah design tokens for surface, soft border, success, warning, and danger colors as a foundation for consistent brand UI.
- Applied safe-area protection to customer bottom navigation and sticky CTA surfaces across home/shared nav, shop sort sheet, product sticky bar, gift checkout CTA, and category-style mobile pages.
- Removed remaining customer-facing `text-[10px]`/`text-[11px]` microcopy classes by promoting them to readable `text-xs`; dense admin tables were intentionally left unchanged.
- Added explicit `type="button"` to interactive customer/search/product/cart controls in the Phase 8 scope to prevent accidental form submits during future reuse.
- Added missing primary mobile navigation labels and common link labels on duplicated mobile bottom nav blocks.
- Added `PHASE8_GLOBAL_ACCESSIBILITY_MOBILE_DESIGN_FIXES_REPORT.md`.

## Phase 7 — Product Page Polish Fixes

- Added a branded local `public/placeholder.jpg` so product galleries no longer reference a missing fallback asset.
- Updated `ProductGallery.tsx` to use the local placeholder for missing, broken, thumbnail, and zoom image fallbacks instead of external placeholder URLs.
- Replaced internal product detail copy such as SEO/admin wording with customer-facing Bengali copy.
- Polished product accordion summaries for overview, usage, ingredients, specifications, variants, offers, and helpful links.
- Rewrote related-products helper copy to focus on easy product comparison instead of internal flow wording.
- Added `PHASE7_PRODUCT_PAGE_POLISH_FIXES_REPORT.md`.

## Phase 4 — Shop Discovery + Filter Fixes

- Fixed `/shop?q=` search-mode stock mapping so in-stock search results no longer become `stock=1` by default.
- Added lightweight stock fields to search payload handling for accurate shop cards when the index provides them.
- Changed search-mode default sort label from misleading `Featured` to `Relevance`.
- Hardened debounced filter URL updates so fast filter taps accumulate from the latest pending params.
- Updated brand drawer search to search the full facet list before display slicing.
- Replaced static ShopSearchBar listbox/option IDs with `useId()`-based IDs.
- Made the ShopSearchBar final search row keyboard/ARIA reachable and added explicit button types.
- Changed shop pagination CTA copy from `Load More Products` to `Next Page`.
- Updated ActiveFilters Clear All to preserve the current search query while clearing filters.
- Expanded drawer/sidebar clear to remove all supported filter keys.
- Hardened shop filter/sort analytics payload freshness with latest-value refs.
- Added `PHASE4_SHOP_DISCOVERY_FILTER_FIXES_REPORT.md`.



## Phase 2 — Cart Integrity + Cart Drawer UX Fixes

- Added cart item `stock` and `maxQuantity` metadata for client-side quantity boundaries.
- Added shared quantity normalization/clamping in `CartContext`.
- Updated cart API responses to include inventory policy (`trackInventory`, `allowBackorder`) so max quantity is only enforced when appropriate.
- Updated product/cart-stepper add-to-cart payloads to carry stock/max quantity where available.
- Removed misleading hardcoded cart-drawer free-delivery threshold and replaced it with checkout-calculated delivery messaging.
- Added cart drawer focus trap, initial focus, Escape handling, and focus return.
- Changed cart drawer busy state from one global busy item to per-item busy tracking.
- Updated cart badge/count surfaces to use total item quantity where appropriate.
- Added guest-cart merge failure preservation to prevent silent cart loss after login.
- Added clear-cart rollback behavior when server clear fails.
- Replaced `/cart` redirect with a real cart review page.
- Added `PHASE2_CART_INTEGRITY_DRAWER_UX_FIX_REPORT.md`.

## Phase 31F — TikTok Deploy Gate + Automated Audit

- Added standalone TikTok deploy gate `scripts/tiktok-tracking-deploy-gate.mjs`.
- Added `qa:tiktok-deploy-gate`, `qa:phase31f-tiktok-deploy-gate`, `qa:tiktok-tracking`, and `qa:phase31-tiktok` package scripts.
- Merged TikTok static deploy gate checks into existing `qa:tracking-deploy-gate` without removing Meta/GA4 env/runtime sections.
- Added guards for TikTok CSP, browser Purchase blocking, official Events API payload schema, verified Purchase gates, configurable `ttclid` retention, server-only access token safety, test event code, and fake ROAS removal.
- Added env-aware deploy blockers for enabled TikTok Events API without access token, invalid endpoint, public token leakage, invalid click ID retention, live Purchase with test event code, or live verification not enabled.
- Preserved Meta Pixel, Meta CAPI, GA4, checkout, and existing tracking deploy gate checks.


## Phase 31E — TikTok Failure Logging, Health, Dashboard

- Added TikTok Events API health metrics to the SUPER_ADMIN tracking health snapshot.
- Split Meta CAPI, GA4, and TikTok failure counts by `provider` so TikTok/GA4 failures do not pollute Meta CAPI health metrics.
- Added TikTok Purchase sent/pending/failure/token-health cards and TikTok match-key coverage cards for `ttclid`, `_ttp`, and IP+UA.
- Persisted TikTok sent/failure counts in `TrackingHealthCheck` via additive migration.
- Updated failure table/modal labels so TikTok rows show `ttclid`/`ttp` instead of Meta `fbc`/`fbp` labels.
- Removed fake TikTok traffic-source revenue/conversions and hid TikTok ROAS from the mock analytics dashboard until verified Events API data is live.
- Added `qa:phase31e-tiktok-health` static audit.

## Phase 31D — TikTok Server-side Events API Purchase Pipeline

- Added server-only TikTok Events API Purchase sender for verified COD and online purchases.
- Added additive TikTok BullMQ job types and worker routing without renaming Meta CAPI/GA4 queue flows.
- Queued TikTok COD Purchase only after admin/Telegram phone confirmation.
- Queued TikTok online Purchase only after verified payment completion.
- Added server-only TikTok Events API env gates and live verification guard.
- Added TikTok failure logging under `provider="TIKTOK"` and critical token/env retention classification.
- Added `qa:phase31d-tiktok-events-api` static audit.

# Final RC — Deployment Readiness & Production Handoff

- Added final deployment handoff document for the checkout/payment release candidate.
- Added `scripts/final-rc-deployment-readiness-audit.mjs` and `qa:final-rc` package script.
- Re-ran checkout release gate, security audit, delivery regression audit, and shop production readiness audit.
- Documented dependency-installed runtime gates: `npm ci`, Prisma generate/migrate, `npm run typecheck`, `npm run build`, and staging COD/bKash/Nagad smoke tests.

# Phase 11 — Checkout Release Gate QA

- Added `scripts/phase11-checkout-release-gate-audit.mjs` to run all checkout release gate checks together.
- Added `qa:phase11-checkout-release-gate` and `qa:checkout-release-gate` package scripts.
- Added manual runtime checklist for COD, bKash, Nagad, duplicate-submit, security payloads, Pathao availability, expiry, stock lifecycle, and tracking.
- Added checkout release evidence pack with GO/NO-GO rules and required dependency-installed `typecheck`/`build` commands.
- Added production deploy runbook with migration, smoke-test, monitoring, and rollback steps.

# Phase 10 — Checkout Tracking Alignment

- Added single-page checkout tracking for `view_cart`, `begin_checkout`, `add_shipping_info`, and `add_payment_info`.
- Moved `begin_checkout` away from automatic page-load firing and tied it to first checkout/address interaction.
- Added one-time guards so checkout tracking events do not duplicate on re-render, quantity updates, or payment retries.
- Kept `purchase` tied to confirmed COD / verified online payment lifecycle rather than client-side checkout submit.
- Added `scripts/phase10-checkout-tracking-alignment-audit.mjs` and `qa:phase10-checkout-tracking` package script.

# Phase 9 — Checkout + Payment UX Polish

- Removed blocking checkout `alert(...)` validation and replaced it with inline field-level messages.
- Added checkout disabled CTA reason copy and friendly Bangla/Banglish validation messages.
- Added client-side BD phone normalization/validation on checkout and payment pages.
- Added accessible validation attributes (`aria-invalid`, `aria-describedby`).
- Added friendly payment error mapping for bKash/Nagad.
- Added `qa:phase9-checkout-ux` audit script.

## Phase 7 — Online Payment Lifecycle & Stock Reservation

- Added online payment order states `PENDING_PAYMENT` and `PAYMENT_EXPIRED`.
- Added inventory reservation support with `reservedQuantity` on products and variants.
- Added order lifecycle timestamps: `paymentExpiresAt`, `stockReservedAt`, `stockFinalizedAt`, `stockReleasedAt`, and `adminNotifiedAt`.
- Updated checkout order creation so COD orders remain immediately confirmed/finalized, while bKash/Nagad orders reserve stock for 15 minutes and wait for verified payment.
- Updated Buy Now order creation with the same online pending-payment reservation lifecycle.
- Updated verified payment webhook to finalize stock, mark online orders `CONFIRMED`, queue purchase tracking, and send admin Telegram notification only after paid verification.
- Added release logic for failed/late/expired online payment reservations.
- Added cron endpoint `/api/cron/release-unpaid-orders` for unpaid bKash/Nagad order expiry.
- Added `lib/online-payment-stock.ts` and `scripts/phase7-online-payment-lifecycle-audit.mjs`.
- Added `qa:phase7-payment-lifecycle` package script.


## Phase 5 — Delivery Address & Pathao Area Availability

- Kept the approved checkout address fields only: Full name, Phone, City, Zone, Area, Street address.
- Reordered checkout address inputs so Street address appears after City/Zone/Area.
- Replaced the long street-address placeholder with the simple `Street address` label.
- Added robust Pathao `home_delivery_available` normalization for boolean, numeric, and string API values.
- Disabled unavailable Pathao areas in checkout and added a visible unavailable-area warning.
- Updated checkout submit guard so orders require an available Pathao home-delivery area before delivery quote/order submit.
- Added server-side Pathao area verification in `/api/orders` for both new checkout addresses and saved addresses.
- Added typed `PathaoAreaAvailabilityError` responses for unavailable/mismatched/unverified Pathao areas.
- Added `scripts/phase5-delivery-address-pathao-availability-audit.mjs` and `qa:phase5-delivery-address` package script.


## Phase 6 — Checkout Idempotency & Duplicate Order Protection

- Added `checkoutIdempotencyKey` and `checkoutPayloadHash` to `Order` with a user+key unique guard.
- Added DB migration `20260708000000_add_checkout_order_idempotency` for idempotency fields and indexes.
- Added `lib/checkout-idempotency.ts` for required header validation and stable SHA-256 payload hashing.
- Updated `/api/orders` to require `Idempotency-Key`, store the key/hash, return the existing order for same-key same-payload replays, and reject same-key different-payload reuse with `409`.
- Added concurrent duplicate protection for unique-key races so only one transaction can create/decrement/notify.
- Updated `/checkout` to generate a client idempotency key, persist it across network retry, send it as `Idempotency-Key`, and reset it after successful handoff.
- Added `scripts/phase6-checkout-idempotency-audit.mjs` and `qa:phase6-idempotency` package script.
- Updated Phase 4 payment audit to accept the shared checkout response builder introduced in Phase 6.


## Phase 4 — Payment Order-First Gateway Handoff

- Added structured `paymentStep` response from `/api/orders` for bKash/Nagad orders.
- Added owner-bound `/api/orders/[id]/payment-summary` endpoint for server order amount/payment state.
- Updated bKash and Nagad payment pages to load payable amount from server order summary instead of cart context.
- Blocked missing/invalid orderId payment form activation.
- Removed bKash fallback to the disabled legacy execute route.
- Added `scripts/phase4-payment-order-first-gateway-audit.mjs` and `qa:phase4-payment` package script.


## Phase 3 Cart + Checkout Single-Page Unification — 2026-07-08

- Converted `/cart` into a canonical redirect to `/checkout`, removing the duplicate order-creation path.
- Added inline cart item review, quantity controls, and remove controls to `app/checkout/page.tsx`.
- Replaced `/checkout/payment-method` navigation with inline payment method cards inside `/checkout`.
- Converted `/checkout/payment-method` into a legacy redirect to `/checkout` so bKash/Nagad gateway pages are not opened before order creation.
- Added `scripts/phase3-cart-checkout-unification-audit.mjs` and `qa:phase3-cart-checkout` for static regression evidence.
- Updated the Phase 1 order-validation audit to accept the Phase 3 cart redirect model.


## Phase 1 Order API Validation Hardening — 2026-07-08

- Added strict order request normalization in `lib/order-validation.ts`.
- Added Bangladesh phone normalization/validation in `lib/phone.ts`.
- Added server-side coupon validation in `lib/coupon-validation.ts`.
- Updated `/api/orders` to ignore client `couponDiscount`, enforce variant ownership, reject invalid quantities, and require detailed street address.
- Updated cart and checkout forms to send `streetAddress` separately from Pathao area.
- Added `scripts/phase1-order-validation-security-audit.mjs` for regression evidence.


## Phase 13 — Final Production Readiness Evidence Pack

- Added final shop production-readiness evidence pack under `docs/release/SHOP_FINAL_PRODUCTION_READINESS_EVIDENCE_PACK.md`.
- Added final manual production checklist under `docs/qa/PHASE13_FINAL_PRODUCTION_MANUAL_CHECKLIST.md`.
- Added production deploy and rollback runbook under `docs/production/SHOP_PRODUCTION_DEPLOY_RUNBOOK.md`.
- Added final release manifest under `docs/release/SHOP_FINAL_RELEASE_MANIFEST_2026_07_07.md`.
- Added `qa:shop-production-readiness` static evidence audit and included it in `audit:shop-release`.
- Documented runtime-only checks for Playwright/axe, Lighthouse/Core Web Vitals, database migration, Elasticsearch reindex, analytics provider verification, and post-deploy screenshots.


## Phase 7B — Mobile Discovery & Runtime Accessibility Completion

- Added brand search inside the mobile filter drawer while preserving selected brands above search matches.
- Added no-result recovery chips for brand/category/price/sort/in-stock/rating blockers.
- Added live-facet powered quick discovery chips for mobile/desktop shop recovery.
- Added filter preview pending copy while URL/filter fetch updates are in flight.
- Added swipe-down close support for filter and sort bottom sheets.
- Added Playwright + axe runtime mobile accessibility test pack.
- Added compact-phone manual QA checklist.
- Added `qa:shop-phase7b` and included it in `audit:shop-release`.

## 2026-07-07 — Phase 11: Real Merchandising & Personalization Layer

- Replaced current-page-derived shop merchandising with a dedicated `/api/shop/merchandising` server endpoint.
- Added `lib/shopMerchandising.ts` to build contextual, catalog-wide merchandising sections from active in-stock products.
- Added contextual sections for current search/filter, popular category picks, brand picks, real deals, trending products, and fresh arrivals.
- Added listing-light merchandising payloads with trust badges, stock status, discount, category/brand slugs, and card-safe images.
- Kept personalization contextual only: no fake user profile, no sensitive user data, and no PII-based recommendations.
- Updated `ShopMerchandisingSections` to fetch server-backed sections, track impressions, and track item clicks with section-specific list names.
- Added deterministic small-catalog fallback so development/demo catalogs still render merchandising safely.
- Added `npm run qa:shop-merchandising` and included it in `npm run audit:shop-release`.


## Phase 8 — Shop CRO Analytics Server Reliability

- Added sanitized server-side ShopTrackingEvent persistence for shop CRO events.
- Added item-level payload retention for view/select/add/buy/filter/sort/page events.
- Added SHOP_CRO failure logging through tracking failure retention if persistence fails.
- Added add_to_cart, clear_filter, and page_change shop analytics events.
- Kept buy_now_click intent-only and not purchase/lead.
- Added qa:shop-cro-analytics to audit:shop-release.


## 2026-07-07 — Phase 6: Sort Parity & Biggest Discount Ranking Fix

- Fixed search-mode `biggest-discount` so it maps to `discount_desc` instead of relevance.
- Added Elasticsearch `discount desc` sorting with `_score` and `createdAt` tie-breakers.
- Added DB fallback `discountPercentage desc` sort parity.
- Hardened `/api/products` invalid sort fallback to deterministic `featured`.
- Kept shop URL and `sort_apply` analytics on public sort values while mapping only `/api/search` requests internally.
- Added `npm run qa:shop-sort` and included it in `npm run audit:shop-release`.
- QA passed: `qa:shop-sort`, `qa:search-filter`, `qa:search`, `qa:shop-facets`, and `audit:shop-release`.

# Phase 4 — Master Regression Release Lock

- Fixed the remaining product URL tracking regression gate.
- `HomeProductSections.tsx` now imports and uses `productPath(product)` while mapping product section card data.
- `flash-sale/page.tsx` now imports and uses `productPath(product)` while mapping flash sale card data.
- `HomeProductCard` accepts a precomputed canonical `href` and falls back to `productPath(product)` defensively.
- Added `npm run audit:shop-release` as the blocking Phase 1–4 shop release gate.
- Added `PHASE4_MASTER_REGRESSION_RELEASE_LOCK_REPORT.md` and `docs/release/SHOP_RELEASE_QA_2026_07_07_PHASE4.md`.
- Verified release gates: shop query contract, search filter, master search, product URL tracking, master tracking, shop trust, and security all pass.

# Meta Pixel / CAPI / GA4 Strict Tracking Fixes

## Current patch: HttpOnly Browser Purchase token bridge

- Added `app/checkout/payment-bridge/route.ts`.
  - Accepts the one-time signed `bpt` only on a server route.
  - Verifies the token against the UUID `orderId`.
  - Sets the token into an HttpOnly `SameSite=Lax` cookie.
  - Immediately redirects to a clean `/checkout/payment-complete?orderId=...` URL without `bpt`.

- Updated `app/checkout/payment-complete/page.tsx`.
  - No longer reads `bpt` from query string.
  - No longer sends token in request body.
  - Calls `/api/tracking/meta/online-purchase` with only `{ orderId }`; the server reads the HttpOnly cookie.

- Updated `app/api/tracking/meta/online-purchase/route.ts`.
  - Requires the HttpOnly browser purchase token cookie.
  - Clears the cookie after success/terminal skip.
  - Keeps the existing verified-paid, amount/currency, and atomic DB claim checks.

- Updated `app/api/payments/verified/route.ts`.
  - Returns `paymentBridgeURL` for customer redirect.
  - Returns clean `paymentCompleteURL` for display/reference.
  - Server CAPI Purchase queue remains independent.

- Updated `lib/tracking/pixels/FacebookPixel.tsx`.
  - Sanitizes sensitive query params from CAPI `event_source_url` defensively.

- Updated `lib/tracking/manager.ts`.
  - GA4 tracking manager now supports both canonical `NEXT_PUBLIC_GA4_MEASUREMENT_ID` and legacy `NEXT_PUBLIC_GA_MEASUREMENT_ID`.



## Follow-up patch: verified payment customer redirect mode

- Updated `app/api/payments/verified/route.ts` again.
  - Supports customer-return redirect mode via `?redirect=1` or `?customerRedirect=true`.
  - In redirect mode, the route still requires the normal signed webhook payload and verifies signature, paid status, amount, and currency before marking the order paid.
  - After verified paid handling, it returns an HTTP `303` redirect to `paymentBridgeURL`.
  - Failed/pending/mismatched payments redirect to `/checkout/order-confirmed?...&payment=...` and do not fire Purchase.
  - JSON webhook/API behavior remains unchanged when redirect mode is not requested.

Integration option for payment gateways/server callbacks:

```txt
POST /api/payments/verified?redirect=1
Headers: x-payment-signature: sha256=<HMAC over raw JSON body>
Body: { orderId, gateway, transactionId, amount, currency: "BDT", status: "paid" }

Success response: 303 Location: /checkout/payment-bridge?orderId=...&bpt=...
```

## Required integration note

For online Browser Pixel Purchase to fire, payment success/return must redirect the customer to `paymentBridgeURL`, not directly to `/checkout/order-confirmed` and not directly to the clean `paymentCompleteURL`.

Meta Pixel, Meta CAPI, and GA4 are all kept enabled by this patch; the Browser Purchase token is removed from rendered pages and from Meta PageView CAPI URLs.

## bKash/Nagad payment-return wiring for strict Meta Purchase flow

- Checkout order creation now redirects bKash/Nagad orders to the provider payment page instead of the generic order-confirmed page.
- bKash/Nagad payment pages pass the created `orderId` to provider create APIs; provider create APIs use DB order total and order number instead of trusting frontend cart totals.
- Added `/api/payments/bkash/callback` and `/api/payments/nagad/callback` provider return handlers.
- Provider return handlers verify/execute provider payment, then call the existing signed `/api/payments/verified?redirect=1` flow server-to-server.
- Verified paid provider returns now redirect the customer into `/checkout/payment-bridge`, which sets the HttpOnly browser-purchase token cookie and continues to clean `/checkout/payment-complete`.
- Failed/cancelled/pending provider returns redirect to `/checkout/order-confirmed` with a payment status reason and do not fire Purchase.

## Meta CAPI Core Event Queue Fix

- `/api/facebook-capi` no longer sends non-Purchase Meta CAPI events directly to Graph API.
- PageView, ViewContent, AddToCart, InitiateCheckout, AddToWishlist, Search, and CompleteRegistration now enqueue `core_event` jobs into the existing BullMQ Meta CAPI queue.
- Browser Pixel still fires immediately with `eventID`; queued CAPI uses the same `event_id` for Meta deduplication.
- Core CAPI jobs preserve the original `event_time`, `event_id`, and sanitized `event_source_url` across retries.
- The Meta CAPI worker now processes both Purchase jobs and core CAPI event jobs.
- Core CAPI failures are logged to `MetaCapiFailure` using safe summaries only: event name/id, order id when present, status/error code/message, and matching-signal booleans.
- Retry behavior matches Purchase queue: max 5 attempts, exponential backoff, retry 429/5xx/network, do not blindly retry 4xx/code 100/code 190.
- `sanitizeUrl()` now removes `bpt`, `access_token`, `signature`, `sig`, phone, and other sensitive params defensively.

- Meta CAPI worker helpers accept both `META_CAPI_ACCESS_TOKEN` and legacy `FACEBOOK_CONVERSION_API_TOKEN`, matching the public queue route configuration check.


## GA4 Measurement Protocol Purchase Queue

- Added server-side GA4 Measurement Protocol Purchase sender for COD phone-confirmed and online verified-paid flows.
- Added `ga4_purchase` BullMQ job type processed by the existing Meta CAPI worker.
- COD GA4 purchase is queued only after Telegram/phone confirmation and uses `phoneConfirmedAt` as `timestamp_micros`.
- Online GA4 purchase is queued only after verified paid webhook/payment route and re-checks verified `Payment` row with signature, amount, and currency match.
- GA4 purchase uses `transaction_id = orderId`, `currency = BDT`, actual order total, shipping, tax, coupon, and item array.
- Added `gaPurchaseProcessingAt` DB field and migration for race-safe idempotency together with `gaPurchaseSent` / `gaPurchaseSentAt`.
- Requires `GA4_API_SECRET` plus `NEXT_PUBLIC_GA4_MEASUREMENT_ID` (or `GA4_MEASUREMENT_ID`).

## Meta/GA4 catalog content ID consistency

- Added `lib/tracking/meta-content-id.ts` as the single canonical content-id helper.
- Browser Pixel ecommerce events, Meta CAPI Purchase, online Browser Purchase payload, and GA4 Measurement Protocol Purchase now use the same priority:
  1. `variantId` for shade/size variants
  2. `productId` for non-variant products
  3. `sku` as legacy/catalog fallback
  4. order/cart item `id` as final fallback
- This keeps `content_ids` / `contents[].id` / GA4 `item_id` aligned across ViewContent, AddToCart, InitiateCheckout, Purchase, and GA4 purchase.

## Sensitive URL Sanitization Fix

- Added shared `lib/tracking/sanitize-url.ts` helper to remove sensitive query parameters before storing or sending tracking URLs.
- Excluded `/checkout/payment-bridge` from proxy tracking cookie capture so temporary `bpt` URLs cannot become first landing URLs.
- Sanitized `mb_first_landing_path`, `mb_first_landing_url`, and `mb_referrer` before saving cookies.
- Sanitized decoded attribution cookies again at order create time so older raw cookies cannot be saved to orders.
- Sanitized COD and online Meta Purchase `event_source_url` before sending CAPI payloads.

Sensitive params removed include: `bpt`, `token`, `access_token`, `signature`, `sig`, `email`, `phone`, `mobile`, `msisdn`, `password`, `key`, `secret`, `auth`, and `authorization`.

## Purchase CAPI event_source_url hardening

- Added `getSafePurchaseEventSourceUrl()` in `lib/tracking/meta-capi-cod-purchase.ts`.
- COD and online Purchase CAPI now pass `event_source_url` through the shared sensitive URL sanitizer and normalize relative URLs to absolute site URLs.
- Sensitive params such as `bpt`, `token`, `access_token`, `signature`, `email`, `phone`, etc. are removed before Meta receives Purchase CAPI `event_source_url`.

## Browser Purchase claim semantics fix

- Renamed the Browser Pixel Purchase DB guard from `metaBrowserPurchaseSentAt` to `metaBrowserPurchaseClaimedAt`.
- The field now accurately means: a signed/verified browser purchase flow was authorized and claimed exactly once across browsers/devices.
- It no longer implies the browser Pixel request was guaranteed delivered to Meta, because server code cannot prove ad-blocker/browser/network delivery.
- Added migration `20260629030000_rename_meta_browser_purchase_sent_to_claimed` to rename the existing column/index safely when present.
- Updated `/api/tracking/meta/online-purchase` atomic claim logic to use `metaBrowserPurchaseClaimedAt`.

## bKash/Nagad sandbox callback verification hardening

- Added `lib/payments/provider-callback-utils.ts` to parse callback data from query string, JSON body, form body, or raw URL-encoded body.
- Hardened bKash callback status mapping for sandbox/live aliases (`success`, `completed`, `paid`, `cancelled`, `failed`, etc.).
- bKash callback now tries `executePaymentRaw()` first and falls back to `queryPayment()` when execute fails or returns a non-paid response.
- Hardened Nagad callback status mapping for sandbox/live aliases and status codes (`000`, `0000`, `00`).
- Both providers now send paid status to `/api/payments/verified?redirect=1` only after provider-paid verification, so Meta/GA4 Purchase remains gated by verified amount/currency/signature logic.
- Failed/cancelled callbacks safely redirect to order-confirmed with no Purchase.


## GTM / GA4 Purchase duplicate prevention

- GA4 Purchase remains server-side only via Measurement Protocol (`ga4_purchase` queue).
- Client-side `trackingManager.track('Purchase')` no longer sends GA4 `purchase`; it logs a warning and pushes only a safe `mb_ga4_purchase_blocked` diagnostic event.
- Google Analytics `gtag()` wrapper now suppresses any frontend `gtag('event', 'purchase', ...)` call.
- Google Tag Manager and GA4 loader install a `dataLayer` guard before loading GTM/gtag scripts. The guard blocks `purchase`, `ga4_purchase`, and ecommerce purchase-like dataLayer pushes from app code.
- A `mb_tracking_policy` dataLayer flag is pushed so GTM containers can explicitly check that GA4 purchase source is `server_measurement_protocol`.

Manual GTM dashboard check is still required: remove or condition any GA4 Purchase tag inside GTM that fires from PageView/URL triggers. Code can block app dataLayer purchase pushes, but it cannot rewrite tags already configured inside the GTM container UI.

## Final strict audit blocker fixes

- Removed `paymentBridgeURL` / raw `bpt` token-bearing URL from `/api/payments/verified` JSON responses. Redirect mode still uses the bridge URL via HTTP 303 for customer-browser returns.
- Core Meta CAPI requests now always include `custom_data` (`{}` for PageView/no custom fields) to satisfy strict CAPI payload requirements.

## Admin tracking diagnostics endpoint

- Added `GET /api/admin/tracking/order/[orderId]` for safe manual Meta Pixel/CAPI/GA4 verification.
- Endpoint uses existing admin authentication (`getVerifiedAdmin`).
- Response includes purchase tracking status, payment status, verification booleans, saved attribution presence booleans, GA4 status, and safe failure summaries.
- Endpoint intentionally does **not** return raw email, raw phone, `_fbp`, `_fbc`, customer IP, customer user-agent, access tokens, browser purchase tokens, raw gateway payloads, or full unsafe CAPI payloads.
- Supports lookup by DB order `id` or `orderNumber` for admin convenience.

## Phase 5 — Server-Side Facets & Complete Filter Discovery (2026-07-07)

- Added server-side facet payload to `/api/products` for categories, brands, price ranges, availability, and ratings.
- Normalized `/api/search` facet response to the same frontend contract, using slug-safe values and human labels.
- Updated database search fallback to return the same facet groups.
- Updated `ShopGrid` so filter chips come from server facets, not the current rendered product page.
- Preserved active filters in the UI even when their current server count is zero.
- Added `scripts/shop-facets-audit.mjs` and `npm run qa:shop-facets`.
- Added `qa:shop-facets` to `npm run audit:shop-release`.

## Phase 7A — Mobile Filter / Sort UX & Accessibility Hardening

- Added Headless UI-powered `ShopFilterDrawer` and `ShopSortSheet` components.
- Replaced the old mobile Sort button behavior that opened the filter drawer with a dedicated sort sheet.
- Introduced `openPanel: 'filter' | 'sort' | null` for mutually exclusive mobile panels.
- Added shared `useBodyScrollLock` and simplified `useBackClose` hooks.
- Refactored `CartDrawer` to use shared body scroll lock.
- Added explicit `sort_open` tracking while keeping `filter_open` and `sort_apply` separate.
- Consolidated mobile sticky UX: shop page header is desktop-sticky only, and ShopGrid has one mobile sticky search/filter/sort control panel.
- Cleaned unused `SortDropdown` options so `a-z`/`z-a` no longer appear in shop sort UI.
- Added `npm run qa:shop-mobile-ux` and included it in `npm run audit:shop-release`.
- Added `PHASE7A_MOBILE_FILTER_SORT_ACCESSIBILITY_REPORT.md`.

## Phase 9 — SEO Crawl Strategy & Server-Side Structured Data

- Added shared shop SEO canonical/noindex helper.
- Chose `/shop`, `/categories/[slug]`, and `/brands/[slug]` as canonical indexable discovery pages.
- Canonicalized clean shop category/brand filter URLs to landing pages.
- Marked search/sort/pagination/deep-filter shop URLs as noindex/follow.
- Added server-rendered ItemList JSON-LD for shop, category, and brand product lists.
- Added stock-based Product offer availability and BDT pricing in ItemList schema.
- Added `npm run qa:shop-seo` and included it in `audit:shop-release`.


## Phase 10 — Performance Payload & Runtime QA

- Added Elasticsearch `_source` allowlist for shop search listing payloads.
- Added approximate payload-byte headers to search and products API responses.
- Kept `/api/products?view=listing` lightweight with listing-only Prisma `select`, image cap, variant cap, and public limit cap.
- Added stable `ProductGridSkeleton` and reused it in shop loading/Suspense states.
- Hardened ProductCard image loading: first visible images are priority/high fetch; below-fold images lazy-load.
- Added lazy loading for shop merchandising and search suggestion thumbnails.
- Added debounced filter URL navigation in ShopGrid.
- Added `qa:shop-performance` and included it in `audit:shop-release`.

## Phase 12 — Visual Polish, Empty States & Microcopy Finalization

- Added shared shop feedback cards for empty/error/info states.
- Replaced inline no-products block with contextual ShopEmptyState recovery actions.
- Replaced hard page reload retry with local product-list retry state.
- Added merchandising fallback when server recommendations fail or return no sections.
- Added no-suggestion microcopy to ShopSearchBar.
- Improved active filter/search tap targets and focus states.
- Added reduced-motion skeleton handling.
- Added npm run qa:shop-polish and included it in audit:shop-release.


## Phase 8 — Payment Step Server-Side Order Summary Hardening

- Added `lib/payments/payment-summary.ts` as the central owner-bound payment summary contract.
- Refactored `/api/orders/[id]/payment-summary` to use the shared server summary helper.
- bKash/Nagad payment pages now show server order status, payment status, expiry, and summary-driven disabled state.
- bKash/Nagad payment pages validate BD mobile numbers with `^01[3-9]\d{8}$`.
- Payment create guard now blocks non-`PENDING_PAYMENT` order states and non-`PENDING` payment statuses.
- Added `scripts/phase8-payment-summary-hardening-audit.mjs` and `qa:phase8-payment-summary` package script.

## Phase 10 — Checkout Tracking & Analytics Alignment (2026-07-08)

- Added `ViewCart` and `AddShippingInfo` tracking event types.
- Added GA4 mappings for `view_cart` and `add_shipping_info`.
- Added ecommerce helpers: `trackViewCart`, `trackAddShippingInfo`, `trackAddPaymentInfo`.
- Updated checkout tracking so `view_cart` fires on cart review page load, while `begin_checkout` fires from first checkout interaction instead of automatic page load.
- Added one-time guards for `view_cart`, `begin_checkout`, `add_shipping_info`, and `add_payment_info` in the single-page checkout.
- Kept checkout client-side `Purchase` blocked; online purchase remains tied to verified server-side payment flow.
- Added `scripts/phase10-checkout-tracking-alignment-audit.mjs` and `qa:phase10-checkout-tracking` package script.


## Phase 31A — TikTok Pixel CSP Unblock

- Added `https://analytics.tiktok.com` to production CSP `script-src`, `connect-src`, and `img-src` in `proxy.ts`.
- Preserved existing Meta Pixel, Meta CAPI, GA4, GTM, MinIO, and websocket CSP entries.
- No checkout, order, Meta CAPI, GA4, attribution, or queue logic changed.
- Validation passed: phase7 TikTok safety, master tracking, checkout tracking, checkout release gate, and tracking attribution audits.

## Phase 31B — TikTok Browser Reliability + Route Tracking

- Added TikTok init-ready flag via `ttq.ready()`.
- Added bounded retry to `trackTikTok()` so early browser events are not silently dropped while the TikTok script loads.
- Added TikTok-specific browser payload mapper without changing Meta Pixel, Meta CAPI, or GA4 payload paths.
- Added `TikTokRouteTracker` for Next.js App Router client-side navigation page tracking.
- Kept browser-side TikTok Purchase blocked and updated diagnostics/mapping to the official `Purchase` event name.
- Added `qa:phase31b-tiktok-browser` static audit.
- Updated Phase 7 TikTok safety docs/audit from legacy `CompletePayment` wording to `Purchase`.

Validation passed:

```txt
npm run qa:phase31b-tiktok-browser       ✅ 11/11
npm run qa:phase7-tiktok-tracking-safety ✅ 15/15
npm run qa:master-tracking               ✅ 74/74
npm run qa:phase10-checkout-tracking     ✅ 29/29
npm run qa:phase11-checkout-release-gate ✅ 73/73
npm run qa:tracking-attribution          ✅ 106/106
```


## Phase 31C — TikTok Attribution Capture

- Added configurable TikTok Click ID retention with `TIKTOK_CLICK_ID_MAX_AGE_DAYS` and `NEXT_PUBLIC_TIKTOK_CLICK_ID_MAX_AGE_DAYS`.
- Added `lib/tracking/tiktok-attribution.ts` helper for TikTok attribution cookie names, max-age clamping, and safe value cleanup.
- Added server-side `ttclid` capture in `proxy.ts` with consent guard and no overwrite of existing TikTok Click ID.
- Added client-side `ttclid` fallback capture in `AttributionCookieCapture.tsx` with consent guard.
- Added TikTok order attribution and future Events API idempotency fields: `tiktokClickId`, `tiktokTtp`, `tiktokExternalId`, `tiktokEventId`, `tiktokPurchaseSent`, `tiktokPurchaseSentAt`, `tiktokPurchaseProcessingAt`.
- Added additive Prisma migration `20260709010000_phase31c_tiktok_attribution_capture`.
- Added `qa:phase31c-tiktok-attribution` audit and preserved Meta Pixel/CAPI/GA4 attribution fields.
## Phase 31 Final Release Validation & Activation Runbook

- Added final Phase 31 validation and activation runbook.
- Re-ran TikTok tracking, master tracking, attribution, and checkout release static QA gates.
- Confirmed TikTok deploy gate is in safe pre-activation WARN state until real production env values are configured.
- Documented staging activation, production env switch, go/no-go gate, Meta/GA4 smoke checks, and rollback env toggles.



## Phase 1 — Checkout Conversion Blockers Fix

- Added checkout validation gating with touched/submit state.
- Added visible checkout labels and accordion/payment ARIA semantics.
- Fixed unauthenticated login CTA disabled behavior.
- Added dedicated empty-cart checkout state.
- Added delivery quote retry, area ID quote payload, and real cart item weight support when available.
- Preserved cart for online payment redirects; COD still clears cart immediately after order creation.
- Added contextual aria-labels for checkout quantity/remove controls.

## Phase 3 — Search Critical UX & Correctness Fixes

- Fixed invalid nested interactive product cards on `/search` by replacing full-card link wrappers with article containers and separate product links.
- Fixed `/search` price range chips to use API `min/max/label` instead of brittle display string parsing.
- Added combobox/listbox ARIA semantics and keyboard support for API, recent, and trending search suggestions.
- Added user-visible search error card with retry action instead of console-only failure.
- Fixed clear-search action to clear input, results, URL, error state, and page state together.
- Allowed filter-only search execution when filters are active and query is empty.
- Added associated labels/IDs for search filter fields and semantic switch state for the in-stock toggle.
- Added accessible labels to search utility and active-filter remove buttons.
- Reduced noisy `/search` URLs by omitting default sort/page/limit params.
- Added fallback-safe `exactTotal`/`displayTotal` response fields and UI copy for suggested products.
- Rebuilt fallback facets from fallback products instead of stale zero-result ES aggregations.
- Hardened category/subcategory ES filtering to match both label and slug fields.
- Added `PHASE3_SEARCH_CRITICAL_FIXES_REPORT.md`.

## Phase 5 — Buy Now Modal Fixes

- Added accessible dialog semantics, focus trap, Escape close, and focus return to `BuyNowModal`.
- Added complete street address collection for Buy Now orders and updated the order payload to use it.
- Added `baseStock` support and simple-product stock clamping for Buy Now quantity controls.
- Passed known stock into Buy Now launchers across home, shop, search, product, and new-arrivals surfaces.
- Updated unauthenticated Buy Now summary CTA to say `Login to place order` and added a pre-submit sign-in notice.
- Changed Buy Now success flow so success state is visible before redirecting to confirmation.
- Added `pathao_area_id` to Buy Now delivery quote requests.
- Added product/variant-specific ARIA labels to Buy Now quantity buttons.

Report: `PHASE5_BUY_NOW_MODAL_FIXES_REPORT.md`


## Phase 6 — Header & Navigation Fixes

- Replaced legacy `Header.tsx` hardcoded cart count with real `useCart()` total quantity.
- Unified customer-facing search navigation to `/shop?q=` from header, autocomplete, instant search, bottom nav, and SearchAction schema.
- Added accessible labels to wishlist/cart/account/search navigation controls.
- Added combobox/listbox ARIA semantics and stable IDs to legacy header search suggestions.
- Reworked `MobileMenu` category rows to avoid nested interactive `<button><Link>` controls.
- Added mobile menu dialog semantics, menu button labels, expand/collapse ARIA, and auth-aware account links.
- Updated mobile bottom navigation Search entry to Shop and aligned `/shop` routing.

Report: `PHASE6_HEADER_NAVIGATION_FIXES_REPORT.md`

## Meta v6 Phase 3 — Pixel & Browser Tracking Contract (2026-07-17)

- Added canonical Meta browser event, commerce, validation, consent, diagnostics and dispatch modules.
- Unified PageView, ViewContent, wishlist, cart, checkout and verified browser Purchase event-ID handling.
- Added privacy-safe browser payload sanitization and removed unconditional Meta debug payload logs.
- Added Phase 3 semantic tests/audit and updated loop progression for runtime/generation-deferred phases.
- State: `READY_FOR_RUNTIME_QA`; Meta Events Manager runtime evidence remains required.

## Meta v6 Phase 9 — Admin Meta Operations Center (2026-07-18)

- Added unified `/admin/meta` operations dashboard for connection, catalog, events, leads, jobs, approvals, attribution and audit logs.
- Added typed `MetaAdminApproval` and immutable `MetaAdminAudit` persistence with forward migration.
- Added exact-payload, expiring, two-person approvals for Meta event replay and job replay/cancel.
- Added atomic approval consumption to prevent concurrent reuse.
- Added separated Meta view/operate/approve/audit permissions while preserving prior SUPER_ADMIN route protections.
- Added recursive secret/PII redaction, human-readable provider failure hints and pending-versus-final provider state labels.
- Hardened response shaping so raw provider errors and administrator email addresses are not exposed; ambiguous post-provider audit/finalization failures now return explicit verify-before-retry errors.
- Added audited connection recheck, catalog sync and lead lifecycle mutations.
- Added `qa:meta-v6-phase9`: 11/11 semantic tests and 30/30 static checks.
- Revalidated Phase 1–8 regression gates, admin API security and Meta Business platform audits.
- Prisma generation/migration runtime proof and remaining write-route audit adoption remain explicit release holds.

## 2026-07-18 — Meta v6 Phase 10 Observability, Diagnostics & Alerting

- Added persisted Meta Catalog Diagnostics aggregate/per-item models and importer.
- Added incident lifecycle, dedupe/cooldown and operational alert evaluators.
- Added correlation propagation across events, jobs, webhooks, catalog batches, diagnostics and incidents.
- Added protected health, metrics, diagnostics, incident and correlation timeline APIs.
- Added Diagnostics, Incidents and Trace tabs to `/admin/meta`.
- Added Phase 10 semantic/static gates; global A14 now passes.
## 2026-07-18 — Meta v6 Phase 13 Ads Insights & Approval-Based Automation

- Added normalized, idempotent Ads Insights sync-run and snapshot persistence.
- Added a six-hour read-only insights queue/worker and a three-consecutive-run freshness gate before any ad write.
- Added human-reviewed recommendations that never auto-apply provider mutations.
- Converted campaign, ad-set, creative and ad writes to exact-payload, two-person critical approvals.
- Added server-side budget/bid caps, per-approval increase limits and forced `PAUSED` create defaults.
- Added immutable execution reservation and redacted before/provider/after evidence with `RECONCILIATION_REQUIRED` partial-success handling.
- Added Ads Insights, recommendations, safety caps, approval execution and reconciliation views to `/admin/meta`.
- Added Phase 13 semantic/static gates; global A1–A14 blocker gate remains 14/14.


## 2026-07-18 — Post-spec Phase 16 production-readiness closure

- Added source-bound, expiring command evidence for TypeScript, ESLint, master tracking, and build.
- Added redacted hashed logs and evidence-aware production release gate consumption.
- Added machine-readable blocker-to-owner closure planning and unmapped-blocker failure.
- Updated inherited tracking audits for canonical event ID, consent-aware attribution, isolated workers, and expanded predeploy governance.
- Restored production QA, tracking, lifecycle, product URL, deploy gate, and master tracking handoff documents.
- Fixed the blocking empty-interface ESLint error; inherited warnings remain visible.
