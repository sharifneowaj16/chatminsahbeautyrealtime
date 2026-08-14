# Shop Production Deploy Runbook

This runbook is the operational companion to the Phase 13 evidence pack.

## 1. Pre-deploy commands

```bash
npm install
npm run db:generate
npm run audit:shop-release
npm run build
```

If the environment has production database and Elasticsearch access:

```bash
npm run db:migrate
npm run elasticsearch:reindex
npm run qa:shop-a11y-runtime
```

## 2. Required production environment

Verify these before release:

- Database connection is valid.
- Elasticsearch endpoint/index are reachable.
- Redis/worker dependencies are reachable if workers are enabled.
- Tracking event route can persist `ShopTrackingEvent` records.
- CDN/image domains are configured.
- `NEXT_PUBLIC_SITE_URL` or equivalent canonical domain configuration is correct.

## 3. Deploy sequence

1. Put release artifact in staging.
2. Run database migrations.
3. Generate Prisma client.
4. Reindex Elasticsearch products.
5. Start app and workers.
6. Run `npm run audit:shop-release`.
7. Run `PLAYWRIGHT_BASE_URL=<staging-url> npm run qa:shop-a11y-runtime`.
8. Complete `docs/qa/PHASE13_FINAL_PRODUCTION_MANUAL_CHECKLIST.md`.
9. Promote staging to production.
10. Watch logs for the first 30 minutes.

## 4. Smoke checks immediately after deploy

- `/shop` renders products.
- `/api/products?view=listing` returns products and `X-Approx-Payload-Bytes`.
- `/api/search?q=serum` returns products and `X-Approx-Payload-Bytes`.
- `/api/shop/merchandising` returns server catalog sections.
- Mobile filter drawer opens/closes.
- Mobile sort sheet opens/closes.
- Product card Add to Cart succeeds.
- Buy Now click does not create purchase.
- Tracking event route returns success for valid sanitized events.

## 5. Rollback plan

Rollback is required if any P0/P1 issue appears after deployment.

### App rollback

1. Revert to previous stable deployment artifact.
2. Keep database forward-compatible where possible.
3. Disable new runtime-only features through config only if a feature flag exists.
4. Re-run `npm run audit:shop-release` on rollback artifact.

### Database rollback

Phase 8 introduced `ShopTrackingEvent`. If rollback is required:

- Do not drop tracking data unless explicitly approved.
- Old app versions should ignore the extra table.
- If a migration caused runtime failure, restore from backup or apply an explicit rollback migration.

### Elasticsearch rollback

- Reindex from database using previous mapping if mapping breaks search.
- If ES is unavailable, verify DB fallback behavior.
- Keep search/filter exactness QA logs for incident review.

### Analytics rollback

- If tracking persistence fails, app should degrade safely and log failure.
- Disable external provider forwarding before disabling internal event route.
- Confirm `buy_now_click` is not misclassified as purchase.

## 6. Incident thresholds

Treat as P0/P1:

- `/shop` unavailable.
- Product detail links broken.
- Add to Cart broken.
- Search/filter returns materially wrong product sets.
- Checkout path blocked by shop changes.
- Purchase/buy-now analytics misclassification.
- Security audit failure.
- Critical accessibility blocker in filter/sort dialogs.

## 7. Post-deploy evidence to archive

- Release artifact SHA256.
- `npm run audit:shop-release` output.
- Runtime Playwright/axe output.
- Lighthouse mobile output.
- Search smoke test output.
- Tracking event sample.
- Screenshots of `/shop`, filter drawer, sort sheet, empty state, merchandising sections.
