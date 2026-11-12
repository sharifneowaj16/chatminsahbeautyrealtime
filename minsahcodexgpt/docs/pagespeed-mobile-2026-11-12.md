# Mobile PageSpeed — minsahbeauty.cloud

Report: https://pagespeed.web.dev/analysis/https-minsahbeauty-cloud/a3sov4w4j1?form_factor=mobile

Captured: Nov 12, 2026, 8:05 PM GMT+6  
URL: https://minsahbeauty.cloud/  
Device: emulated Moto G Power, Lighthouse 13.6.0, Slow 4G, single page load

Scores: Performance **66**, Accessibility 96, Best Practices 92, SEO 100.

The score moves between 60 and 66 from run to run. The same three issues drive both numbers.

## Why the score is 66

JavaScript and layout shift are already fine. The score is lost on Largest Contentful Paint and Speed Index.

| Metric | Result | Points |
|---|---|---|
| First Contentful Paint | 1.9 s | 9 / 10 |
| Largest Contentful Paint | 7.3 s | 1 / 25 |
| Total Blocking Time | 0 ms | 30 / 30 |
| Cumulative Layout Shift | 0 | 25 / 25 |
| Speed Index | 9.3 s | 1 / 10 |
| **Total** | | **66** |

Root document time to first byte is 13 ms. The page is waiting on images and the hero slider, not on the server or on long JavaScript tasks.

Getting LCP under 2.5 s is what moves this score from the 60s into the 90s. Blocking time and layout shift are already at full marks.

## 1. Category icons are full-size PNGs

The category rail draws each icon at 34×34 CSS pixels (`.mb-cat-icon img` in `app/globals.css`), but the files are much larger.

| File | File size | Displayed size | Problem |
|---|---|---|---|
| `/images/categories/Skincare.png` | 532 KB, 1254×1254 | ~70 device pixels | almost all wasted |
| `/images/categories/Bath_&_Body.png` | 395 KB, 1254×1254 | ~70 device pixels | almost all wasted |
| Other category PNGs | ~150 KB combined | 34×34 CSS pixels | oversized and not modern format |

Those two files alone are about 900 KB. On the Slow 4G test (~200 KB/s) they occupy the connection for several seconds. They sit in the nav above the hero, so they also delay the hero image. That is the Speed Index of 9.3 s.

Lighthouse: **Improve image delivery — est. savings 1,038 KB.**

They are plain `<img src="/images/categories/...">` tags in `components/catalog/CategoryRail.tsx`, so they skip the Next.js image optimizer (`avif` / `webp` in `next.config.ts`).

**Fix:** export every category icon at 96×96 (2× of 34px, enough for high-density screens) as WebP or AVIF. Each file should be a few kilobytes. Point the rail at those small files. Do this first.

## 2. The hero is the LCP element, and it paints late

The LCP element is the hero image “Dewy Glow & Pure Botanical Radiance”.

| LCP slice | Time |
|---|---|
| Time to first byte | 13 ms |
| Wait before the image request starts | 1.6 s |
| Image download | 0.7 s |
| Wait after download before it paints | 3.8 s |
| **Largest Contentful Paint** | **7.3 s** |

The 1.6 s start delay is render-blocking CSS, then the huge category PNGs.

The 3.8 s paint delay is the slider. `components/home/hero/MobileHeroSlider.tsx` is a client component. Until JavaScript measures the container, `containerWidth` is 0, so the track has no transform and the first painted slide is the cloned last slide. After hydration it jumps to `activeIndex` 1 and the real banner enters the viewport.

Lighthouse also says that image is eager, but it does not have `fetchpriority="high"`. Both slide 0 and slide 1 are marked `priority` in `HeroSlideItem`, so two hero images compete.

**Fix:**

- Put the real first slide in view in the server HTML, with a CSS percentage transform. Measure width only for drag and autoplay after mount.
- Give `priority` and `fetchPriority="high"` to that one visible slide only.
- Preload that hero URL from the document head.

## 3. Render-blocking CSS and a short image cache

Three stylesheets block first paint. Lighthouse: **Render-blocking requests — est. savings 1,040 ms.**

- `/_next/static/css/970c81fb904750c6.css` — 60 KB, the app CSS (~1,072 ms)
- `/_next/static/css/e672e2b7531e7f6f.css` — 1.4 KB
- Google Fonts in `app/layout.tsx`: Hind Siliguri, Inter, Noto Sans Bengali, and Plus Jakarta Sans (~780 ms)

The app already loads Seed Sans locally. The Google stylesheet is an extra critical-path request before first paint.

Category images are cached for 4 hours (Cache TTL 14,400,000 ms). Lighthouse: **Use efficient cache lifetimes — est. savings 721 KB.**

**Fix:**

- Drop the unused Google families, or self-host only the Bengali weights actually used with `next/font`, so they are not a blocking third-party stylesheet.
- In `next.config.ts` `headers()`, set `/images/:path*` to `Cache-Control: public, max-age=31536000, immutable`.
- If Cloudflare’s Browser Cache TTL is 4 hours, raise that too, or the origin header will not stick.

## What not to chase

Unused JavaScript is about 109 KB (the framework chunk `4bd1b696-989fb15544b4f183.js` and the storefront layout chunk). Total Blocking Time is already 0 ms, so shrinking that JS will not move this score.

Accessibility is 96 (contrast, and a label/name mismatch). SEO is 100.

Best Practices is 92 because Cloudflare’s email-decode script and `beacon.min.js` hit a 520 and a Content-Security-Policy block. Those are separate from the performance number.

## Fix order

1. Resize category icons to 96×96 WebP/AVIF and point `CategoryRail` at them.
2. Paint the real first hero slide in server HTML, and priority-preload only that image.
3. Remove or self-host the Google Fonts stylesheet, and set a one-year cache on `/images/*` (origin and Cloudflare).
