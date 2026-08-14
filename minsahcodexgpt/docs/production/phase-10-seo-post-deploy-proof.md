# Phase 10 — SEO Post-Deploy Proof Runbook

## Goal

Prove that the production deployment is crawlable, indexable only where intended, and using verified business/contact details before submitting the site to search engines.

## No-Go conditions

Do not request indexing or treat SEO as production-ready if any of these fail:

- `/robots.txt` blocks `/_next/` or does not expose `sitemap.xml`.
- `/sitemap.xml` contains private/noindex pages such as `/cart`, `/checkout`, `/account`, `/login`, `/search`, `/wishlist`, `/favourites`, `/admin`, or `/test`.
- `NEXT_PUBLIC_SUPPORT_PHONE` or `NEXT_PUBLIC_BUSINESS_ADDRESS` is still a placeholder.
- Open Graph image or logo returns non-200.
- Private pages render without `noindex`.
- `www` and non-`www` do not resolve to the canonical production host.
- Product/category/brand pages emit invalid canonical URLs or broken structured data.

## Static gate

Run before deployment:

```bash
npm run qa:seo-100
npm run qa:phase10-seo-postdeploy
```

This verifies the local code contract for robots, sitemap, OG assets, Organization/WebSite schema, business profile handling, and production checklist docs.

## Production env gate

Run in CI or the production shell with real env values:

```bash
NODE_ENV=production \
NEXT_PUBLIC_APP_URL=https://minsahbeauty.cloud \
NEXT_PUBLIC_SUPPORT_EMAIL=support@minsahbeauty.cloud \
NEXT_PUBLIC_SUPPORT_PHONE=+8801XXXXXXXXX \
NEXT_PUBLIC_BUSINESS_ADDRESS="Your verified Bangladesh business address" \
NEXT_PUBLIC_FACEBOOK_URL=https://www.facebook.com/your-official-page \
NEXT_PUBLIC_INSTAGRAM_URL=https://www.instagram.com/your-official-profile \
npm run qa:phase10-seo-postdeploy -- --production
```

`NEXT_PUBLIC_FACEBOOK_URL` and `NEXT_PUBLIC_INSTAGRAM_URL` are optional, but if set they must be HTTPS URLs for official profiles.

## Live URL verification

Replace the domain if production uses a different canonical host.

```bash
curl -I https://minsahbeauty.cloud/robots.txt
curl -I https://minsahbeauty.cloud/sitemap.xml
curl -I https://minsahbeauty.cloud/images/og-default.jpg
curl -I https://minsahbeauty.cloud/images/logo.png
curl -I https://www.minsahbeauty.cloud/
```

Expected:

- `robots.txt` returns `200`.
- `sitemap.xml` returns `200`.
- OG image and logo return `200`.
- `www` redirects to the canonical host, or the canonical host policy is documented and consistent.

## Manual crawl/index checks

Check these page groups after deployment:

| URL | Expected result |
|---|---|
| `/` | indexable, canonical to homepage, OG image present, WebSite + Organization JSON-LD |
| `/shop` | indexable, canonical to `/shop`, ItemList JSON-LD if products exist |
| `/categories` | indexable landing page |
| `/categories/<slug>` | indexable only for active category |
| `/brands/<slug>` | indexable only for active brand |
| `/products/<slug>` | indexable only for active product; product schema must use real price/availability |
| `/about` | indexable trust page |
| `/contact` | indexable ContactPage schema with verified support info |
| `/faq` | indexable FAQPage schema |
| `/cart` | noindex |
| `/checkout` | noindex |
| `/login` | noindex |
| `/account` | noindex |
| `/search` | noindex |
| `/wishlist` / `/favourites` | noindex |
| `/admin` | blocked/noindex and not public |

## Search Console / Bing Webmaster Tools

After all gates pass:

1. Verify the canonical domain in Google Search Console.
2. Submit `https://minsahbeauty.cloud/sitemap.xml`.
3. Inspect the homepage, `/shop`, one category page, one brand page, and one active product page.
4. Verify the site in Bing Webmaster Tools.
5. Submit the same sitemap to Bing.
6. Save screenshots or export evidence for the release record.

## Open Graph / social preview checks

Test these in social preview tools:

- Homepage
- `/shop`
- one product page
- `/about`
- `/contact`
- `/faq`
- `/flash-sale`

Expected: title, description, image, and canonical URL should match the page.

## Rich Results checks

Use Rich Results / schema validators for:

- Homepage: Organization + WebSite SearchAction
- Contact: ContactPage + Organization contactPoint
- FAQ: FAQPage
- Product page: Product + Offer
- Category/brand landing pages: BreadcrumbList + ItemList

## Evidence to save

Save these in the release evidence pack:

- `npm run qa:seo-100` output
- `npm run qa:phase10-seo-postdeploy -- --production` output
- robots screenshot or curl output
- sitemap screenshot or curl output
- Search Console sitemap submission screenshot
- Bing Webmaster Tools sitemap submission screenshot
- social preview screenshots
- Rich Results validation screenshots

## Rollback trigger

Rollback or block indexing if production crawlers see private pages, placeholder business details, broken OG images, invalid canonical URLs, or broken Product/FAQ/Organization structured data.
