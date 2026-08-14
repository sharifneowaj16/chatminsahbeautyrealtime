# Phase 10 — Product URL & Tracking QA Guardrails

The storefront uses slug-first public URLs while tracking and Meta catalog identity continue to use canonical product/variant identifiers. `productPath()` controls navigation, canonical redirects preserve approved attribution parameters, and tracking payloads never replace `content_ids` with slugs.

## QA

Run `npm run qa:product-url-tracking`. The audit checks active-only public product resolution, slug canonicalization, catalog IDs, GA4 item payloads, bundle tracking suppression, and product-page ViewContent identity.
