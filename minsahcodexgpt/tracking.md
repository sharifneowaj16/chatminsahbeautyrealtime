# Tracking Safety Contract

## Phase 7 — TikTok browser tracking safety

TikTok browser tracking requires both `NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED=true` and a valid pixel ID. Generic client-side `Purchase` is blocked and emits `mb_tiktok_purchase_blocked`; verified purchase reporting must use the server-side TikTok Events API flow.

The admin dashboard must not represent browser-only counters as verified revenue or ROAS. Production enablement also requires `TIKTOK_EVENTS_API_ENABLED=true` and separately attached live verification before `TIKTOK_PURCHASE_LIVE_VERIFIED=true` is accepted.
