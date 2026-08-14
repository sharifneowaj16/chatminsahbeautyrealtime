# Meta Business Platform Integration

This project now contains a server-side Meta Business Platform layer built on the official `facebook-nodejs-business-sdk` package. The existing Pixel and Conversions API implementation remains unchanged; the new layer adds Marketing API, audiences, catalogs, lead ads, and offline conversions.

## Implemented capabilities

| Capability | Implementation |
|---|---|
| Ad account management | `GET /api/admin/meta/ad-account` |
| Campaign list/create/update | `GET/POST/PATCH /api/admin/meta/campaigns` |
| Ad Set list/create/update | `GET/POST/PATCH /api/admin/meta/adsets` |
| Ad Creative list/create/update | `GET/POST/PATCH /api/admin/meta/creatives` |
| Ad list/create/update | `GET/POST/PATCH /api/admin/meta/ads` |
| Budget and bid management | Campaign and Ad Set create/update payloads; BDT values converted to minor units |
| Ads Insights and ROAS | `GET /api/admin/meta/insights`; calculates purchase value, purchase count, and ROAS |
| Customer File Custom Audiences | `POST /api/admin/meta/audiences` |
| Customer audience member sync | `POST /api/admin/meta/audiences/sync`; add/remove/replace, SHA-256 normalized identifiers |
| Database segment sync | `all_marketable`, `newsletter`, and `purchasers_180d` segments |
| Lookalike Audience creation | `POST /api/admin/meta/audiences/lookalike` |
| Website retargeting audiences | `POST/PATCH /api/admin/meta/audiences/retargeting` |
| Product Catalog list/create/update | `GET/POST/PATCH /api/admin/meta/catalogs` |
| Product and variant Items Batch sync | `POST /api/admin/meta/catalogs/sync` |
| Commerce inventory sync | Same endpoint with `inventoryOnly: true` |
| Product Feed create/upload/schedule | `POST /api/admin/meta/catalogs/feed` |
| Protected catalog CSV feed | `GET /api/meta/catalog/feed?token=...` |
| Scheduled application-side catalog sync | `POST /api/internal/meta/catalog-sync` |
| Lead Ads historical retrieval | `POST /api/admin/meta/leads` |
| Lead Ads storage/listing | `GET /api/admin/meta/leads` and `MetaLead` migration table |
| Lead Ads page subscription | `POST /api/admin/meta/leads/subscribe` |
| Lead Ads webhook verification and ingestion | `GET/POST /api/webhooks/meta/leadgen` with HMAC signature verification |
| Offline Conversion upload | `POST /api/admin/meta/offline-events`, delivered to `META_DATASET_ID` with the Business SDK EventRequest |
| Operational audit trail | `MetaBusinessSyncLog` migration table; success/failure details for every write/sync |
| Admin interface | `/admin/meta-business` |

## Security defaults

- Every read endpoint requires an authenticated admin.
- Every Meta write, sync, campaign, audience, catalog, lead subscription, and offline upload requires `SUPER_ADMIN`.
- New campaigns, ad sets, and ads default to `PAUSED`.
- Meta access tokens are read only from environment variables and are never returned by the settings API.
- Customer list identifiers are normalized and SHA-256 hashed before upload.
- Only users who have marketing preferences enabled are included in automatic customer audience segments.
- Lead webhooks require `X-Hub-Signature-256` validation with `META_APP_SECRET`.
- Catalog feed URLs require a timing-safe `META_CATALOG_FEED_TOKEN` check.
- Internal scheduled sync requires `META_BUSINESS_CRON_SECRET` or `INTERNAL_CRON_SECRET`.

## Required environment variables

