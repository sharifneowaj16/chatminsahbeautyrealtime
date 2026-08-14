# Phase 13 Final Production Manual Verification Checklist

**Scope:** Final manual validation before Minsah Shop production release.  
**Owner:** Release engineer / senior developer.  
**Required browsers/devices:** Chrome desktop, mobile viewport around 390x844, one real iOS/Android device if available.

## A. Preflight

- [ ] `.env` production variables are present and reviewed.
- [ ] `npm install` completed successfully.
- [ ] `npm run db:migrate` completed successfully.
- [ ] `npm run elasticsearch:reindex` completed successfully.
- [ ] `npm run audit:shop-release` passes.
- [ ] `npm run build` passes in the target deploy environment.
- [ ] Production health endpoints/logs are clean.

## B. Shop navigation and URL contract

- [ ] `/shop` loads without query parameters.
- [ ] `/shop?category=<slug>` resolves to a valid filtered list and canonical points to `/categories/<slug>` when eligible.
- [ ] `/shop?brand=<slug>` resolves to a valid filtered list and canonical points to `/brands/<slug>` when eligible.
- [ ] Deep filters such as search, sort, price, page, rating are `noindex, follow`.
- [ ] Product card links are slug-first canonical product URLs.
- [ ] Pagination and filter changes do not hard reload the full page unnecessarily.

## C. Mobile filter and sort UX

- [ ] Mobile sticky search/filter/sort control is visible and does not consume excessive viewport space.
- [ ] Filter drawer opens from the Filter button.
- [ ] Sort sheet opens from the Sort button and does not open the filter drawer.
- [ ] Filter and sort panels are mutually exclusive.
- [ ] Escape closes the open panel on desktop keyboard.
- [ ] Backdrop tap closes the open panel.
- [ ] Back button closes the open panel before leaving the page.
- [ ] Swipe down closes the filter drawer.
- [ ] Swipe down closes the sort sheet.
- [ ] Safe-area padding keeps footer buttons above iPhone/Android bottom chrome.
- [ ] Focus returns to the trigger after close.
- [ ] Tap targets are comfortable on a 390px wide viewport.

## D. Phase 7B discovery polish

- [ ] Brand search input appears inside the mobile filter drawer.
- [ ] Searching a brand filters the brand list.
- [ ] Selected brands remain visible even if they do not match the current brand search query.
- [ ] No-match brand search displays helpful copy.
- [ ] Quick discovery chips appear from live facets.
- [ ] Best sellers, biggest discounts, and in-stock quick chips update the URL correctly.
- [ ] Filter preview pending copy appears briefly when applying filters.
- [ ] No-result state shows recovery chips.
- [ ] Recovery chips can remove brand/category, widen price, reset sort, include out-of-stock, or remove rating as applicable.

## E. Accessibility runtime

Run:

```bash
PLAYWRIGHT_BASE_URL=<production-or-local-url> npm run qa:shop-a11y-runtime
```

- [ ] Playwright mobile accessibility test passes.
- [ ] Axe reports no critical or serious violations for shop mobile filter/sort paths.
- [ ] Screen reader labels are meaningful for filter, sort, search, close, chips, and recovery buttons.
- [ ] Keyboard-only navigation can operate search, filter drawer, sort sheet, and product cards.

## F. Search, facets, sort, and merchandising

- [ ] Search results match visible query and filter values.
- [ ] Server facets show categories, brands, price ranges, skin types, concerns, availability, and ratings.
- [ ] Active filters stay visible and removable even when result count is low or zero.
- [ ] `biggest-discount` sorts by discount, not relevance fallback.
- [ ] Merchandising sections load from `/api/shop/merchandising`.
- [ ] Contextual merchandising changes when category/brand/search changes.
- [ ] Small-catalog fallback does not show empty broken UI.

## G. Trust and product card behavior

- [ ] COD/free shipping/return/authenticity badges match server trust payloads.
- [ ] Product cards show correct price, original price, discount, rating, and stock state.
- [ ] Add to Cart works only after successful cart mutation.
- [ ] Buy Now tracking remains `intent_only` and does not mark purchase.
- [ ] Wishlist tracking does not break product card navigation.

## H. SEO and structured data

- [ ] `/shop` page source includes canonical URL.
- [ ] `/categories/<slug>` page source includes canonical URL and CollectionPage JSON-LD.
- [ ] `/brands/<slug>` page source includes canonical URL and CollectionPage JSON-LD.
- [ ] ItemList JSON-LD contains product list items with BDT Offer data.
- [ ] Review/rating structured data appears only when real review count exists.
- [ ] Sitemap and robots behavior match crawl strategy.

## I. Performance evidence

- [ ] `/api/search` response includes `X-Approx-Payload-Bytes`.
- [ ] `/api/products?view=listing` response includes `X-Approx-Payload-Bytes`.
- [ ] Listing API does not return heavy admin/body fields.
- [ ] Below-fold images lazy-load.
- [ ] Initial visible product images load eagerly enough for LCP.
- [ ] Product grid skeleton does not create obvious layout jump.
- [ ] Lighthouse mobile: LCP target <= 2.5s, INP target <= 200ms, CLS target <= 0.1.

## J. CRO analytics evidence

- [ ] `view_item_list` fires for shop grid and merchandising sections.
- [ ] `select_item` fires with correct list names and positions.
- [ ] `filter_open` and `filter_apply` fire with sanitized filter context.
- [ ] `sort_open` and `sort_apply` fire with public sort values.
- [ ] `add_to_cart` fires only after successful add.
- [ ] `buy_now_click` fires with `intent_only: true`.
- [ ] Server route persists sanitized event payloads where DB is available.

## K. Rollback readiness

- [ ] Current production artifact/version is recorded.
- [ ] Previous stable artifact is available.
- [ ] Database migration rollback plan is reviewed.
- [ ] Elasticsearch reindex rollback/fallback plan is reviewed.
- [ ] Tracking provider rollback/disable plan is reviewed.
- [ ] On-call owner and escalation path are documented.

## L. Final go/no-go

- [ ] All P0/P1 issues resolved.
- [ ] Known P2/P3 issues documented.
- [ ] Release owner approved.
- [ ] Business owner approved.
- [ ] Deploy window confirmed.
