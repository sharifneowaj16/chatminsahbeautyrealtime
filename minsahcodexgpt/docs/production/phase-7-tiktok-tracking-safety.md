# Phase 7 — TikTok Tracking Safety Guard

## Goal

Prevent accidental unverified TikTok `Purchase` events and make TikTok enablement predictable.

## Implemented

- `lib/tracking/manager.ts` now requires both `NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED === 'true'` and `NEXT_PUBLIC_TIKTOK_PIXEL_ID` before TikTok browser tracking is considered enabled.
- `lib/tracking/pixels/AllPixels.tsx` uses the same TikTok enable contract as the manager.
- `trackTikTok()` now blocks generic client-side `Purchase` before it can send TikTok `Purchase`.
- When a blocked TikTok Purchase is attempted, the browser logs a warning and pushes `mb_tiktok_purchase_blocked` to `dataLayer` when available.
- `.env.example` and production env docs now document TikTok as browser Pixel only.
- `app/admin/tracking/page.tsx` no longer presents hardcoded TikTok ROAS/conversion revenue as verified data.

## Why

Meta and GA4 already prevent generic client-side Purchase events and only send Purchase through verified server-side flows. TikTok had no equivalent guard, so a future generic `track('Purchase')` call could have fired an unverified TikTok `Purchase` browser event.

## Production expectation

TikTok browser Pixel events may be used for upper/mid-funnel observation. TikTok Purchase, revenue, and ROAS should not be treated as verified until a server-side TikTok Events API flow is implemented, retried, monitored, and audited.

## Verification

Run:

```bash
npm run qa:phase7-tiktok-tracking-safety
```
