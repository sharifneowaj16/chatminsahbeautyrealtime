# Phase 31 Layer 8.1 — Social cutover feature flags

## Purpose

This contract makes the Phase 31 migration observable and fail-safe before any cutover authority is changed. It does not complete the Lead Ads, Instagram, Facebook, realtime, webhook, or outbound-write cutovers; those are owned by Items 8.2–8.6.

## Canonical flags and safe defaults

| Flag | Tier | Default | Production default | Meaning when enabled |
| --- | --- | ---: | ---: | --- |
| `META_PLATFORM_LEADS` | Required | `false` | `false` | Authorizes the platform Lead Ads path during Item 8.3. |
| `META_PLATFORM_INSTAGRAM` | Required | `false` | `false` | Authorizes the platform Instagram read path during Item 8.4. |
| `META_PLATFORM_LEGACY_FACEBOOK` | Required | `true` | `true` | Keeps the legacy Facebook fallback available through Item 8.5. |
| `META_PLATFORM_SOCIAL_REALTIME` | Required | `false` | `false` | Authorizes the normalized realtime bridge during Item 8.5. |
| `META_PLATFORM_SOCIAL_WEBHOOKS` | Required | `false` | `false` | Authorizes platform social webhook processing during Items 8.3–8.5. |
| `META_PLATFORM_INSTAGRAM_WRITES` | Optional | `false` | `false` | Allows controlled standard Instagram replies after Item 8.2 protection. |
| `META_PLATFORM_INSTAGRAM_PRIVATE_REPLY` | Optional | `false` | `false` | Allows controlled private replies as a separate capability. |
| `META_PLATFORM_SOCIAL_MEDIA_DOWNLOADS` | Optional | `false` | `false` | Allows bounded media download and validation work. |
| `META_PLATFORM_SOCIAL_REPLAY` | Optional | `false` | `false` | Allows approval-backed replay after rollback controls are proven. |

The authoritative machine-readable contract is `config/meta-phase31-cutover-flags.json`.

## Accepted values and invalid behavior

Accepted values are case-insensitive:

```txt
true / false
1 / 0
yes / no
```

An omitted flag uses its declared safe default. An invalid value has two protections:

1. Shared environment validation fails with a clear error.
2. Runtime status resolves the flag to its per-flag fail-safe value and marks it `INVALID_VALUE_FAIL_SAFE`.

New platform authority and external side-effect flags fail to `false`. `META_PLATFORM_LEGACY_FACEBOOK` fails to `true` so the reversible fallback is not accidentally removed.

## Runtime visibility

The protected admin endpoint `GET /api/admin/meta/health` includes a secret-free `health.cutover` object with:

- contract version and item;
- overall validity;
- configured and enabled counts;
- invalid flag names;
- each flag's effective value, source, safe default, tier, purpose, and reason code.

Raw environment values are never returned.

## Existing compatibility controls

The repository already contains lower-level selectors such as `META_PHASE31_LEAD_RUNTIME`, Instagram inbound/outbound/media runtime selectors, Facebook inbox runtime, Page-domain runtime, and realtime bridge/legacy controls. They remain inventoried in the machine-readable manifest, but their final relationship to the canonical flags is intentionally owned by Items 8.3–8.5. Item 8.1 does not silently change those existing runtime paths.

## Deployment rule

Before production deployment:

```bash
node scripts/validate-env.mjs --file .env.production --production
npm run qa:phase31-meta-layer8.1
```

No Prisma schema or migration is required for this item.

## Item 8.3 Lead Ads authority

`META_PHASE31_LEAD_RUNTIME` accepts `LEGACY`, `SHADOW`, `PLATFORM`, the compatibility alias `DOMAIN`, and `LEGACY_ROLLBACK`. Shadow retains legacy authority and performs only safe, side-effect-free normalization parity. Platform authority additionally requires both `META_PLATFORM_LEADS=true` and `META_PLATFORM_SOCIAL_WEBHOOKS=true`. See `docs/runbooks/meta-phase31-layer8-lead-cutover.md`.

## Instagram selector reconciliation (Item 8.4)

`META_PHASE31_INSTAGRAM_INBOUND_RUNTIME`, `META_PHASE31_INSTAGRAM_OUTBOUND_RUNTIME`, and `META_PHASE31_INSTAGRAM_MEDIA_RUNTIME` accept `LEGACY`, `SHADOW`, `PLATFORM`, the compatibility alias `DOMAIN`, and `LEGACY_ROLLBACK`. Shadow keeps legacy durable authority and performs safe normalized parity only. Standard writes, private replies, and media downloads remain separately fail-closed. See `docs/runbooks/meta-phase31-layer8-instagram-cutover.md`.

## Facebook and realtime selector reconciliation (Item 8.5)

`META_PHASE31_FACEBOOK_INBOX_RUNTIME` accepts `LEGACY`, `SHADOW`, `PLATFORM`, the compatibility alias `DOMAIN`, and `LEGACY_ROLLBACK`. The canonical Facebook legacy, social realtime and social webhook flags must agree with `REALTIME_FACEBOOK_MODE`, `REALTIME_RUNTIME_FLAVOR`, and the explicit legacy rollback enable. Incomplete combinations are safe-disabled; they never activate parallel provider or retry owners. See `docs/runbooks/meta-phase31-layer8-facebook-realtime-cutover.md`.
