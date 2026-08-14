# PRD.md — Minsah Beauty Project Requirements Document

> **Document role:** Product and business source of truth.  
> **Project:** Minsah Beauty e-commerce, operations and growth platform  
> **Baseline source:** Uploaded `minsahbeauty-meta-v6-update` repository snapshot  
> **Snapshot date:** 2026-07-17/18  
> **Last document update:** 2026-07-19 (Asia/Dhaka)  
> **Status:** Living document; update whenever scope, acceptance criteria or business rules change.

---

## 1. Product summary

Minsah Beauty is a Bangladesh-focused beauty commerce and operations platform. It combines a mobile-first storefront, customer accounts, product and inventory administration, checkout and payments, courier integrations, marketing analytics, Meta/TikTok/GA4 tracking, social CRM, privacy controls and production release governance.

The product must help customers discover and purchase authentic beauty products while allowing the business team to safely operate catalog, stock, orders, delivery, customer support, marketing and social channels from a unified administration system.

## 2. Product vision

Create a trusted, fast and measurable beauty-commerce experience where:

- customers can find the right product, buy with low friction and track their order;
- administrators can manage products, inventory, orders, content and customers without direct database access;
- marketing teams can run measurable campaigns without unsafe automatic writes;
- support teams can handle website, Facebook and Instagram conversations with customer and order context;
- every sensitive external operation is durable, auditable, privacy-aware and recoverable;
- AI assists operators and developers but never bypasses permissions, approvals, evidence or business rules.

## 3. Business goals

1. Increase product discovery, add-to-cart and checkout conversion.
2. Preserve accurate stock, pricing, order and delivery state.
3. Provide nationwide Bangladesh delivery support with COD and supported online payment flows.
4. Maintain consistent product identity across storefront, catalog, Pixel, CAPI and advertising.
5. Reduce lost events, duplicate purchases and marketing attribution gaps.
6. Turn Meta leads and Instagram conversations into auditable CRM opportunities.
7. Give operations teams actionable diagnostics, queues, incidents and recovery tools.
8. Prevent production release claims without build, migration, runtime and rollback evidence.

## 4. Users and personas

### 4.1 Guest shopper

Needs to browse, search, filter, inspect products, use wishlist/cart, estimate delivery and start checkout without unnecessary friction.

### 4.2 Registered customer

Needs profile management, saved addresses, order history, tracking, returns, reviews, wishlist, loyalty and referral features.

### 4.3 Store administrator

Needs dashboard access to products, categories, brands, media, site content, users, reviews, coupons and settings.

### 4.4 Order and fulfilment operator

Needs order creation/update, payment status, courier booking, tracking, webhook history, returns and exception handling.

### 4.5 Inventory and procurement operator

Needs inventory counts, suppliers, purchase orders, receiving, low-stock shortlist and stock reconciliation.

### 4.6 Marketing operator

Needs tracking health, attribution, campaign insights, catalog health, audiences, product sets and approval-based ad actions.

### 4.7 Support and social CRM agent

Needs unified inbox, customer profile context, lead assignment, Facebook/Instagram messages, reply controls and conversation-to-order links.

### 4.8 Release manager / platform engineer

Needs build, typecheck, lint, migration, runtime evidence, rollback and production release gates.

### 4.9 Background system actors

Workers, schedulers, webhook processors and provider pollers execute durable operations with least privilege and no interactive access.

## 5. Product scope

### 5.1 Storefront and discovery

- Home page with configurable hero slides and merchandising sections.
- Shop, category, brand, offer, combo, new-arrival, recommendation and flash-sale pages.
- Product detail pages with images, variants, price/sale state, availability, trust content, reviews and related products.
- Search powered by application logic and Elasticsearch where enabled.
- Search suggestions, history, click analytics, filters, sort, facets and fallback behavior.
- Wishlist/favourites, cart and buy-now paths.
- SEO metadata, sitemap, robots, structured data and canonical URLs.
- Bengali market context with English/Bengali-compatible content.

### 5.2 Authentication and customer account

- Email/password registration, login, logout, refresh and verification.
- OTP/password reset and change-password flows.
- Google/Facebook social login through NextAuth where configured.
- Profile, avatar, preferences and saved addresses.
- Account dashboard, orders, returns, reviews, loyalty, referrals and wishlist.
- Session and refresh-token revocation controls.

