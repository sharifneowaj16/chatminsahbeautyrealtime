# Phase 7B Mobile Runtime Accessibility & Small-Phone QA Checklist

Use this checklist after deployment or while running the app locally with `npm run dev`.

## Runtime commands

```bash
npm install
npx playwright install chromium
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npm run qa:shop-a11y-runtime
npm run qa:shop-phase7b
npm run audit:shop-release
```

## Devices / viewport

- 390 × 844 Pixel 5 / compact Android viewport
- 375 × 812 iPhone-style compact viewport
- 360 × 740 small Android viewport

## Filter drawer

- Filter button opens one dialog only.
- Focus moves into the filter drawer.
- Escape closes the drawer.
- Back button closes the drawer without applying unwanted navigation.
- Swipe down closes the drawer on touch devices.
- Brand search input is visible and announced as “Search brands inside filter drawer”.
- Searching a brand filters the brand chips without hiding already-selected brands.
- Brand no-match copy appears when nothing matches.
- Show Products footer is not covered by the bottom nav / safe area.
- Updating results message appears while filter changes are pending.

## Sort sheet

- Sort button opens a separate sort sheet, not the filter drawer.
- Sort sheet contains only public sort values.
- Biggest Discount applies `sort=biggest-discount` in the URL.
- Escape closes the sort sheet.
- Swipe down closes the sort sheet.
- Sort footer respects iOS/Android safe area.

## Empty-state recovery

- No-result page shows Clear filters.
- If brand is active, “Remove brand” chip appears.
- If category is active, “Remove category” chip appears.
- If price is active, “Widen price” chip appears.
- If sort is active, “Reset sort” chip appears.
- Recovery chips update the URL without a full reload.

## Quick discovery

- Quick discovery chips appear under active filters when facets are available.
- Category/brand quick chips come from real server facets.
- Best sellers / discounts / in-stock chips remain tap-target safe.

## Accessibility evidence

- Playwright + axe test passes for shop page, filter drawer, and sort sheet.
- Keyboard Tab stays inside Headless UI dialogs.
- No checkout/purchase action is implied by recovery/error microcopy.
