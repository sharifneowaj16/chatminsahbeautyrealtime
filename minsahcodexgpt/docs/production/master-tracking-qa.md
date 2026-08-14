# Phase 17 — Master Tracking QA Automation

Phase 17 adds one master static/regression gate for the production tracking contracts built in Phase 11–16.

## Primary command

```bash
npm run qa:master-tracking
```

Alias:

```bash
npm run qa:phase17
```

`qa:predeploy` now includes `npm run qa:phase17` before the runtime deploy gate.

## Required release commands

Run these before production deploy:

```bash
npm run qa:master-tracking
npm run qa:product-url-tracking
npm run qa:phase8-static
npm run qa:phase11
```

Recommended full local/deploy machine gate:

```bash
npm run audit:security
npm run qa:phase8-static
npm run qa:phase12
npm run qa:phase13
npm run qa:phase14
npm run qa:phase15
npm run qa:phase16
npm run qa:phase17
npm run qa:tracking-deploy-gate
npm run qa:admin-api-security
npm run qa:telegram-security
npm run typecheck
npm run build
npm run qa:production
```

## What the master audit protects

### Purchase source-of-truth contracts

- Public CAPI endpoint blocks Purchase.
- COD Purchase only sends after phone confirmation.
- Online Purchase only sends after signed/verified payment.
- Browser online Purchase needs the HttpOnly signed purchase token.
- Browser online Purchase is atomically claimed to prevent duplicate fires.
- GA4 purchase is server-side Measurement Protocol only.
- Browser GA4 purchase attempts are blocked by the guard script.

### Meta/GA4 data contracts

- `schema_version` is present in CAPI custom data.
- Meta Purchase `event_id` remains `Purchase-{orderId}`.
- GA4 purchase `transaction_id` remains `order.id`.
- Meta content IDs use catalog product IDs, not public slugs.
- GA4 ecommerce item IDs use product/catalog IDs, not public slugs.

### Attribution contracts

- `utm_term` is captured and saved.
- `offer_version` is captured and saved.
- `ab_variant` is captured and saved.
- `coupon_code` from landing URL is saved as attribution coupon, not actual applied checkout coupon.
- `free_delivery_threshold`, `landing_offer`, and `campaign_source_url` are captured.
- Payment gateway return paths do not overwrite the original campaign attribution.

### Test/internal traffic contracts

- Test emails can mark orders as test/internal.
- Test phones can mark orders as test/internal.
- Internal domains/IPs can be filtered.
- Meta CAPI, GA4 MP, browser online Purchase claim, campaign attribution writes, and tracking-device writes skip filtered traffic.
- Normal customer orders are not excluded unless a configured rule matches.

### Product lifecycle analytics contracts

- Product lifecycle metric hooks exist for confirmed, delivered, cancelled, returned, and refunded transitions.
- Duplicate status updates do not double count.
- Product analytics API exposes confirmed/delivered/returned/refunded/profit/rate metrics.
- Test/internal orders are skipped from product performance metrics.

### Failure retention / retry ops contracts

- retention cron route exists.
- Cleanup CLI exists.
- Failure categories exist: `DEBUG_NON_CRITICAL`, `FINAL_RETRYABLE`, `CRITICAL`.
- Cleanup supports dry-run and safe batch limits.
- Admin tracking-health shows safe payload summaries only.
- Admin retry avoids duplicate Purchase and skips test/internal orders.

## Child audits run by the master audit

`npm run qa:master-tracking` executes or verifies:

```txt
scripts/tracking-phase12-capi-schema-audit.mjs
scripts/tracking-attribution-audit.mjs
scripts/tracking-test-exclusion-audit.mjs
scripts/tracking-lifecycle-audit.mjs
scripts/tracking-retention-audit.mjs
scripts/product-url-tracking-regression-audit.mjs
scripts/phase8-static-contract-check.mjs
scripts/tracking-phase11-deploy-gate-audit.mjs
```

## Manual verification still required

Phase 17 is code/static automation only. It does not replace Phase 18 production proof from:

- Meta Pixel Helper
- Meta Events Manager
- GA4 DebugView / Realtime
- Catalog Diagnostics
- AEM / Business Manager domain verification
- Payment webhook real behavior
- GTM audit
- Clarity/privacy masking check

