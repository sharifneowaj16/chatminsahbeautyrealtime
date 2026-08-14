# FCP-03 Route Shell Matrix

| Route family | Owner | Header | Footer | Mobile bottom nav | Notes |
|---|---|---:|---:|---:|---|
| Storefront/content/cart/wishlist | `app/(storefront)/layout.tsx` → `AppShell` | Site header | Site footer | Yes | Shell owns skip link, main landmark, cart drawer and floating actions. |
| Product detail | `AppShell` product policy | Product sticky header only | Site footer | No | Prevents product sticky CTA and bottom-nav overlap. |
| Account | Account layout | No storefront header | No storefront footer | No | Authenticated account shell remains isolated. |
| Checkout/payment | Checkout layouts/pages | Checkout header | No storefront footer | No | Fixed checkout CTA owns its safe area. |
| Authentication | Auth route layouts | No storefront shell | No | No | Focused authentication experience. |
| Gift | Gift route | Gift-specific UI | No | No | Gift payer CTA owns its safe area. |
| Admin | Admin layouts | Admin header | No storefront footer | No | Admin navigation remains isolated. |
| Marketing | Marketing layout | Marketing UI | No storefront footer | No | Internal marketing tools remain isolated. |
| API/test/system | Root layout | None | None | No | Providers or route handlers only. |
