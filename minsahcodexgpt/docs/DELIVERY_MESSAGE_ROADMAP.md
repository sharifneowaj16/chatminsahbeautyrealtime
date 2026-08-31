# 🚚 Delivery Message & Top-Bar Banner — Architecture & Future Upgrade Roadmap

This document outlines the architecture, existing implementation, security design, and step-by-step guidance for future enhancements of the Minsah Beauty Delivery Top-Bar system.

---

## 📌 1. Current Architecture Overview

The Delivery Top-Bar displays dynamic promotional messages on the storefront based on product configuration and customer loyalty status.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DECISION HIERARCHY                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Product Free Delivery (Priority 1)                                       │
│    • Condition: product.deliveryOfferType === 'FREE'                        │
│    • Output: Message 1 (✨ এই প্রোডাক্টে সারা বাংলাদেশে ফ্রি ডেলিভারি।)        │
│    • Behavior: Overrides all customer history.                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. Returning Customer (Priority 2)                                          │
│    • Condition: Authenticated customer with >= 1 OrderStatus.DELIVERED      │
│    • Output: Message 3 (👑 Welcome Back! আপনার জন্য প্রতিটি অর্ডারে...)     │
│    • Fallback: If Message 3 inactive, falls back to Message 2.             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. New / Unknown Customer (Priority 3)                                      │
│    • Condition: Anonymous visitor or 0 completed orders                     │
│    • Output: Message 2 (🎁 New customer delivery offer: ঢাকার ভিতরে...)    │
│    • Fallback: If Message 2 inactive, returns null (hidden banner).         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ 2. Core File Map

| Path | Purpose | Layer |
| :--- | :--- | :--- |
| `lib/delivery-message/types.ts` | Canonical TypeScript interfaces and default configs | Core Types |
| `lib/delivery-message/config.ts` | Reads and normalizes `SiteConfig.deliveryMessageConfig` | Config Reader |
| `lib/delivery-message/resolver.ts` | Canonical business decision tree & DB order queries | Resolver |
| `app/api/delivery-message/route.ts` | Storefront public API endpoint | API Handler |
| `app/api/admin/delivery-message-config/route.ts` | Admin CRUD endpoint (Permissions: `SETTINGS_VIEW`/`SETTINGS_EDIT`) | Admin API |
| `components/catalog/ProductDeliveryTopBar.tsx` | Reusable React Client Component with pulse skeleton & analytics | UI Component |
| `app/(storefront)/products/[id]/components/ProductDeliveryTopBar.tsx` | Product detail page proxy export | Storefront Route |
| `app/admin/settings/DeliveryMessageSettings.tsx` | Admin UI card controls, live preview, color pickers, active switches | Admin UI |
| `lib/tracking/events.ts` | GA4 & `dataLayer` event dispatchers (`delivery_message_viewed`/`clicked`) | Analytics |
| `prisma/migrations/20260831052000_seed_delivery_message_config/` | Safe idempotent SQL migration & recovery scripts | Database |
| `scripts/test-phase8-delivery-matrix.ts` | 13-case automated test runner for all priority branches | QA & Testing |

---

## 🔒 3. Security & Anti-Enumeration Design

1. **Session-Only Identification**: Public callers **cannot** submit arbitrary `?phone=` query parameters to probe customer order status. Identification relies strictly on `verifyAccessToken(token) -> user.phone`.
2. **Zero PII Exposure**: The API returns only `{ messageType, messageText, backgroundColor, textColor, active }`. Customer names, phone numbers, order IDs, and order counts are never exposed.
3. **Strict Color Validation**: Admin inputs are sanitized against `/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/` before database persistence.

---

## 🚀 4. Future Upgrade Roadmap (Optional Enhancements)

---

### 🔹 Upgrade 1: Cart Drawer & Checkout Page Integration

#### Goal
Show the active delivery offer inside the mini-cart drawer and checkout flow to boost conversion rate.