```env
META_BUSINESS_ACCESS_TOKEN=
META_BUSINESS_ID=
META_AD_ACCOUNT_ID=
META_PAGE_ID=
META_PAGE_ACCESS_TOKEN=
META_INSTAGRAM_ACTOR_ID=
META_PIXEL_ID=
META_DATASET_ID=
META_CATALOG_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
META_CATALOG_FEED_TOKEN=
META_BUSINESS_CRON_SECRET=
NEXT_PUBLIC_SITE_URL=https://your-domain.example
META_GRAPH_API_VERSION=v24.0
```

`META_BUSINESS_ACCESS_TOKEN` should be a long-lived System User access token. The code falls back to `META_CAPI_ACCESS_TOKEN`, but separate tokens are easier to rotate and audit.

## Meta permissions and asset assignment

The System User/app must be assigned to the Business, Ad Account, Page, Pixel/Dataset, and Catalog. Depending on the enabled features and Meta App Review status, the integration normally needs:

- `ads_management` for campaign, ad set, creative, ad, budget, and bid writes.
- `ads_read` for insights and read-only reporting.
- `business_management` for Business-owned asset and catalog operations.
- `catalog_management` for catalog, product item, feed, and inventory operations.
- `leads_retrieval` for Lead Ads data.
- Page permissions required by Meta for subscribing the Page app and reading Lead Ads metadata, commonly including `pages_manage_metadata`, `pages_read_engagement`, and `pages_show_list`.

Permissions alone are not enough: Meta must also grant the app the required access level and the System User must have asset-level tasks.

Official references:

- Business SDK: https://developers.facebook.com/docs/business-sdk/
- Marketing API authorization: https://developers.facebook.com/documentation/ads-commerce/marketing-api/get-started/authorization
- Customer File Custom Audiences: https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences/
- Lead Ads: https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads
- Lead Ads webhooks: https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/quickstart/webhooks-integration
- Conversions API: https://developers.facebook.com/documentation/ads-commerce/conversions-api

## Webhook setup

Use this callback URL in the Meta app:

```text
https://YOUR_DOMAIN/api/webhooks/meta/leadgen
```

Use the exact value of `META_WEBHOOK_VERIFY_TOKEN` as the verification token. After webhook verification, call the admin action **Subscribe Lead Webhook** or:

```http
POST /api/admin/meta/leads/subscribe
{}
```

The Page access token must have access to the Page and Lead Ads.

## Catalog feed setup

Create a feed:

```http
POST /api/admin/meta/catalogs/feed
{
  "action": "create",
  "name": "Minsah Beauty Product Feed"
}
```

Schedule a daily pull using the protected project feed URL:

```http
POST /api/admin/meta/catalogs/feed
{
  "action": "schedule",
  "feedId": "META_FEED_ID",
  "interval": "DAILY",
  "hour": 2,
  "minute": 0
}
```

When no URL is supplied, the service creates one from `NEXT_PUBLIC_SITE_URL` and `META_CATALOG_FEED_TOKEN`.

## Application-side scheduled inventory sync

Configure a scheduler to call:

```http
POST /api/internal/meta/catalog-sync?inventoryOnly=true
Authorization: Bearer YOUR_META_BUSINESS_CRON_SECRET
```

A full product/variant sync uses `inventoryOnly=false`.

## Offline conversion payload

```json
{
  "events": [
    {
      "eventName": "Purchase",
      "actionSource": "physical_store",
      "eventTime": 1784188800,
      "eventId": "offline-order-123",
      "email": "customer@example.com",
      "phone": "+8801XXXXXXXXX",
      "value": 2500,
      "currency": "BDT",
      "orderId": "ORDER-123"
    }
  ]
}
```

The SDK recognizes pre-hashed SHA-256 identifiers and does not hash them again.

## Database migration

Run:

```bash
npm run db:migrate
```

Migration `20260716000100_add_meta_business_platform` creates:

- `MetaLead`
- `MetaBusinessSyncLog`

The integration accesses these isolated Meta tables with parameterized Prisma raw SQL so the rest of the generated Prisma client remains unchanged.

## Validation

```bash
npm run qa:meta-business-platform
npm run typecheck
```
