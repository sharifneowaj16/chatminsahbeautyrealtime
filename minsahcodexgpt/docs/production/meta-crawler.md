# Meta Crawler & Cloudflare Production Runbook

> **Target**: Ensure 100% unimpeded crawler access for Meta Commerce Manager catalog feeds, pixel scraping, and OpenGraph link unfurling.

---

## 1. Verified Meta Crawler User-Agents

Meta operates distributed crawling agents across global IP ranges:
- `facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)`
- `Facebot`
- `meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)`
- `meta-externalfetcher/1.0`

---

## 2. Robots.txt Whitelist Specification

Configured in `app/robots.ts`:

```typescript
{
  userAgent: [
    'facebookexternalhit',
    'Facebot',
    'meta-externalagent',
    'meta-externalfetcher',
  ],
  allow: ['/', '/products/', '/api/meta/catalog/feed', '/api/meta/catalog/'],
  disallow: ['/admin/'],
}
```

This guarantees that:
1. Product pages (`/products/*`) are fully accessible.
2. The dynamic catalog CSV feed (`/api/meta/catalog/feed`) is not blocked by generic `/api/` disallow directives.
3. Administrative routes (`/admin/*`) remain strictly private.

---

## 3. Cloudflare WAF & Bot Management Bypass Rule

If the production domain is behind Cloudflare or another edge CDN/WAF:

### Rule 1: Custom WAF Rule (Bypass Challenge for Verified Meta Crawlers)
- **Rule Name**: `Allow Meta Commerce Crawlers`
- **Field Filter**:
  ```text
  (cf.client.bot and (http.user_agent contains "facebookexternalhit" or http.user_agent contains "Facebot" or http.user_agent contains "meta-externalagent" or http.user_agent contains "meta-externalfetcher"))
  ```
- **Action**: `Bypass`
- **Bypass Features**:
  - `Managed Challenge`
  - `Interactive Challenge`
  - `Rate Limiting`

### Rule 2: Catalog Feed Cache Optimization
- **Path**: `/api/meta/catalog/feed`
- **Edge Cache TTL**: 120 seconds (or bypassed with Redis backend caching).
- **Cache Invalidation**: Automated via `invalidateCatalogFeedCache()` on any product mutation.

---

## 4. Verification Check

To test crawler accessibility from CLI:

```bash
curl -I -A "facebookexternalhit/1.1" https://minsahbeauty.com/api/meta/catalog/feed
```

Expected Response:
```http
HTTP/2 200
content-type: text/csv; charset=utf-8
cache-control: public, s-maxage=60, stale-while-revalidate=300
```