### 5.3 Cart, checkout and payments

- Server-authoritative cart operations and quantity validation.
- Buy-now and normal cart checkout.
- Idempotent order creation and duplicate-submit protection.
- Delivery address validation and Bangladesh location selection.
- COD plus configured bKash, Nagad, Rocket and card/payment gateway routes.
- Order-first online payment lifecycle with callback/verification handling.
- Payment summary and customer-visible confirmation state.
- Automatic unpaid-order release/cleanup according to policy.

### 5.4 Orders, delivery and returns

- Customer and admin order creation, read and update.
- Order status and payment status state machines.
- Pathao location, store, delivery and webhook integration.
- Steadfast consignment, tracking, balance, bulk send and webhook integration.
- Courier failure accounting and retry-safe worker execution.
- Returns, return items, supporting uploads and admin review.
- Customer tracking page and order-level delivery summaries.

### 5.5 Catalog, inventory and procurement

- Product, variant, category, brand, supplier and media management.
- Inventory quantities, reservations and availability policy.
- Purchase orders and receiving.
- Inventory shortlist / purchase shortlist workflows.
- Import, AI-assisted description generation and unlisted product handling.
- Product lifecycle, sale windows, conditions and identifiers.
- Catalog identity based on stable SKU policy.

### 5.6 Content and merchandising administration

- Banners, blog, FAQ, pages, promotions and homepage sections.
- Brands, categories, combos, slides and featured product sections.
- Site configuration and business profile.
- Media upload and object-storage integration.

### 5.7 Reviews, loyalty and customer growth

- Product review creation/moderation.
- Coupons and promotions.
- Customer segmentation and top-customer views.
- Loyalty and referral customer surfaces.
- Product analytics and funnel events.

### 5.8 Search and analytics

- Elasticsearch indexing and reindexing.
- Search health, click position/integrity, trending suggestions and production smoke checks.
- Revenue, product and regional analytics.
- First-party campaign attribution with immutable order snapshots.
- Clear separation of first-party and provider-reported attribution.

### 5.9 Tracking and advertising integrations

- Meta Pixel and Conversions API event pairing with shared event IDs.
- GA4 and TikTok browser/server event pipelines.
- Consent-aware tracking and internal/test-traffic exclusion.
- Failure retention, health checks and cleanup jobs.
- Catalog, product sets, audiences, insights and approval-based Meta ad operations.
- No automatic critical ad mutation without required human approval.

### 5.10 Meta leads, Instagram and social CRM

- Signed/raw-body webhook verification.
- Receipt-first webhook persistence and stable deduplication.
- Lead retrieval, assignment, status, contact attempts and CRM context.
- Instagram conversation, message, attachment and reply-attempt persistence.
- Policy-aware standard/private replies.
- Account, permission and asset health checks.
- Unified admin operations view and correlation history.

### 5.11 Admin operations and observability

- Role-protected admin dashboard.
- Operations summaries, jobs, metrics, incidents, diagnostics and audit logs.
- Production QA, tracking health and search health surfaces.
- Safe retries, dead-letter handling and reconciliation workflows.
- No raw token or unnecessary PII in admin responses.

### 5.12 Privacy, security and deletion

- Explicit consent states: unknown, granted, denied and withdrawn.
- Fail-closed policy for non-essential tracking.
- Normalization and hashing of provider-required customer fields.
- Retention and deletion jobs.
- Customer-facing deletion request and status flows.
- Meta user-data deletion callback support.
- Secret redaction, admin RBAC, webhook signatures and secure media handling.

### 5.13 Release governance

- Prisma client freshness gate.
- Forward migration inventory and recovery notes.
- TypeScript, ESLint, tests and production build evidence.
- Runtime evidence ledger with expiry and redaction.
- Critical E2E and rollback rehearsal.
- No phase or production release is `COMPLETE` without attached evidence.

## 6. Unified Meta Platform target

The long-term Meta architecture must expose one application-facing `MetaPlatform` while hiding Business SDK and Graph HTTP details behind provider adapters.

Required platform capabilities:

