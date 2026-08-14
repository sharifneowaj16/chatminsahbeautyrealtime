# Phase 6 — Consent + Internal/Bot Filters

## Goal
Keep production analytics, Meta audiences, GA4 reporting, Clarity recordings, and product counters clean without blocking essential shopping, checkout, order, or payment flows.

## Production Rules

1. **Non-essential tracking gate**
   - Meta Pixel, public CAPI core events, browser GA4, GTM, Clarity, Hotjar, TikTok, Snapchat, Pinterest, LinkedIn, Reddit, Microsoft UET, and Mixpanel load only when `canRunClientTracking()` returns true.
   - `mb_tracking_consent=denied` always blocks non-essential browser tracking.
   - Unknown consent always blocks non-essential tags until the visitor explicitly clicks Allow. The runtime no longer treats a missing environment flag as approval.

2. **Versioned consent persistence**
   - `/api/orders` stores `trackingConsent`, `trackingConsentVersion`, `nonEssentialTrackingAllowed`, and the policy decision reason.
   - Missing or stale consent version is `UNKNOWN`, even if a legacy boolean was historically true.
   - Server-side Meta Purchase delivery requires a current `CONSENT_GRANTED` policy decision; unknown, denied, withdrawn, test, internal, deletion, and suppression states are blocked.

3. **Internal/staff/test filters**
   - `minsah_staff=1` or `mb_internal_traffic=1` blocks browser tracking and product analytics.
   - `ANALYTICS_INTERNAL_IPS`, `INTERNAL_TRAFFIC_IPS`, or `STAFF_IPS` exclude staff/developer IPs server-side.
   - `x-minsah-internal-traffic: 1` is trusted in production only with `x-minsah-internal-secret` matching `INTERNAL_TRAFFIC_HEADER_SECRET`.

4. **Bot/suspicious traffic filters**
   - Obvious bots, preview crawlers, headless browsers, uptime monitors, and social preview bots are excluded from product analytics and public CAPI core events.
   - Stored-order Purchase senders do not skip missing-UA legacy orders by default, but they do skip test, consent-denied, and configured internal IP traffic.

5. **Clarity safety**
   - Clarity loads only after non-essential tracking is allowed.
   - Sensitive input masking is applied to password, email, phone, number, address, city, zip/postal, OTP fields, and checkout forms.

6. **Privacy disclosure and governance**
   - `/privacy` redirects to `/privacy-policy` so there is only one current disclosure page.
   - `/privacy-policy` discloses fail-closed versioned consent, withdrawal, Meta Pixel/CAPI, GA4, Clarity, hashed customer matching, retention, deletion, backup limitations, and staff/test/bot exclusions.
   - Policy decisions are attached to durable outbox records with policy version, reason, consent state/version, advanced-matching allowance, and retention deadline.
   - Retention cleanup, deletion processing, suppression sync, and PII audit scans run as durable privacy-governance jobs.

## Required Environment Variables

```bash
# Legacy compatibility flag. Runtime consent is always explicit opt-in/fail-closed.
NEXT_PUBLIC_REQUIRE_TRACKING_CONSENT=true

# Staff/developer/internal traffic exclusion.
ANALYTICS_INTERNAL_IPS=203.0.113.10,203.0.113.11
INTERNAL_TRAFFIC_HEADER_SECRET=<random-secret-if-using-internal-header>

# Existing QA gates.
TRACKING_DISCLOSURE_VERIFIED=true
COOKIE_DISCLOSURE_VERIFIED=true
CONSENT_MODE_REQUIRED=true
CONSENT_MODE_VERIFIED=true
CLARITY_SENSITIVE_MASKING_VERIFIED=true
```

## Acceptance Criteria

- User declines consent → browser pixels, GA4 browser tag, Clarity, product analytics fetches, and public CAPI calls do not run.
- Consent required + unknown consent → non-essential tags wait for Allow.
- No consent cookie or outdated consent version → non-essential tracking remains blocked.
- Checkout stores consent state, consent version, policy reason, and fail-closed boolean on the order.
- Unknown, denied, withdrawn, internal, test, deleted, or suppressed identity does not send restricted Meta Purchase.
- Staff/internal cookies or IPs exclude product analytics and public CAPI events.
- Bot/social preview/headless traffic does not increment product counters.
- Clarity cannot record sensitive checkout/account/admin fields unmasked.
- `/privacy` cannot serve stale disclosure.
- `npm run qa:meta-v6-phase6`, `npm run qa:tracking-test-exclusion`, and `npm run qa:tracking-retention` pass.
- Repository security audit contains no Phase 6 privacy finding; unrelated historical phase findings remain tracked separately.