#### Implementation Steps:
1. Open `components/cart/CartDrawer.tsx` (or mini-cart drawer component).
2. Import `<ProductDeliveryTopBar />`:
   ```tsx
   import ProductDeliveryTopBar from '@/components/catalog/ProductDeliveryTopBar';
   ```
3. Place at the top of the drawer container:
   ```tsx
   <ProductDeliveryTopBar className="rounded-t-lg" />
   ```
4. Open `app/(storefront)/checkout/page.tsx` and place the top-bar above the checkout step indicator.

---

### 🔹 Upgrade 2: Admin CTR & Conversion Analytics Dashboard

#### Goal
Visualize which delivery message generates the highest click-through rate (CTR) and checkout completions.

#### Implementation Steps:
1. In `app/admin/tracking/page.tsx`, create a **Delivery Banner Performance** card.
2. Query `delivery_message_viewed` vs `delivery_message_clicked` aggregated events from `AnalyticsEvent` or GA4 Reporting API.
3. Display metrics:
   - **Message 1 (Free Delivery)**: Total Views | Clicks | CTR % | Attributed Orders
   - **Message 2 (New Customer)**: Total Views | Clicks | CTR % | Attributed Orders
   - **Message 3 (Returning Customer)**: Total Views | Clicks | CTR % | Attributed Orders

---

### 🔹 Upgrade 3: In-Memory / Redis TTL Caching for High-Traffic Events

#### Goal
Under viral flash sales (>100,000 requests/minute), eliminate repeated `SiteConfig` and customer lookups.

#### Implementation Steps:
1. In `lib/delivery-message/config.ts`, add an in-memory LRU or Redis cache:
   ```typescript
   let memoryCachedConfig: DeliveryMessageConfig | null = null;
   let lastFetchTime = 0;
   const CACHE_TTL_MS = 60_000; // 60 seconds

   export async function getDeliveryMessageConfig(): Promise<DeliveryMessageConfig> {
     const now = Date.now();
     if (memoryCachedConfig && (now - lastFetchTime) < CACHE_TTL_MS) {
       return memoryCachedConfig;
     }
     // Fetch from DB & update memoryCachedConfig
   }
   ```
2. In `app/api/admin/delivery-message-config/route.ts`, clear `memoryCachedConfig = null` inside the `PUT` handler to bust cache on admin update.

---

### 🔹 Upgrade 4: Dynamic Threshold Interpolation from Delivery Pricing

#### Goal
Instead of hardcoding "৳500+ order" or "৳1100+" in the Bengali text, dynamically inject values from `lib/delivery-pricing.ts`.

#### Implementation Steps:
1. In `lib/delivery-message/config.ts`, parse template variables:
   - `{inside_dhaka_free_min}` $\rightarrow$ Replaced with actual config value.
   - `{outside_dhaka_charge}` $\rightarrow$ Replaced with actual courier rate.
2. The resolver replaces `{...}` placeholders dynamically before returning `messageText`.

---

### 🔹 Upgrade 5: Geolocation / City Auto-Detection

#### Goal
Detect customer city (Inside Dhaka vs Outside Dhaka) from IP or recent shipping address and highlight relevant pricing.

#### Implementation Steps:
1. Read city from user's default `Address` record or GeoIP header (`x-vercel-ip-city`).
2. If city === 'Dhaka', highlight "ঢাকার ভিতরে ফ্রি ডেলিভারি".
3. If city !== 'Dhaka', highlight "ঢাকার বাইরে বিশেষ অফার".

---

## 🧪 5. Testing & Verification Guide

Whenever making upgrades in the future, run the automated test matrix:

```bash
# 1. Run canonical logic test matrix
node node_modules/tsx/dist/cli.mjs scripts/test-phase8-delivery-matrix.ts

# 2. Run repository typecheck
npm run typecheck

# 3. Run repository linter
npm run lint

# 4. Run production build
npm run build
```

---

*Last Updated: 2026-08-31 | Minsah Beauty Core Architecture*
