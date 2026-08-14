# Meta Business SDK Full Platform Implementation

## Delivered

This project now uses the official `facebook-nodejs-business-sdk` as a server-side Meta Business Platform layer in addition to the existing Meta Pixel and Conversions API implementation.

### Marketing and advertising

- Ad Account read/status endpoint
- Campaign list, create, and update
- Ad Set list, create, and update
- Ad Creative list, create, and update
- Ad list, create, and update
- Campaign and Ad Set budget/bid controls with BDT-to-minor-unit conversion
- Ads Insights reporting with spend, conversions, purchase value, Meta ROAS, and calculated ROAS
- Safe default: newly created campaigns, ad sets, and ads are `PAUSED`

### Audiences

- Customer File Custom Audience creation
- Add, remove, or replace audience members
- Normalized SHA-256 hashing before upload
- Database segments: marketable customers, newsletter users, and 180-day purchasers
- Lookalike Audience creation
- Website-event retargeting Audience creation/update

### Catalog and Commerce

- Product Catalog list, create, and update
- Product and variant Items Batch synchronization
- Inventory-only synchronization
- Product Feed creation, upload, and scheduling
- Token-protected CSV feed
- Cron-protected full catalog/inventory synchronization endpoint

### Lead Ads and offline conversions

- Lead form historical retrieval
- Page Lead Ads webhook subscription
- HMAC-verified Lead Ads webhook ingestion
- Lead persistence in `MetaLead`
- Offline conversion upload to the configured Meta Dataset through the Business SDK CAPI request layer

### Operations and security

- SUPER_ADMIN required for every Meta write/sync operation
- Access tokens remain environment-only and are not returned by the settings API
- `MetaBusinessSyncLog` audit records for writes, syncs, successes, and failures
- Timing-safe feed and cron token checks
- Admin console at `/admin/meta-business`
- Production environment contract in `.env.example` and `config/env.manifest.json`
- Database migration: `20260716000100_add_meta_business_platform`

## Validation completed

```text
TypeScript: PASS
Targeted Meta ESLint: PASS (0 errors, 0 warnings)
Full Meta Business Platform audit: 22/22 PASS
Existing Meta CAPI audit: 50/50 PASS
Dependency install: PASS (0 npm audit vulnerabilities reported by npm ci)
```

## Production activation required

Code integration is complete, but live Meta operations require valid Business Manager asset assignments, System User/Page tokens, appropriate Meta permissions/access level, webhook configuration, environment secrets, and the included database migration.

See `docs/implementation/meta-business-platform.md` for setup, API routes, permissions, webhook configuration, scheduled catalog sync, and deployment steps.
