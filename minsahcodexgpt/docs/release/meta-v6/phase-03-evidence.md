# Meta v6 Phase 03 Evidence — Pixel & Browser Tracking Contract

**Date:** 17 July 2026  
**Project snapshot:** `minsahbeauty_meta_v6_phase03_loop_update.zip`  
**Source specification:** `docs/spec/MinsahBeauty_Meta_AZ_Final_Spec_v6_FULL.md`  
**Manifest status:** `READY_FOR_RUNTIME_QA`

## Implemented scope

- Added a canonical Meta browser domain under `lib/meta/browser/` for event types, event IDs, payload privacy, commerce mapping, validation, consent, diagnostics and Pixel/CAPI dispatch.
- Added `components/tracking/MetaPixelProvider.tsx` and `MetaEventBridge.tsx`; the bridge is mounted through `AllPixels` and applies the same validation contract to isolated widgets.
- Routed ViewContent, AddToWishlist, AddToCart, ViewCart, InitiateCheckout, AddShippingInfo and AddPaymentInfo through the canonical commerce builder.
- Kept unselected variant-capable ViewContent at `product_group`; selected variants and all sellable cart/checkout lines use exact item SKU with `content_type=product`.
- Generated each paired event ID once at the action boundary and passed it into the manager so Pixel and public CAPI receive the same event name/event ID.
- Refactored PageView and verified online browser Purchase to the shared browser client. Purchase preserves the server-issued `Purchase-{orderId}` ID and does not call the public non-Purchase CAPI endpoint.
- Added a deny-list browser sanitizer that removes raw email, phone, names, address fields, secret-like keys and URL query strings before session storage, platform adapters, browser Pixel payloads or CAPI browser requests.
- Removed unconditional `[MB_DEBUG]` payload logging. Debug diagnostics are production-disabled and expose only safe summaries when explicitly enabled.
- Updated Phase 1 and Phase 12 regression audits to recognize the canonical browser contract rather than direct `fbq` implementation strings.
- Updated the loop runner so `READY_FOR_RUNTIME_QA` and `READY_FOR_GENERATION` phases remain visibly incomplete for release but do not block the next engineering loop.

## Main changed files

```text
lib/meta/browser/*
components/tracking/MetaPixelProvider.tsx
components/tracking/MetaEventBridge.tsx
lib/tracking/ecommerce.ts
lib/tracking/events.ts
lib/tracking/manager.ts
lib/tracking/pixels/FacebookPixel.tsx
lib/tracking/pixels/AllPixels.tsx
app/checkout/payment-complete/page.tsx
tests/meta-v6/phase3-browser-tracking.test.ts
scripts/meta-v6-phase3-browser-audit.mjs
scripts/meta-v6-phase1-identity-audit.mjs
scripts/tracking-phase12-capi-schema-audit.mjs
scripts/product-url-tracking-regression-audit.mjs
scripts/meta-v6-loop.mjs
config/meta-v6-phase-manifest.json
docs/release/meta-v6/phase-dashboard.json
```

## Schema and migration evidence

No Phase 3 Prisma migration was required. Browser event audit persistence was intentionally not introduced while Phase 2 generated-client and disposable-migration evidence remains deferred; browser dispatch remains client-side and privacy-safe.

## Semantic fixtures

Phase 3 tests cover:

- Meta-safe event ID generation
- product-group ViewContent before variant selection
- exact variant SKU AddToCart
- multi-line checkout contents, quantity and merchandise subtotal
- same event ID in browser and CAPI request contracts
- raw PII/secret removal and query-string URL sanitization
- fail-closed malformed catalog payload behavior
- invalid product-group/quantity rejection
- verified Purchase server event-ID preservation

## Automated gate evidence

```text
npm run qa:meta-v6-phase3
9 tests passed
20/20 static checks passed

npm run qa:meta-v6-phase1
4/4 tests passed
9/9 static checks passed

npm run qa:meta-v6-phase2
8/8 tests passed
20/20 static checks passed

npm test
16/16 passed

npx tsc --noEmit --pretty false
exit 0

targeted ESLint
0 errors; 15 warnings remain in the legacy `lib/tracking/manager.ts` typing/unused-variable baseline

node scripts/meta-business-platform-audit.mjs
22/22 passed

node scripts/meta-v6-gap-audit.mjs
7/14 passed; no Phase 3 regression, remaining blockers belong to later phases

node scripts/tracking-phase12-capi-schema-audit.mjs
50/50 passed
```

## Repository-wide master tracking gate

`npm run qa:master-tracking` remains non-green: 64 checks pass and 10 gate groups fail. The Phase 3-related Business SDK/browser dedup child audit now passes. Remaining failures are pre-existing repository governance gaps, including missing historical Phase 10–17 reports, missing production environment/tracking documents, and unrelated attribution/retention audit expectations. Those artifacts were not fabricated or bypassed in this loop.

## Security and privacy evidence

- Browser Pixel payload and browser-to-CAPI request builder contain no raw customer email, phone, first/last name, address, city, state, postal code, access token, authorization header, password or client secret fields.
- Event source URLs retain origin and pathname only.
- Invalid/partial catalog fields are stripped fail-closed; empty `content_ids` are never emitted.
- `product_group` is rejected outside ViewContent.
- Production diagnostics are disabled unless both non-production mode and `NEXT_PUBLIC_META_TRACKING_DEBUG=true` are present.

## Runtime Meta evidence required before COMPLETE

Run on a deployed staging/production-like domain with consent granted and Meta Test Events enabled:

1. PageView
2. product-group ViewContent
3. selected-variant ViewContent
4. AddToWishlist
5. AddToCart
6. InitiateCheckout
7. AddPaymentInfo
8. verified Purchase

For paired events, attach evidence that browser and server show the same event name/event ID and are deduplicated. Confirm catalog match, no query-string secrets in event source URL, denied-consent suppression, and internal/test traffic exclusion.

## Rollback / forward-fix

The change is application-only and has no schema rollback. Reverting the browser modules and call-site refactor returns to the prior direct manager flow. Prefer forward-fixing individual adapters because reverting also restores unconditional debug payload logging and scattered event-ID generation.

## Acceptance criteria

- [x] Raw database product IDs are absent from Meta `content_ids` regressions.
- [x] Item commerce events use the canonical browser commerce builder.
- [x] `product` versus `product_group` rules are validated.
- [x] Pixel and public CAPI share one event ID for paired events.
- [x] Verified Purchase preserves the server-issued event ID.
- [x] Browser payload and diagnostics contain no raw customer PII or secret-like values.
- [x] Phase 1/2 and repository unit regressions pass.
- [ ] Meta Events Manager Test Events runtime evidence attached.
- [ ] Production-domain consent/CSP/pairing smoke test attached.
