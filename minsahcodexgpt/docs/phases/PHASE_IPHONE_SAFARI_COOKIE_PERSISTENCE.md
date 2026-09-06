# Phase: iPhone & Safari Cookie Persistence & Consent Resilience
**Project:** Minsah Beauty  
**Domain:** Tracking, Privacy & Cookie Governance  
**Target Browsers:** iOS Safari (WebKit ITP), WKWebView (In-App Facebook / Instagram / TikTok), Mobile Browsers  
**Status:** APPROVED_FOR_PLANNING (CODE_PENDING)  
**Solutions Approved:** Solution 1 (Server-Side Set-Cookie) & Solution 2 (LocalStorage Dual-Sync Fallback)

---

## 🎯 Objective
Eliminate cookie dropoffs, WebKit ITP (Intelligent Tracking Prevention) client-side truncation, and repetitive cookie banner popups for iPhone and Safari visitors by:
1. Elevating cookie issuance from client-side JavaScript (`document.cookie`) to authoritative server-side first-party HTTP headers (`Set-Cookie`) in `POST /api/privacy/consent`.
2. Providing a resilient client-side storage fallback (`localStorage`) that survives ITP cookie purges and private browsing partitioning, preventing recurring "Cookie & ads measurement" banners.

---

## 🏗️ Architecture & Component Roadmap

```
├── app/api/privacy/consent/route.ts
│   └── [Phase 1: Server-Side Set-Cookie Header Issuance]
├── lib/tracking/tracking-consent.ts
│   └── [Phase 2: Storage Fallback & Dual-Sync Engine]
├── lib/tracking/pixels/TrackingConsentManager.tsx
│   └── [Phase 3: Resilient Banner & GTM/Pixel Script Bootstrapper]
└── tests/tracking/iphone-safari-consent-persistence.test.mjs
    └── [Phase 4: Automated Verification & Regression Suite]
```

---

## 📋 Phase Breakdown

### 🟢 Phase 1: Server-Side First-Party `Set-Cookie` Issuance
* **File:** [`app/api/privacy/consent/route.ts`](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/api/privacy/consent/route.ts)
* **Goal:** Ensure consent decisions are set via native HTTP response headers (`Set-Cookie`), rendering them first-party authenticated in the eyes of Safari ITP.
* **Contract:**
  - On `state === 'granted'`:
    - Set `mb_tracking_consent=granted` (`Max-Age=15552000`, `Path=/`, `SameSite=Lax`, `Secure` over HTTPS, `HttpOnly=false`).
    - Set `mb_tracking_consent_version=2026-07-17` with identical attributes.
  - On `state === 'denied'`:
    - Set `mb_tracking_consent=denied` (`Max-Age=15552000`, `Path=/`, `SameSite=Lax`, `Secure`).
    - Expire all non-essential tracking cookies via `Max-Age=0` (`mb_vid`, `mb_sid`, `_fbp`, `_fbc`, `ttclid`, etc.).

---

### 🟢 Phase 2: Client-Side Dual-Sync & LocalStorage Fallback
* **File:** [`lib/tracking/tracking-consent.ts`](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/lib/tracking/tracking-consent.ts)
* **Goal:** Guard against WebKit ITP 24-hour/7-day cookie deletion and private browsing cookie restrictions.
* **Contract:**
  - `setClientTrackingConsent(consent)`:
    - Writes `document.cookie` (for immediate local consumption).
    - Writes `localStorage.setItem('mb_tracking_consent', consent)` and version safely wrapped in `try...catch`.
  - `getClientTrackingConsent()`:
    - First checks `readCookie(TRACKING_CONSENT_COOKIE)`.
    - If empty or unknown, checks `localStorage.getItem('mb_tracking_consent')`.
    - Returns valid consent if present.
  - `clearNonEssentialTrackingStorage()`:
    - Removes consent and tracking keys from both cookies and `localStorage`.

---

### 🟢 Phase 3: Banner Synchronization & Early Tag Manager Bootstrapping
* **File:** [`lib/tracking/pixels/TrackingConsentManager.tsx`](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/lib/tracking/pixels/TrackingConsentManager.tsx)
* **Goal:** Eliminate layout flashing, banner re-triggering, and synchronize Google Tag Manager / Meta Pixel consent signals before hydration.
* **Contract:**
  - `TrackingConsentModeScript`:
    - Update `mbReadStoredTrackingConsent()` to verify both `document.cookie` and `localStorage`.
    - Immediately initialize `gtag('consent', 'default', ...)` with stored state on iOS.
  - `TrackingConsentBanner`:
    - Use dual-checked state to prevent the banner from displaying if user already tapped "Allow".

---

### 🟢 Phase 4: Automated Verification & Safari Contract Tests
* **File:** `tests/tracking/iphone-safari-consent-persistence.test.mjs`
* **Goal:** Ensure regression-free execution with zero manual guesswork.
* **Contract:**
  - Validate that `POST /api/privacy/consent` produces compliant `set-cookie` header strings.
  - Validate that `denied` state clears sensitive tracking cookies.
  - Validate that `localStorage` fallback resolves when cookies are absent.
  - Verify project typecheck and tracking gate: `npm run typecheck` & `npm run qa:tracking-deploy-gate`.

---

## 🔒 Rollback Strategy & Non-Disruption Guarantee
1. **Preserve Existing Signatures:** Existing API payloads (`{ state, previousState, version }`) remain 100% backward compatible.
2. **Zero Breaking Changes:** Desktop Chrome, Firefox, and Android browsers continue to function seamlessly as `SameSite=Lax; Path=/` is universally standard.
3. **Fail-Safe Private Mode:** All `localStorage` access wrapped in `try...catch` ensuring no `DOMException: QuotaExceededError` or `SecurityError` occurs in locked-down iOS modes.
