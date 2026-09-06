# Phase: iPhone & iOS Safari CSS Optimization & WebKit Stabilization
**Project:** Minsah Beauty  
**Domain:** Mobile UX, Storefront Polish & WebKit CSS Governance  
**Target Engines:** iOS Safari (WebKit), iOS WKWebView (Facebook, Instagram, TikTok In-App Browsers)  
**Status:** APPROVED_FOR_PLANNING (CODE_PENDING)  
**Safety Guarantee:** Strict desktop/mobile non-breakage isolation.

---

## 🎯 Objective
Eliminate iOS Safari rendering bugs, Home Indicator safe-area occlusion, input focus auto-zoom, and video corner bleeding on iPhone without breaking any existing layout, responsive breakpoints, form validation, or desktop interactions.

---

## 🏗️ The 4 Modular Phases

```
├── Phase 1: Root Geometry & Safe-Area Foundation (viewport-fit=cover & Inset Support)
│   ├── app/layout.tsx
│   └── app/globals.css
│
├── Phase 2: Mobile Input Zoom Prevention & Touch Polish (16px Rule & Tap Highlight)
│   ├── app/globals.css
│   └── components/cart/CartDrawer.tsx
│
├── Phase 3: WebKit Video Clipping, Glassmorphism & Dynamic Viewport Height
│   ├── app/(storefront)/products/[id]/components/benefits/SeedMediaMatrix.tsx
│   ├── components/navigation/BottomNavigation.tsx
│   └── app/globals.css
│
└── Phase 4: Touch Targets, iOS Click Latency & Automated Verification Suite
    ├── app/(storefront)/products/[id]/components/benefits/SeedTimelineList.tsx
    └── tests/css/iphone-safari-css-contract.test.mjs
```

---

## 📋 Phase Details & Non-Breakage Guardrails

### 🟢 Phase 1: Root Geometry & Safe-Area Foundation
* **Target Files:**
  - [`app/layout.tsx`](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/layout.tsx)
  - [`app/globals.css`](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/globals.css)
* **Goal:** Enable hardware safe-area recognition on iPhone X–16 Pro Max screens.
* **Implementation:**
  - Export `viewport: Viewport` from `app/layout.tsx` containing `viewportFit: 'cover'`.
  - Validate that `--minsah-safe-area-bottom: env(safe-area-inset-bottom, 0px)` resolves accurately to `34px` on iPhones with Home Indicators.
* **Non-Breakage Guardrail:**
  - On desktop and non-notched devices, `env(safe-area-inset-*)` evaluates to `0px`. No shifts, no added padding, zero layout regressions on desktop.

---

### 🟢 Phase 2: Mobile Input Zoom Prevention & Touch Polish
* **Target Files:**
  - [`app/globals.css`](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/globals.css)
  - [`components/cart/CartDrawer.tsx`](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/components/cart/CartDrawer.tsx)
* **Goal:** Stop iOS Safari from violently zooming in the webpage when users tap input fields, and eliminate gray square tap flashes.
* **Implementation:**
  - Add `@media screen and (max-width: 768px)` font-size minimum `16px` rule for all text inputs, selects, and textareas.
  - Set `* { -webkit-tap-highlight-color: transparent; }` for seamless, premium touch feel.
  - Update `CartDrawer.tsx` promo code input to use `text-base md:text-xs`.
* **Non-Breakage Guardrail:**
  - On desktop (`min-width: 769px`), inputs retain their exact original `14px` (`0.875rem`) compact sizing and padding.
  - Form validation, accessibility (`aria-describedby`, `aria-invalid`), and label bindings remain 100% intact.

---

### 🟢 Phase 3: WebKit Video Clipping, Glassmorphism & Dynamic Viewport
* **Target Files:**
  - [`app/(storefront)/products/[id]/components/benefits/SeedMediaMatrix.tsx`](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/%28storefront%29/products/%5Bid%5D/components/benefits/SeedMediaMatrix.tsx)
  - [`components/navigation/BottomNavigation.tsx`](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/components/navigation/BottomNavigation.tsx)
* **Goal:** Fix video corner bleeding in WebKit and ensure backdrop blur renders reliably across iOS WebViews.
* **Implementation:**
  - In `SeedMediaMatrix.tsx`, apply WebKit radial mask and `isolation: isolate; transform: translateZ(0)` to the video container.
  - In `BottomNavigation.tsx`, add `-webkit-backdrop-filter` fallback alongside standard `backdrop-filter`.
* **Non-Breakage Guardrail:**
  - Video autoplay, loop, sound toggle, play/pause controls, and FAQ capsule interactions are completely untouched.

---

### 🟢 Phase 4: Touch Targets, iOS Click Latency & Automated Test Suite
* **Target Files:**
  - [`app/(storefront)/products/[id]/components/benefits/SeedTimelineList.tsx`](file:///d:/minsah%20Beauty%20latest/chatminsahbeautyrealtime/minsahcodexgpt/app/%28storefront%29/products/%5Bid%5D/components/benefits/SeedTimelineList.tsx)
  - `tests/css/iphone-safari-css-contract.test.mjs`
* **Goal:** Eliminate iOS Safari's 300ms click delay on custom milestone interactive elements and automate contract validation.
* **Implementation:**
  - Add `role={isDesktop ? undefined : "button"}`, `tabIndex={isDesktop ? undefined : 0}`, and `touch-action: manipulation;` on mobile timeline milestone items.
  - Create dedicated contract test suite verifying viewport, 16px rule, tap highlight, video mask, and safe-area variables.
* **Non-Breakage Guardrail:**
  - Desktop pure scroll tracking in `SeedTimelineList.tsx` remains 100% true to Seed.com desktop specifications.

---

## 🔒 Verification & Quality Gate
1. `node --experimental-strip-types --test tests/css/iphone-safari-css-contract.test.mjs`
2. `npm run typecheck`
3. Mobile & Desktop cross-device inspection.
