# Meta Tracking Future-Proofing Release Gate & Parity Audit

**Date:** 2026-10-03  
**Target Stitch Project:** https://stitch.withgoogle.com/projects/14594349592754916481  
**Generated Stitch Screens:**
- **Mobile Screen ID:** `d3093b22ed1a41d9814950a4a634cb5b` (*Minsah Ops - Mobile Meta CAPI Diagnostics & Return Refund Panel*)
- **Desktop Screen ID:** `a71ef16201d7431eb860cdf4614f4e35` (*Minsah Ops - Enterprise Meta CAPI Diagnostics & Return Refund Control Center*)

---

## 1. Executive Summary

All previously PARTIAL and MISSING Meta ecosystem tracking and catalog synchronization capabilities have been elevated to **100% VERIFIED PASS** with zero schema migration requirement, preserving strict side-track isolation and Phase 31 Item 9.8 integrity.

| Domain / Objective | Previous Status | Current Status | Key File / Implementation |
|---|---|---|---|
| **Meta CAPI Offline Refund & Cancellation Stream** | MISSING (Only GA4 MP supported refunds) | **100% PASS** | `lib/tracking/meta-capi-refund.ts`, `lib/queue/metaCapiQueue.ts` |
| **Limited Data Use (LDU) Dynamic Privacy** | PARTIAL (Static config, missing dynamic flag) | **100% PASS** | `lib/tracking/meta-schema.ts`, `FacebookPixel.tsx`, `meta-capi-cod-purchase.ts` |
| **Real-Time Catalog Graph API Feed Push** | PARTIAL (Only cron XML feed polling) | **100% PASS** | `lib/meta-platform/domains/catalog/event-sync.ts` (`triggerMetaCatalogFeedUpload`) |
| **Admin Diagnostics & Refund Ops UI/UX** | MISSING (No CAPI refund manual emit or EMQ panel) | **100% PASS** | `app/admin/tracking-health/MetaCapiDiagnosticsCenter.tsx`, `MetaRefundBadge.tsx` |
| **Courier Return Automatic Refund Trigger** | MISSING (Steadfast/Pathao returns did not trigger CAPI) | **100% PASS** | `app/api/webhook/steadfast/route.ts`, `app/api/webhooks/pathao/route.ts` |

---

## 2. Technical Architecture & Invariant Preservation

### 2.1 CAPI Offline Refund Stream (`lib/tracking/meta-capi-refund.ts`)
- **Event Name:** `Refund`
- **Action Source:** `other` (Meta Offline / CRM source requirement for COD returns)
- **Deduplication:**
  - Event ID format: `order-{orderId}-refund-{timestamp/orderNumber}`
  - Outbox validation: Checks `prisma.metaEventOutbox` for existing sent events with matching `provider`, `eventName: 'Refund'`, and `orderId`.
  - In-flight lock and idempotency verification prevents duplicate credit hits to Meta ad account.
- **Signal Hashing:** SHA-256 for `ph`, `em`, `fn`, `ln`, `ct`, `zp`, and normalization for `country: 'bd'`.
- **Value Semantics:** Pass exact refund amount with currency `'BDT'`.

### 2.2 Limited Data Use (LDU) Governance
- Meta Graph API CAPI parameters:
  - `data_processing_options: ['LDU']`
  - `data_processing_options_country: 0`
  - `data_processing_options_state: 0`
- Meta Pixel Client (`FacebookPixel.tsx`):
  - Injects `fbq('dataProcessingOptions', ['LDU'], 0, 0)` immediately before pixel init when `META_LDU_ENABLED` is active.

### 2.3 Real-Time Catalog Push Trigger (`POST /{commerce_account_id}/product_feeds/{feed_id}/uploads`)
- When inventory drops to 0 or critical depletion occurs, `triggerMetaCatalogFeedUpload()` initiates an immediate Graph API feed ingestion request to refresh Meta Catalog without waiting for the next scheduled feed crawl.
- Safely degrades with structured warning when feed credentials are not configured in staging/test environments.

### 2.4 Admin UI/UX Atomic Architecture
- Implemented as small atomic components matching Google Stitch designs:
  - `MetaCapiDiagnosticsCenter`: 4 KPI metrics (EMQ Score, Offline Refunds BDT, Deduplication Rate, LDU Active), 2-column desktop/stack mobile layout, live ingest stream, target return order card, one-tap "⚡ Emit Meta CAPI Refund" button, and raw JSON payload inspector.
  - `MetaRefundBadge`: Compact status pill for order details & tables.
  - Zero layout collision between desktop and mobile viewports (`hidden md:inline-flex`, responsive flex/grid wrappers).

---

## 3. Test & Verification Evidence

1. **Meta Tracking Test Suite:**
   ```bash
   node --conditions=react-server --import tsx --test tests/meta-tracking/*.test.mjs
   ```
   - `meta-capi-refund.test.mjs`: 3/3 PASS
   - `meta-catalog-graph-push.test.mjs`: 3/3 PASS
   - `meta-ldu-privacy.test.mjs`: 3/3 PASS
   - **Total:** 9/9 PASS (100%)

2. **Attribution QA Gate:**
   ```bash
   npm run qa:tracking-attribution
   ```
   - **Total:** 106/106 checks PASS (100%)

3. **Type Safety & Build Cleanliness:**
   ```bash
   npx tsc --noEmit
   ```
   - **Errors:** 0 errors (Exit code 0)

4. **Security & Data Governance:**
   - No raw PII stored or logged.
   - Admin authentication enforced (`admin_access_token` required for `/api/admin/tracking/meta-refund`).
   - Zero Prisma schema migrations required (`metaEventOutbox` and `metaCapiFailure` reused safely).
