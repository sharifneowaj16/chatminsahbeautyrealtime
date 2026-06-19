# Missing Or Renamed Requested Files

These exact requested paths were not present in the repo. Closest existing files were copied where useful.

- `app/api/cart/[id]/route.ts` -> actual copied file: `app/api/cart/[itemId]/route.ts`.
- `components/cart/CartDrawer.tsx` -> not found.
- `components/cart/CartSummary.tsx` -> not found.
- `components/product/BuyNowModal.tsx` -> not found; copied actual `components/cart/BuyNowModal.tsx` as `components-product-BuyNowModal.tsx`.
- `app/api/auth/password-reset/route.ts` -> not found; actual copied file: `app/api/auth/reset-password/route.ts`.
- `app/api/wishlist/route.ts` -> not found.
- `app/api/wishlist/[id]/route.ts` -> actual copied file: `app/api/wishlist/[itemId]/route.ts`.
- `contexts/WishlistContext.tsx` -> not found.
- `app/api/categories/[slug]/route.ts` -> not found; actual copied file: `app/api/categories/[id]/route.ts`; category page `app/categories/[slug]/page.tsx` was also copied.
- `app/api/brands/route.ts` -> not found; brand pages were copied instead.
- `app/api/brands/[slug]/route.ts` -> not found; brand pages were copied instead.
- `app/api/combos/route.ts` -> not found; combo page was copied instead.
- `app/api/combos/[id]/route.ts` -> not found.
- `components/layout/Header.tsx` -> not found; actual copied file: `app/components/Header.tsx`.
- `components/layout/Navbar.tsx` -> not found; closest copied file: `app/components/MegaMenu.tsx`.
