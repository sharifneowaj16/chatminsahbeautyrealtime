# Minsah Beauty Tracking Implementation Plan

Created before continuing tracking work.

Source documents:
- `C:\Users\Administrator\Downloads\Minsah Beauty Tracking System Update.docx`
- `C:\Users\Administrator\Downloads\Automated Tracking Test Cases - CI Gate.docx`

Last updated: 2026-06-28

## Current Local Status

Already completed in this workspace:

- [x] Prisma tracking schema fields added.
- [x] Additive migration added at `prisma/migrations/20260628000000_add_tracking_fields/migration.sql`.
- [x] Product analytics counters and `ProductDailyMetric` model added.
- [x] `MetaCapiFailure` and `TrackingHealthCheck` models added.
- [x] Order attribution fields added: `fbp`, `fbc`, IP, UA, UTM/ad IDs, GA IDs, confirmation timestamps.
- [x] Payment reconciliation fields added.
- [x] Telegram new-order notification updated with `Phone Confirmed`, `Phone Off`, and `Cancel`.
- [x] Telegram callback endpoint added at `/api/telegram/order-callback`.
- [x] COD `Phone Confirmed` triggers Meta CAPI Purchase server-side only.
- [x] Meta CAPI helper logs safe failure records.
- [x] `Send to Pathao` step wired from Telegram callback.
- [x] `.env.example` documents Meta CAPI and Telegram callback env vars.
- [x] `prisma validate` and `prisma generate` passed after schema update.
- [x] Public-page proxy sets first-party tracking cookies for `_fbp`, `_fbc`, visitor ID, UTM/ad data, first landing URL, and referrer.
- [x] Checkout order creation saves fbp/fbc/IP/UA/UTM/ad IDs/GA IDs/landing/referrer/visitor ID.
- [x] Buy Now order creation saves fbp/fbc/IP/UA/UTM/ad IDs/GA IDs/landing/referrer/visitor ID.
- [x] Browser Pixel and CAPI share anonymous visitor `external_id` from `mb_vid`.
- [x] `/api/facebook-capi` hashes `external_id` and falls back to first-party cookies.
- [x] Facebook PageView fires with matching browser `eventID` and CAPI `event_id`.
- [x] Product `ViewContent`, successful `AddToCart`, and checkout-start `InitiateCheckout` events wired with ecommerce payloads.
- [x] Email and Bangladesh phone normalization runs before Meta SHA-256 hashing.
- [x] Verified online payment webhook route added at `/api/payments/verified`.
- [x] Online paid Purchase uses `paymentPaidAt` and preserves `Purchase-{orderId}`.
- [x] Meta Purchase dispatch moved to BullMQ queue with 5 attempts.

Production setup still required (Owner: User):

- [ ] Run Prisma migration in production.
- [ ] Set real `META_PIXEL_ID` or existing public pixel env.
- [ ] Set `META_CAPI_ACCESS_TOKEN`.
- [ ] Set `TELEGRAM_WEBHOOK_SECRET`.
- [ ] Set `TELEGRAM_ADMIN_USER_IDS`.
- [ ] Register Telegram webhook to `https://minsahbeauty.cloud/api/telegram/order-callback`.
- [ ] Confirm `REDIS_URL` is production ready for BullMQ.
- [ ] Run `npm run worker:meta-capi` or include it in `npm run worker:all` in production.
- [ ] Confirm Pathao env is production ready.

## Non-Negotiable Tracking Decisions

- [x] COD Purchase trigger is only `Phone Confirmed`.
- [x] COD Purchase must not fire from Browser Pixel.
- [x] COD Purchase must fire from Server CAPI only.
- [x] Online payment Purchase fires only after verified paid webhook/payment status.
- [x] Purchase never fires from frontend success or thank-you page alone.
- [x] Purchase value is never zero.
- [x] Purchase value uses server-side order total in BDT.
- [x] Same order sends Purchase only once.
- [x] `event_id` for Purchase is always `Purchase-{orderId}`.
- [x] Production never sends `test_event_code`.
- [x] Access tokens never appear in browser bundle, browser network requests, or logs.

