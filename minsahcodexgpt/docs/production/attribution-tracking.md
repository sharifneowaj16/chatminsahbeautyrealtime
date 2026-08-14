# Phase 13 — Attribution Tracking

This phase enriches first-party order attribution so Meta CAPI, GA4 Measurement Protocol, and admin diagnostics can analyze performance by ad, creative, landing offer, coupon, free-delivery promise, and A/B variant.

## Captured landing/query parameters

`AttributionCookieCapture` stores these values in the first-party `mb_attribution` cookie for checkout/order creation:

```txt
utm_source
utm_medium
utm_campaign
utm_content
utm_term
campaign_id
adset_id
ad_id
placement
offer_version
ab_variant
coupon_code
free_delivery_threshold
landing_offer
campaign_source_url
```

If `campaign_source_url` is not explicitly present, the browser stores a sanitized copy of the current landing URL when campaign/offer attribution exists.

## Order DB fields

The order creation API reads the attribution cookie server-side through `readOrderAttribution()` and saves these fields on `Order`:

```txt
utmSource
utmMedium
utmCampaign
utmContent
utmTerm
campaignId
adsetId
adId
placement
offerVersion
abVariant
attributionCouponCode
freeDeliveryThreshold
landingOffer
campaignSourceUrl
firstLandingPath
firstLandingUrl
referrer
```

`couponCode` remains the actual coupon applied during checkout. URL/campaign `coupon_code` is stored separately as `attributionCouponCode` so an ad coupon does not falsely become an applied order coupon.

## Payment redirect protection

Payment return paths are skipped by browser attribution capture. Gateway return URLs/referrers must not overwrite original campaign attribution.

Protected behavior:

```txt
Original ad/landing attribution remains intact
Payment gateway referrers are ignored
Payment return query params do not overwrite mb_attribution
firstLandingUrl/firstLandingPath are not set from payment return pages
```

## Meta CAPI enrichment

Server-side Purchase payloads include attribution in schema-versioned `custom_data`:

```txt
utm_source
utm_medium
utm_campaign
utm_content
utm_term
campaign_id
adset_id
ad_id
placement
offer_version
ab_variant
applied_coupon_code
attribution_coupon_code
coupon_code
free_delivery_threshold
landing_offer
campaign_source_url
schema_version
```

This applies to both COD phone-confirmed Purchase and online verified-payment Purchase.

## GA4 Measurement Protocol enrichment

Server-side GA4 purchase params include the same attribution family plus GA4-friendly campaign aliases:

```txt
utm_source / source
utm_medium / medium
utm_campaign / campaign
utm_content / content
utm_term / term
campaign_id
adset_id
ad_id
placement
offer_version
ab_variant
applied_coupon_code
attribution_coupon_code
free_delivery_threshold
landing_offer
campaign_source_url
```

`transaction_id = order.id` remains unchanged, and purchase remains server-side only.

## QA

Run:

```bash
npm run qa:tracking-attribution
npm run qa:phase13
```

Recommended deploy gate order:

```bash
npm run audit:security
npm run qa:phase8-static
npm run qa:phase12
npm run qa:phase13
npm run qa:tracking-deploy-gate
npm run typecheck
npm run build
```

## Manual verification checklist

Use a campaign landing URL like:

```txt
/product/example?utm_source=facebook&utm_medium=paid_social&utm_campaign=eid_sale&utm_content=creative_3&utm_term=lipstick&campaign_id=123&adset_id=456&ad_id=789&placement=facebook_feed&offer_version=eid_v2&ab_variant=B&coupon_code=EID10&free_delivery_threshold=1500&landing_offer=free_delivery
```

Then verify:

```txt
Order attribution fields are saved
Admin tracking order diagnostics show attributionPresent fields true
Meta Events Manager custom_data contains schema_version plus attribution params
GA4 DebugView purchase params contain UTM/offer/A-B/coupon/free-delivery params
Payment gateway return does not overwrite original attribution
```
