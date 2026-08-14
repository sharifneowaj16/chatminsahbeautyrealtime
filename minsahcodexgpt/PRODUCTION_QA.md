# Production QA Control Matrix

Production deployment is blocked until the automated gates and the manual evidence flags in `lib/tracking/full-production-qa-matrix.ts` are satisfied.

## Required command order

1. `npm run audit:security`
2. `npm run qa:phase8-static`
3. `npm run qa:tracking-deploy-gate`
4. `npm run qa:admin-api-security`
5. `npm run typecheck`
6. `npm run build`
7. `npm run qa:production`

## Manual evidence

The admin Production QA page lists each required `QA_*_VERIFIED` environment flag and optional evidence URL. Evidence must identify the environment, capture time, operator, and immutable artifact hash. Never attach raw access tokens, customer email, phone, or unredacted webhook payloads.

## Release rule

A static pass does not prove a production integration. Catalog, CAPI, lead, diagnostics, ads, Instagram, Redis worker, and migration evidence remain explicit release inputs.