## Source DOCX Coverage Map

The update document contains sections:

1. Final Tracking Decision
2. Production-Blocking Critical Fix
3. ENV / Credentials / API Setup
4. Meta One-Time Setup
5. Database / Prisma Migration
6. Checkout Data Capture
7. fbclid, _fbc, UTM, Visitor ID
8. external_id / Identity Matching
9. Meta Pixel + CAPI Core Events
10. Purchase Event
11. Meta CAPI Payload Quality
12. Product Variant / Catalog Matching
13. Deduplication / Idempotency
14. Amount Integrity
15. Event Time / Timezone Safety
16. Retry / Queue / Failure Handling
17. Sanitized Logging / Schema Version
18. GA4 Ecommerce
19. GA4 Referral / Cross-Domain
20. Test / Internal / Bot Filtering
21. Privacy / Consent / Clarity
22. Meta Custom Audiences
23. Order Status / Admin Quality
24. Courier / Delivery Reconciliation
25. Product Analytics / Winner Product
26. Margin / LTV / Repeat Purchase
27. Landing Page / Creative Snapshot
28. Verification Checklist
29. Weekly Audit
30. Tracking Health Cron
31. Production Deploy Gate
32. Recommended Implementation Order

The CI gate document contains sections:

33. Automated Tracking Test Cases / CI Gate
34. Dashboard / Reporting Schema
35. Alert Severity Matrix
36. Developer Acceptance Criteria

## Implementation Phases

### Phase 1 - Data Model And Env

- [x] Add Prisma tracking fields.
- [x] Add additive migration.
- [x] Add Meta CAPI failure log table.
- [x] Add tracking health table.
- [x] Add payment reconciliation fields.
- [x] Document new env vars.
- [ ] Deploy migration.
- [ ] Configure production env values.
- [ ] Confirm Meta Pixel/Dataset IDs.
- [ ] Confirm Meta System User token access and expiry.

### Phase 2 - Checkout Data Capture

- [x] Capture `_fbp` at order create time.
- [x] Capture `_fbc` at order create time.
- [x] Capture customer IP from trusted request headers.
- [x] Capture checkout user-agent.
- [x] Capture UTM fields: source, medium, campaign, content.
- [x] Capture Meta ad IDs: campaign_id, adset_id, ad_id, placement.
- [x] Capture `ga_client_id`.
- [x] Capture `ga_session_id` when available.
- [x] Capture first landing path and URL.
- [x] Capture referrer.
- [x] Capture anonymous visitor ID.
- [x] Do not use admin IP/UA for COD Purchase.

### Phase 3 - Cookies And Identity

- [x] Convert `fbclid` to `_fbc` using `fb.1.{timestamp}.{fbclid}`.
- [x] Store `_fbc` as first-party cookie.
- [x] Do not overwrite existing `_fbc` unnecessarily.
- [x] Store UTM/ad data in first-party cookie.
- [x] Create anonymous visitor cookie such as `mb_vid`.
- [x] Build stable hashed `external_id` for CAPI Purchase.
- [x] Use same `external_id` for Browser Pixel and CAPI.
- [x] Never send raw internal DB ID as `external_id`.
- [x] Normalize email before SHA-256.
- [x] Normalize Bangladesh phone before SHA-256.

### Phase 4 - Meta Pixel And CAPI Core Events

- [x] PageView fires on initial load.
- [x] PageView fires on Next.js route change.
- [x] Duplicate PageView is prevented.
- [x] ViewContent fires from Browser Pixel on product page load.
- [x] ViewContent fires from Server CAPI.
- [x] AddToCart fires only after successful cart mutation.
- [x] InitiateCheckout fires when checkout actually starts.
- [x] Browser `eventID` equals CAPI `event_id`.
- [x] Payload includes `content_ids`, `contents`, `num_items`, `currency`, `value`.
- [x] No artificial 30-second Pixel delay.

### Phase 5 - Purchase Logic