- canonical internal Meta models;
- explicit asset and environment context;
- role-isolated credentials and rotation metadata;
- SDK adapter, Graph HTTP adapter and webhook-security adapter;
- capability registry with permissions, transport, retry and replay policy;
- immutable operation ledger and transactional outbox;
- domain/asset-scoped circuit breakers;
- rate limiting, queue priorities, deadlines and backpressure;
- before/after provider state for critical mutations;
- workflows, reconciliation and controlled replay;
- feature flags, kill switches, admin control plane and release evidence.

## 7. Functional requirements

Each functional requirement uses the following priority:

- **P0:** revenue, security, data integrity or release blocking;
- **P1:** required for reliable daily operations;
- **P2:** growth, optimization or operator-efficiency improvement.

| Requirement | Priority |
|---|---:|
| Customers can browse and search products on mobile and desktop | P0 |
| Product price, sale, variant and availability are server-authoritative | P0 |
| Order creation is idempotent | P0 |
| Payment callbacks cannot create duplicate paid orders | P0 |
| Inventory reservations remain consistent with order state | P0 |
| Courier state changes are traceable | P0 |
| Admin routes require explicit authorization | P0 |
| Webhooks verify signatures before parsing business payloads | P0 |
| Tracking respects consent and excludes test/internal traffic | P0 |
| Purchase browser/server events share canonical event ID | P0 |
| Redis/provider outage cannot lose committed Meta operations | P0 |
| Critical Meta writes require approval and provider-state verification | P0 |
| Search degrades safely if Elasticsearch is unavailable | P1 |
| Marketing reads can use clearly marked stale snapshots | P1 |
| Social CRM links conversations to customer/lead/order records explicitly | P1 |
| Admin can inspect queues, incidents and reconciliation state | P1 |
| AI can draft suggestions but cannot autonomously send or mutate critical state | P0 |

## 8. Non-functional requirements

### Performance

- Mobile-first pages must avoid unnecessary client JavaScript.
- API routes must use bounded queries and pagination.
- Long-running provider operations must be asynchronous.
- Critical webhook acknowledgement should normally complete within two seconds.
- Critical outbox operations should be dispatched within the defined SLO.

### Availability and durability

- PostgreSQL is the durable source of truth.
- Redis/BullMQ is reconstructable from database outbox/state.
- Workers must be restart-safe and idempotent.
- External outages must not block checkout commits.

### Security

- Secrets remain server-only.
- Provider tokens are selected by explicit role; no cross-token fallback.
- Raw provider errors are normalized and redacted.
- User-controlled URLs are validated against SSRF and unsafe schemes.
- Admin actions are least-privilege and audited.

### Privacy

- Store only data required for a defined business purpose.
- Raw PII must not appear in operational logs or queue payloads.
- Retention and deletion policies are versioned and auditable.

### Accessibility and usability

- Keyboard access, visible focus, semantic labels and readable type are required.
- Minimum interactive control height is 44px where practical.
- Motion must respect `prefers-reduced-motion`.

### Maintainability

- Provider SDKs may only be imported inside their transport layer.
- Domain services return canonical models, not raw provider objects.
- New functionality requires tests and documentation updates.
- `memory.md` must be updated after every code/config/schema change.

## 9. Success measures

- Checkout and payment duplicate rate remains effectively zero.
- Inventory/order reconciliation exceptions are visible and recoverable.
- Search and product pages meet agreed latency and availability targets.
- Critical tracking events have browser/server pairing and observable delivery status.
- Meta queue backlog, circuit state and provider failures are visible to operators.
- No release is approved with stale Prisma client, failed build or missing runtime evidence.
- AI-created changes always include a memory update and verification result.

## 10. Out of scope unless separately approved

- Marketplace/multi-vendor settlement.
- Native mobile application.
- Cryptocurrency payment.
- Fully autonomous ad-budget mutation.
- Arbitrary AI access to production database or secrets.
- Replacing PostgreSQL as system of record.
- Full event sourcing for every e-commerce domain; only immutable provider-operation ledger is targeted.

## 11. Acceptance and release policy

A feature is not complete merely because code exists. Completion requires:

1. implementation and review;
2. unit/contract/integration tests appropriate to risk;
3. typecheck and lint;
4. migration and recovery evidence when schema changes;
5. production build;
6. runtime provider evidence when required;
7. updated `phases.md` and `memory.md`;
8. no unresolved P0 blocker owned by the feature.