- [x] COD Phone Confirmed route exists.
- [x] COD Purchase uses `phoneConfirmedAt` as `event_time`.
- [x] COD Purchase is CAPI-only.
- [x] COD helper skips non-COD orders.
- [x] COD helper skips `isTest` orders.
- [x] COD helper blocks duplicate send with `metaPurchaseSent`.
- [x] Online payment order starts as pending payment.
- [x] Payment gateway webhook verifies signature.
- [x] Paid webhook sets `paymentPaidAt`.
- [x] Online Purchase fires only after verified paid status.
- [x] Online Purchase uses `paymentPaidAt` as `event_time`.
- [x] Failed/pending/cancelled payment never fires Purchase.
- [x] Purchase retry preserves original `event_time`.
- [x] Purchase retry preserves original `event_id`.

### Phase 6 - Reliability And Queue

- [x] Move Meta CAPI send to queue for production durability.
- [x] Use max 5 retries.
- [x] Retry 429, 5xx, network timeout.
- [x] Do not blind retry permanent 4xx errors.
- [x] Save safe failed payload summary.
- [x] Save status code, error code, retry count, final failure.
- [x] Dead-letter final failures.
- [x] Never log access token.
- [x] Never log raw email/phone.

### Phase 7 - GA4 Ecommerce

- [ ] Browser GA4 `view_item`.
- [ ] Browser GA4 `add_to_cart`.
- [ ] Browser GA4 `begin_checkout`.
- [ ] Online paid GA4 `purchase`.
- [ ] `transaction_id = orderId`.
- [ ] Duplicate GA4 purchase prevented.
- [ ] GA4 API secret remains server-side.
- [ ] COD GA4 Purchase via Measurement Protocol if required.
- [ ] Payment gateway referral exclusion configured.
- [ ] Refund event implemented when applicable.

### Phase 8 - Catalog, Variant, And Product Analytics

- [ ] Meta Catalog connected.
- [ ] Catalog product ID matches Pixel/CAPI `content_ids`.
- [ ] Variant/shade products use correct `content_type`.
- [ ] Variant/shade metadata included in `contents`.
- [ ] Product views tracked.
- [ ] Unique views tracked.
- [ ] AddToCart, Checkout, Orders tracked per product.
- [ ] Confirmed, delivered, cancelled, returned counts tracked.
- [ ] Revenue and delivered revenue tracked.
- [ ] Product grade A/B/C/D calculated.

### Phase 9 - Dashboard And Alerts

- [ ] Business dashboard: orders, confirmed, paid, delivered, cancelled, returned, refunded.
- [ ] Revenue dashboard: confirmed revenue, delivered revenue, refunded amount, ad spend, ROAS.
- [ ] Tracking health dashboard: backend orders vs Meta/GA4 purchase counts.
- [ ] CAPI success/failure dashboard.
- [ ] Missing fbp/fbc/IP/UA dashboard.
- [ ] Product performance dashboard.
- [ ] Ad/creative dashboard by campaign/adset/ad/placement.
- [ ] Customer LTV dashboard.
- [ ] Courier/COD quality dashboard.
- [ ] Daily tracking health cron.
- [ ] Critical alert if confirmed orders exist but Meta Purchase is zero for 24h.
- [ ] Critical alert if confirmed orders exist but GA4 purchase is zero for 24h.
- [ ] Critical alert for invalid CAPI token.
- [ ] Warning alert for CAPI failure rate 5%-10%.
- [ ] Critical alert for CAPI failure rate above 10%.

## Automated Test Plan

### Unit Tests

- [ ] Meta CAPI payload builder.
- [ ] GA4 ecommerce payload builder.
- [ ] Email normalize and SHA-256 hash.
- [ ] Phone normalize and SHA-256 hash.
- [ ] Empty/null email or phone does not hash.
- [ ] `client_user_agent` is used.
- [ ] `user_agent` is not used.
- [ ] `client_ip_address` is used.
- [ ] `ip_address` is not used.
- [ ] Purchase `event_id = Purchase-{orderId}`.
- [ ] Currency is always `BDT`.
- [ ] Purchase value is not zero.

### Integration Tests

- [ ] Product page creates ViewContent payload.
- [ ] AddToCart success creates AddToCart payload.
- [ ] Checkout start creates InitiateCheckout payload.
- [ ] Verified online payment creates Purchase.
- [ ] Failed payment does not create Purchase.
- [ ] Pending payment does not create Purchase.
- [ ] COD order placement does not create Purchase.
- [ ] COD Phone Confirmed creates Server CAPI Purchase.
- [ ] COD Purchase does not create Browser Pixel Purchase.
- [ ] Test/internal order skips production tracking.
- [ ] Retry preserves same `event_id`.

### Idempotency Tests

- [ ] Same order Purchase is sent once.
- [ ] Page refresh does not duplicate Purchase.
- [ ] Webhook retry does not duplicate Purchase.
- [ ] Repeated Phone Confirmed does not duplicate COD Purchase.
- [ ] `metaPurchaseSent = true` blocks Purchase.
- [ ] Duplicate payment transaction ID is blocked.
- [ ] Race condition test uses transaction/lock.

### E2E Tests

- [ ] Homepage -> PageView.
- [ ] Product page -> PageView + ViewContent.
- [ ] Add to Cart -> AddToCart.
- [ ] Checkout -> InitiateCheckout.
- [ ] Online paid order -> Browser Pixel + CAPI Purchase dedup.
- [ ] COD Phone Confirmed -> CAPI-only Purchase.
- [ ] GA4 view_item, add_to_cart, begin_checkout, purchase.
- [ ] GA4 transaction_id is not duplicate.
- [ ] Meta event_id is present.
- [ ] Meta access token is not visible in browser requests.

### CI/CD Deploy Gate

- [ ] Block deploy if tracking tests fail.
- [ ] Block deploy if placeholder Pixel ID is present.
- [ ] Block deploy if placeholder CAPI token is present.
- [ ] Block deploy if GA4 Measurement ID is missing.
- [ ] Block deploy if required env vars are missing.
- [ ] Block deploy if production build sends `META_TEST_EVENT_CODE`.
- [ ] Block deploy if CAPI token appears in frontend bundle.
- [ ] Lint/check script verifies critical tracking fields.

## Developer Acceptance Criteria

- [ ] Correct Pixel ID visible in production.
- [ ] Correct Dataset ID connected in production.
- [ ] ViewContent Browser + Server both send.
- [ ] AddToCart Browser + Server both send.
- [ ] InitiateCheckout Browser + Server both send.
- [ ] Online Purchase Browser + Server both send after verified payment.
- [ ] COD Purchase only sends from Server CAPI.
- [ ] Browser eventID and CAPI event_id match.
- [ ] Meta Events Manager shows Deduplicated: Yes.
- [ ] No missing event_id warning.
- [ ] No critical Meta diagnostics.
- [ ] Event Match Quality is at least 6.0.
- [ ] Target Event Match Quality is 7.0 or higher.
- [ ] Frontend success page does not fire Purchase.
- [ ] COD order placed does not fire Purchase.
- [ ] COD Phone Confirmed fires CAPI-only Purchase.
- [ ] Purchase value uses server-side order total.
- [ ] COD event_time equals phone_confirmed_at.
- [ ] Online event_time equals payment_paid_at.
- [ ] Test/internal orders skip production tracking.
- [ ] fbp/fbc/IP/UA/UTM/ad IDs are saved on order.
- [ ] Admin IP/UA is not used for COD Purchase.
- [ ] Customer checkout IP/UA is used for COD Purchase.
- [ ] Queue/retry/dead-letter behavior is in place.

## Recommended Next Start Order

1. Implement checkout data capture for fbp/fbc/IP/UA/UTM/GA IDs.
2. Add first-party cookies for fbclid -> _fbc, UTM/ad data, and anonymous visitor ID.
3. Add stable hashed external_id strategy.
4. Build shared payload builders for Meta CAPI and GA4.
5. Add ViewContent Browser + CAPI.
6. Add AddToCart Browser + CAPI.
7. Add InitiateCheckout Browser + CAPI.
8. Add online payment verified webhook Purchase.
9. Move COD CAPI send into queue with retry/dead-letter.
10. Add automated unit/integration/E2E tracking tests.
11. Add CI deploy gate for critical tracking conditions.
12. Add tracking health cron and dashboard.
