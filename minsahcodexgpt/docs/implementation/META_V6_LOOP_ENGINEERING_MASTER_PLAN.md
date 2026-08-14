# Minsah Beauty — Meta v6 Project Update & Loop Engineering Master Plan

**Plan date:** 17 July 2026  
**Project snapshot:** `minsahbeauty.zip`  
**Source of truth:** `docs/spec/MinsahBeauty_Meta_AZ_Final_Spec_v6_FULL.md`  
**Plan status:** Engineering loops completed through Phase 7; release-only generation/runtime evidence remains deferred where noted.

## 1. Executive decision

বর্তমান project-এ Meta Business SDK, Catalog sync, Pixel/CAPI, Lead Ads, Ads Insights, admin UI, BullMQ workers এবং অনেক QA script আছে। তবে v6 acceptance criteria অনুযায়ী file-existence audit pass করা আর production-complete হওয়া একই বিষয় নয়। এই plan তাই existing implementation ফেলে নতুন করে শুরু করবে না; বরং dependency-ordered engineering loop-এ existing foundation harden, migrate, test এবং evidence-lock করবে।

### Baseline verdict

| Phase | Priority | Baseline | Main reason it is not complete |
|---:|---|---|---|
| 1 — Canonical Product Identity | P0.1 | **PARTIAL** | lib/tracking/events.ts still emits content_ids from raw productId |
| 2 — Catalog Domain Model, Field Mapping & Lifecycle | P0.2 | **PARTIAL** | /items_batch builder still serializes legacy/read-model fields: inventory, url, image_url, retailer_product_group_id |
| 3 — Pixel & Browser Tracking Contract | P0.3 | **PARTIAL** | Raw productId remains in wishlist and search click Meta content_ids |
| 4 — Conversions API Transactional Outbox & Deduplication | P0.4 | **PARTIAL** | Order transaction and Redis enqueue are not atomic |
| 5 — Durable Queue, Scheduling & Rate Control | P1.1 | **PARTIAL** | Meta retry window is currently exponential 1s–16s |
| 6 — Consent, Privacy, Retention & Data Governance | P1.2 | **PARTIAL** | Order.nonEssentialTrackingAllowed defaults to true |
| 7 — Meta Connection, API Version, Token & Permission Health | P1.3 | **PARTIAL** | Readiness is primarily configuration presence, not full asset API verification |
| 8 — Lead Ads Webhook, Retrieval & CRM | P1.4 | **PARTIAL** | Lead processing status is raw String rather than v6 enum state machine |
| 9 — Admin Meta Operations Center | P1.5 | **PARTIAL** | Current page is not yet the full catalog/events/leads/connections/jobs/diagnostics/attribution control plane |
| 10 — Observability, Diagnostics & Alerting | P2.1 | **PARTIAL** | Catalog Diagnostics ingestion/per-item issue dashboard is absent |
| 11 — First-Party Attribution & Growth Analytics | P2.2 | **PARTIAL** | Lead-to-order attribution and Meta-reported versus first-party labeling need one v6 contract |
| 12 — Product Sets, Categories & Merchandising Segmentation | P2.3 | **NOT_STARTED** | No deterministic ProductSet rule model |
| 13 — Ads Insights & Approval-Based Automation | P2.4 | **PARTIAL** | No approval request/state model for ad mutations |
| 14 — Instagram Messaging & Social CRM Expansion | P2.5 | **FOUNDATION_ONLY** | No verified Instagram Messaging webhook/Graph ingestion path was found |
| 15 — Testing, CI, Migration & Release Governance | P2.6 | **PARTIAL** | No v6 phase manifest/gate existed before this update |

No phase should be changed to `COMPLETE` until its acceptance criteria, automated gates, migration proof and required runtime evidence are attached.

### Current engineering-loop status — 18 July 2026

| Phase | Current state | Evidence / remaining gate |
|---:|---|---|
| 1 | **COMPLETE** | Canonical identity parity and regressions green |
| 2 | **READY_FOR_GENERATION** | Catalog domain/adapters green; Prisma generation and migration proof deferred |
| 3 | **READY_FOR_RUNTIME_QA** | Browser contract green; Events Manager runtime proof deferred |
| 4 | **READY_FOR_GENERATION** | Transactional CAPI outbox green; Prisma/Redis/Meta runtime proof deferred |
| 5 | **READY_FOR_GENERATION** | Durable provider-isolated queues green; live Redis proof deferred |
| 6 | **READY_FOR_GENERATION** | Consent/governance code green; generation/runtime/legal proof deferred |
| 7 | **READY_FOR_RUNTIME_QA** | Connection, token, permission and version health green; live Meta proof deferred |
| 8 | **READY_FOR_RUNTIME_QA** | Lead webhook/retrieval/CRM green; live lead runtime proof deferred |
| 9 | **PARTIAL** | Admin Operations Center engineering slice green; Prisma/database runtime proof deferred |
| 10 | **PARTIAL** | Diagnostics/incident engineering slice green; production paging/runtime proof deferred |
| 11 | **READY_FOR_GENERATION** | First-party attribution analytics green; generation/reconciliation proof deferred |
| 12 | **READY_FOR_GENERATION** | Deterministic Product Sets green; live provider parity proof deferred |
| 13 | **READY_FOR_GENERATION** | Read-only Insights and approval-only writes green; live account proof deferred |
| 14 | **READY_FOR_GENERATION** | Signed Instagram CRM, policy and audit controls green; App Review/live runtime proof deferred |
| 15 | **NEXT ENGINEERING PHASE** | Testing, CI, migration and release governance consolidation |

Current strict blocker audit: **14/14 passed**. Release completion still depends on the phase-specific generation, migration and live runtime evidence recorded in the dashboard.

## 2. Loop engineering operating model

প্রতিটি phase একই closed loop অনুসরণ করবে:

1. **Select:** `npm run loop:meta-v6 -- --next` দিয়ে dependency-ready phase নির্বাচন।
2. **Inspect:** source spec, current code, schema, migrations, APIs এবং existing tests read করে gap list freeze।
3. **Design:** adapter contract, schema migration, security boundary, rollback এবং test matrix লিখে evidence file create।
4. **Implement:** ছোট atomic commits; unrelated refactor নয়; secrets/PII log নয়।
5. **Verify:** phase gates → typecheck → lint → tests → build; applicable হলে disposable DB migration এবং live Meta sandbox checks।
6. **Repair:** failure থেকে root cause fix; test weaken বা blocker bypass নয়।
7. **Evidence:** command output, fixture/snapshot, migration result, runtime screenshots/IDs (secret-free) evidence file-এ attach।
8. **Close:** manifest state update only after all acceptance criteria pass; তারপর dependent phase শুরু।

### Branch, commit and evidence convention

- Branch: `meta-v6/phase-XX-short-name`
- Commit prefix: `meta-v6-pXX:`
- Evidence: `docs/release/meta-v6/phase-XX-evidence.md`
- Migration: one forward-only migration per coherent schema boundary
- Rollback: application rollback plus forward corrective migration; destructive production rollback নয়

## 3. Wave order

| Wave | Phases | Goal |
|---|---|---|
| 0 | Baseline tooling | Spec, manifest, gap audit, loop runner, evidence convention |
| 1 | 1–4 | Identity, catalog contract, browser tracking, transactional CAPI reliability |
| 2 | 5–8 | Queue durability, privacy, connection health, Lead Ads CRM |
| 3 | 9–11 | Operations center, observability, attribution |
| 4 | 12–14 | Product sets, approved ads automation, Instagram CRM |
| 5 | 15 | CI, migration, runtime evidence and release governance |

## 4. Baseline blockers A1–A14

| ID | Current finding | Owning phase |
|---|---|---:|
| A1 | `/items_batch` still uses legacy/read-model fields | 2 |
| A2 | Backorder zero-stock maps to `in stock` | 2 |
| A3 | Future sale is omitted | 2 |
| A4 | Raw product DB ID remains in Meta `content_ids` call-sites | 1, 3 |
| A5 | Server/public catalog identity source parity is not enforced | 1 |
| A6 | Controlled Graph API version upgrade/expiry gate is absent | 7, 15 |
| A7 | ProductVariant lifecycle/sale/identifier schema is incomplete | 2 |
| A8 | Non-essential tracking default is `true` | 6 |
| A9 | Meta CAPI queue is not a DB transactional outbox | 4 |
| A10 | Retry window is too short and not provider-specific | 5 |
| A11 | Required website CAPI fields are not centrally mandatory for every path | 4 |
| A12 | Canonical catalog presentation fields are incomplete | 2 |
| A13 | Several Meta lifecycle statuses remain raw strings | 2, 4, 7, 8, 10, 13 |
| A14 | Catalog Diagnostics ingestion/dashboard is missing | 10 |

## 5. Phase-by-phase execution plan

# Phase 1 — Canonical Product Identity

**Priority:** P0.1  
**Depends on:** None  
**Baseline status:** `PARTIAL`

## Objective

Website, storefront state, Pixel, Conversions API এবং Meta Catalog-এর জন্য একটিমাত্র canonical item identity enforce করা।

Current project-এ resolver foundation আছে, কিন্তু raw `productId` call-site এবং dual environment source drift এখনো blocker।

## Business outcome

- Dynamic/Advantage+ Catalog Ads exact product বা variant match করবে।
- ViewContent → AddToCart → Purchase funnel একই SKU namespace বজায় রাখবে।
- Variant-specific retargeting, shade/size ads এবং product-level attribution নির্ভুল হবে।
- SKU rename accidental audience fragmentation তৈরি করবে না।

## Current implementation evidence

- lib/tracking/meta-content-id.ts contains shared SKU/database identity resolver
- lib/meta-business/catalog.ts uses resolveMetaCatalogIdentity

## Open gaps

- lib/tracking/events.ts still emits content_ids from raw productId
- app/api/search/clicks/route.ts still emits content_ids from raw productId
- Server META_CATALOG_ID_SOURCE is absent; browser/server drift cannot be enforced
- No boot-time fail-fast identity parity gate
- SKU rename tombstone proof is not covered by a dedicated Phase 1 gate

## Engineering loop sequence

1. Split browser-visible identity selection from server-only environment parity validation
2. Add META_CATALOG_ID_SOURCE and require exact match with NEXT_PUBLIC_META_CATALOG_ID_SOURCE in production
3. Migrate wishlist and search-click Meta payloads to buildMetaCatalogData/resolveMetaCatalogIdentity
4. Add repository-wide raw productId regression scanner
5. Add fixtures for simple product, selected variant, unselected variant group, and SKU rename

## Target directory and file contract from v6

```text
lib/meta/identity/
├─ config.ts
├─ types.ts
├─ normalize.ts
├─ resolve-product.ts
├─ resolve-variant.ts
├─ resolve-content-id.ts
├─ resolve-group-id.ts
├─ build-catalog-reference.ts
├─ validate-config.ts
└─ migration.ts
```

### Create or refactor

```text
lib/meta/identity/config.ts
lib/meta/identity/resolve-content-id.ts
lib/meta/identity/build-catalog-reference.ts
lib/meta/identity/validate-config.ts
```

### Existing call-sites to migrate

```text
lib/tracking/meta-content-id.ts
lib/tracking/events.ts
lib/tracking/ecommerce.ts
lib/tracking/shop-events.ts
lib/tracking/meta-capi-core-event.ts
lib/tracking/meta-capi-cod-purchase.ts
app/api/search/clicks/route.ts
cart/wishlist/checkout handlers
```

### Current confirmed mismatches

```text
lib/tracking/events.ts
→ content_ids: [productId]

app/api/search/clicks/route.ts
→ content_ids: [click.productId]
```

## Prisma and migration contract

Required invariants:

```prisma
model Product {
  id  String @id @default(cuid())
  sku String @unique
}

model ProductVariant {
  id        String @id @default(cuid())
  productId String
  sku       String @unique
}

model OrderItem {
  productId String?
  variantId String?
  sku       String   // order-time immutable snapshot
}
```

Optional identity history for controlled SKU migration:

```prisma
model ProductIdentityHistory {
  id          String   @id @default(cuid())
  sourceType  String
  sourceId    String
  oldSku      String
  newSku      String
  changedAt   DateTime @default(now())
  reconciledAt DateTime?

  @@index([sourceType, sourceId])
  @@index([oldSku])
  @@index([newSku])
}
```

## API contract

Canonical resolver input:

```ts
type MetaIdentityInput = {
  productId: string;
  productSku: string;
  variantId?: string | null;
  variantSku?: string | null;
};
```

Canonical output:

```ts
type MetaIdentity = {
  retailerId: string;
  contentId: string;
  itemGroupId?: string;
  contentType: "product" | "product_group";
  source: "product_sku" | "variant_sku";
};
```

No API route, React component বা worker নিজে ID string বানাবে না।

Production contract:

```text
Catalog retailer_id
= Pixel content_ids[n]
= CAPI content_ids[n]
= contents[n].id
= OrderItem.sku
```

## Resolver and validation contract

```text
No variant:
  retailerId = Product.sku
  contentId = Product.sku
  contentType = product

Selected variant:
  retailerId = ProductVariant.sku
  contentId = ProductVariant.sku
  itemGroupId = Product.sku
  contentType = product

Variant-capable product before selection:
  contentId = Product.sku
  contentType = product_group
```

Whitespace trim, empty SKU rejection এবং deterministic normalization থাকবে। SKU case policy একবার নির্ধারণ করে immutable করতে হবে; silent uppercase/lowercase transformation করা যাবে না যদি existing SKU case-sensitive হয়ে থাকে।

Required environment:

```env
META_CATALOG_ID_SOURCE=sku
NEXT_PUBLIC_META_CATALOG_ID_SOURCE=sku
```

Startup validator:

```ts
export function validateMetaIdentityConfig() {
  const server = process.env.META_CATALOG_ID_SOURCE;
  const client = process.env.NEXT_PUBLIC_META_CATALOG_ID_SOURCE;

  if (!server || !client) {
    throw new Error("Meta catalog identity source is missing");
  }
  if (server !== client) {
    throw new Error("Meta catalog identity source mismatch");
  }
  if (process.env.NODE_ENV === "production" && server !== "sku") {
    throw new Error("Production Meta identity must use SKU");
  }
}
```

Additional validation:

- blank SKU blocked
- product and variant SKU globally unique
- selected variant must belong to product
- mixed SKU/database ID payload blocked
- content IDs and contents IDs set-equal
- identity source change requires migration plan

## Security and privacy contract

- Identity configuration may be public, কিন্তু access token/app secret নয়।
- Error logs-এ raw customer data থাকবে না।
- Admin SKU edit permission restricted হবে।
- SKU rename must require confirmation, impact preview এবং audit log।
- Identity resolver silent fallback করবে না।

## Worker and scheduling contract

`META_SKU_RECONCILIATION` job:

```text
1. lock catalog
2. identify old retailer ID
3. submit DELETE old ID
4. submit UPDATE/CREATE new ID
5. update state registry
6. verify final batch result
7. release tracking namespace only after migration succeeds
```

Partial failure হলে old/new state admin-এ visible থাকবে।

## Admin UI contract

Meta Settings page:

- current server identity source
- current client identity source
- drift status
- production lock status
- duplicate/missing SKU count
- SKU migration preview
- unresolved old retailer IDs
- last identity audit timestamp

## Test plan

Unit:

- product identity
- variant identity
- product_group identity
- blank SKU
- variant/product mismatch
- env mismatch

Integration:

- catalog row vs Pixel payload
- catalog row vs CAPI payload
- SKU rename delete/create
- OrderItem snapshot after product deletion

Static audit:

```text
forbid raw content_ids: [productId]
forbid raw content_ids: [variantId]
forbid database_id in production config
```

### Required local gates

- `npm run qa:meta-v6-gap`
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Exit criteria

- 100% commerce events shared resolver ব্যবহার করে।
- Production boot identity drift হলে fail করে।
- Catalog, Pixel ও CAPI sample fixtures exact same ID দেয়।
- SKU rename test old item delete এবং new item create প্রমাণ করে।
- কোনো raw DB ID Meta catalog field-এ যায় না।

## Meta compatibility notes

Catalog-based ad delivery-এর জন্য event content ID এবং catalog item ID matching critical। Product variants একই group ID-এর অধীনে রাখা যায়; selected variant-এর exact item ID tracking-এ পাঠানো উচিত। `[M6]`

## Evidence to attach before closure

- Changed file list and rationale
- Migration SQL and disposable-environment apply result when applicable
- Automated command outputs
- Semantic payload fixtures/snapshots
- Security/privacy negative tests
- Runtime Meta sandbox/account evidence when required
- Rollback and operational handoff notes

---

# Phase 2 — Catalog Domain Model, Field Mapping & Lifecycle

**Priority:** P0.2  
**Depends on:** Phase 1  
**Baseline status:** `PARTIAL`

## Objective

Product/ProductVariant schema থেকে একটি canonical commerce domain item তৈরি করা এবং তারপর adapter-specific Meta payload serialize করা।

এই Phase legacy `ProductItem` read field, legacy batch field, feed field এবং `/items_batch` write field mix হওয়া বন্ধ করবে।

## Business outcome

- Price, stock, sale, variant, link, image এবং identifiers সঠিক হবে।
- Meta Catalog Diagnostics rejection কমবে।
- Future sale exact সময়ে চালু হবে এবং expired sale clean হবে।
- Deleted/inactive SKU stale ad হিসেবে থাকবে না।
- Facebook/Instagram variant swatch data উন্নত হবে।

## Current implementation evidence

- Catalog sync, lock, managed item registry, pending batch registry and CSV feed already exist
- Reserved stock, variant-only item emission and stale managed item reconciliation foundations exist

## Open gaps

- /items_batch builder still serializes legacy/read-model fields: inventory, url, image_url, retailer_product_group_id
- Price is currently minor-unit integer plus currency instead of formatted money string
- Backorder zero-stock resolves to in stock instead of available for order
- Future sale is omitted instead of sent with sale_price_effective_date
- ProductVariant lacks lifecycle, sale, preorder, identifiers and condition override fields
- No canonical item hash/final per-item status contract
- Catalog Diagnostics ingestion is absent

## Engineering loop sequence

1. Introduce canonical commerce item DTO independent of Meta adapters
2. Create dedicated items_batch serializer, CSV serializer and read-model adapter
3. Add Phase 2 Prisma enums/fields and forward-only migration with backfill rules
4. Implement availability state machine and future/active/expired sale window serializer
5. Implement variant lifecycle tombstones and canonical payload hashing
6. Add semantic parity snapshots between CSV and items_batch

## Target directory and file contract from v6

```text
lib/meta/catalog/
├─ domain/
│  ├─ types.ts
│  ├─ availability.ts
│  ├─ pricing.ts
│  ├─ sale-period.ts
│  ├─ identifiers.ts
│  ├─ attributes.ts
│  ├─ images.ts
│  └─ category.ts
├─ adapters/
│  ├─ items-batch.ts
│  ├─ csv-feed.ts
│  └─ product-item-read.ts
├─ mapper.ts
├─ validator.ts
├─ fingerprint.ts
├─ reconcile.ts
├─ diagnostics.ts
└─ sync.ts
```

### Replace/refactor

```text
lib/meta-business/catalog.ts
```

### Current field problems to remove

```text
inventory                  → quantity_to_sell_on_facebook
url                        → link for /items_batch
image_url                  → image_link for /items_batch
retailer_product_group_id  → item_group_id
minor integer + currency   → formatted money string for /items_batch/feed
```

### Keep adapter separation

`listCatalogProducts()` may read Graph `ProductItem` fields such as `url`, `image_url`, integer price/currency. Write adapters must not reuse that read shape. Meta’s migration documentation explicitly notes field-name differences between endpoints. `[M5]`

## Prisma and migration contract

Enums:

```prisma
enum ProductAvailabilityMode {
  STANDARD
  PREORDER
  DISCONTINUED
}

enum ProductCondition {
  NEW
  REFURBISHED
  USED
}
```

Product additions/changes:

```prisma
model Product {
  availabilityMode  ProductAvailabilityMode @default(STANDARD)
  preorderReleaseAt DateTime?
  condition         ProductCondition         @default(NEW)
  mpn               String?
  googleProductCategory String?
  facebookProductCategory String?
}
```

Variant target:

```prisma
model ProductVariant {
  id                String   @id @default(cuid())
  productId         String
  sku               String   @unique
  name              String

  price             Decimal? @db.Decimal(10, 2)
  salePrice         Decimal? @db.Decimal(10, 2)
  offerStartDate    DateTime?
  offerEndDate      DateTime?

  quantity          Int      @default(0)
  reservedQuantity  Int      @default(0)
  allowBackorder    Boolean?

  isActive          Boolean  @default(true)
  deletedAt         DateTime?

  availabilityMode  ProductAvailabilityMode?
  preorderReleaseAt DateTime?
  condition         ProductCondition?

  gtin              String?
  mpn               String?
  barcode           String?
  attributes        Json?
  image             String?

  product Product @relation(
    fields: [productId],
    references: [id],
    onDelete: Cascade
  )

  @@index([productId])
  @@index([isActive, deletedAt])
}
```

State registry upgrade:

```prisma
enum MetaCatalogItemStatus {
  NEVER_SYNCED
  SUBMITTED
  ACTIVE
  FAILED
  DELETE_SUBMITTED
  DELETED
}

model MetaCatalogItemState {
  id               String                @id @default(cuid())
  catalogId        String
  retailerId       String
  sourceType       String
  sourceId         String
  payloadHash      String?
  status           MetaCatalogItemStatus @default(NEVER_SYNCED)
  lastSubmittedAt  DateTime?
  lastSucceededAt  DateTime?
  lastError        Json?
  deletedAt        DateTime?
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt

  @@unique([catalogId, retailerId])
  @@index([sourceType, sourceId])
  @@index([status])
}
```

## API contract

Canonical domain object:

```ts
type CanonicalCatalogItem = {
  retailerId: string;
  itemGroupId?: string;
  title: string;
  description: string;
  availability:
    | "in stock"
    | "out of stock"
    | "available for order"
    | "preorder"
    | "discontinued";
  availabilityDate?: string;
  quantityToSellOnFacebook: number;
  condition: "new" | "refurbished" | "used";
  price: Money;
  sale?: {
    price: Money;
    effectiveDate: string;
  };
  link: string;
  imageLink: string;
  additionalImageLinks?: string[];
  brand: string;
  gtin?: string;
  mpn?: string;
  productType?: string;
  googleProductCategory?: string;
  color?: string;
  size?: string;
  pattern?: string;
  material?: string;
  visibility?: string;
  customLabels?: Record<string, string>;
};
```

`/items_batch` adapter:

```ts
{
  method: "UPDATE",
  retailer_id: item.retailerId,
  data: {
    title: item.title,
    description: item.description,
    availability: item.availability,
    quantity_to_sell_on_facebook: item.quantityToSellOnFacebook,
    condition: item.condition,
    price: "1250.00 BDT",
    sale_price: "1100.00 BDT",
    sale_price_effective_date: "START/END",
    link: item.link,
    image_link: item.imageLink,
    item_group_id: item.itemGroupId
  }
}
```

CSV adapter একই semantics রাখবে, কিন্তু CSV column escaping/serialization আলাদা হবে।

## Resolver and validation contract

Availability priority:

```text
1. deletedAt != null OR isActive=false
   → exclude from UPDATE
   → previously synced হলে DELETE

2. effective availabilityMode=DISCONTINUED
   → discontinued

3. effective availabilityMode=PREORDER
   → preorder
   → availability_date when present

4. trackInventory=false
   → in stock

5. availableQty=max(0, quantity-reservedQuantity)
   availableQty>0
   → in stock

6. availableQty<=0 AND effective allowBackorder=true
   → available for order

7. otherwise
   → out of stock
```

Quantity:

```text
quantity_to_sell_on_facebook
= max(0, quantity - reservedQuantity)
```

Price:

```text
variant.price ?? product.price
```

Sale:

```text
variant sale fields, when present
otherwise product sale fields
```

Identifiers:

```text
variant.gtin ?? product.gtin
variant.mpn  ?? product.mpn
```

Attributes:

```text
color    = attributes.color ?? attributes.shade
size     = attributes.size
pattern  = attributes.pattern
material = attributes.material
```

Blocking:

- retailer ID missing
- title missing
- invalid absolute `http/https` link
- image link missing/invalid
- base price negative
- sale price negative
- `sale_price >= price`
- sale price exists but start/end incomplete
- start >= end
- unsupported currency
- inactive/deleted item accidentally in UPDATE payload
- `quantity_to_sell_on_facebook` non-integer বা negative
- invalid availability enum
- variant group missing parent SKU
- duplicate retailer ID in same batch

Canonical money:

```text
Project convention:
amount.toFixed(2) + " " + uppercase ISO currency
```

Example:

```text
1250.00 BDT
```

Meta minimum is amount + space + 3-letter ISO currency, with period decimal separator and no comma/symbol; exactly two decimals is project normalization, not universal Meta mandate. `[M2][M4]`

Warnings:

- missing GTIN and MPN
- low-resolution image
- missing category
- short description
- duplicate MPN
- no additional images

## Security and privacy contract

- Only project-owned state registry items may be auto-deleted.
- Mass delete threshold and percentage threshold both required.
- Delete dry-run + admin approval when threshold exceeded.
- Feed download token must be unguessable and rotatable.
- Catalog access token server-only.
- Error payloads redact tokens and customer data.
- Remote image URLs must be validated; no internal/private-network SSRF fetch.
- User-supplied HTML stripped from title/description.

## Worker and scheduling contract

Jobs:

```text
META_CATALOG_INCREMENTAL_SYNC
META_CATALOG_INVENTORY_SYNC
META_CATALOG_FULL_AUDIT
META_CATALOG_RECONCILE
META_CATALOG_BATCH_STATUS
META_CATALOG_DIAGNOSTICS_IMPORT
META_CATALOG_SINGLE_ITEM_RETRY
```

Processing:

```text
canonical query
→ domain mapping
→ validation
→ payload hash
→ skip unchanged
→ adapter serialization
→ chunk
→ submit
→ save handle/state
→ poll final status
→ normalize item errors
```

Inventory-only sync must send availability and quantity together; price fields only when policy explicitly requires them।

## Admin UI contract

Catalog Health:

- valid/invalid item count
- unchanged/skipped count
- submitted count
- failed item count
- stale delete candidates
- future sales
- expired sales awaiting cleanup
- missing GTIN/MPN
- missing category/image
- diagnostics errors
- adapter payload preview

Actions:

- full sync
- inventory sync
- single item retry
- dry run
- approve mass delete
- export invalid items
- view final Meta error

## Test plan

Unit fixtures:

- simple product
- child variant
- trackInventory=false
- reserved stock
- backorder with zero stock
- preorder
- discontinued
- future sale
- active sale
- expired sale
- variant sale override
- invalid sale
- color vs shade priority
- missing GTIN with MPN fallback
- duplicate MPN warning

Adapter snapshots:

- `/items_batch` exact fields
- CSV exact columns
- ProductItem read mapper separate

Integration:

- UPDATE creates/updates item
- DELETE stale item
- partial batch failure
- final batch polling
- diagnostics import

### Required local gates

- `npm run qa:meta-catalog-semantic`
- `npm run qa:meta-v6-gap`
- `npm run typecheck`
- `npm test`

## Exit criteria

- Current legacy fields no longer appear in `/items_batch` request builder.
- Backorder zero-stock item is `available for order`, not `in stock`.
- Future sale includes effective range immediately.
- Expired sale sends base price only.
- Deleted variant creates reconciliation DELETE.
- CSV and Items Batch semantic parity test passes.
- Unknown/manual Meta items are preserved.
- Every submitted item has stable canonical hash and final status.

## Meta compatibility notes

Meta’s Items Batch endpoint supports CREATE/UPDATE/DELETE, recommends current field names such as `item_group_id`, and price values formatted with ISO currency. Meta’s migration guide documents `url→link` and `image_url→image_link` differences. `quantity_to_sell_on_facebook` represents quantity available for Facebook/Instagram commerce. `[M2][M3][M4][M5]`

## Evidence to attach before closure

- Changed file list and rationale
- Migration SQL and disposable-environment apply result when applicable
- Automated command outputs
- Semantic payload fixtures/snapshots
- Security/privacy negative tests
- Runtime Meta sandbox/account evidence when required
- Rollback and operational handoff notes

---

# Phase 3 — Pixel & Browser Tracking Contract

**Priority:** P0.3  
**Depends on:** Phase 1  
**Baseline status:** `PARTIAL`

## Objective

Storefront browser events-কে canonical identity, consent policy এবং Meta standard event schema অনুযায়ী unify করা।

## Business outcome

- Funnel signals consistent হবে।
- Dynamic retargeting product match উন্নত হবে।
- Duplicate/malformed browser events কমবে।
- Campaign optimization-এর জন্য ViewContent, AddToCart, Checkout এবং Purchase signals পরিষ্কার হবে।

## Current implementation evidence

- Meta Pixel, route tracking, consent manager and shared tracking manager exist
- Browser/server event_id pairing foundations exist for several events

## Open gaps

- Raw productId remains in wishlist and search click Meta content_ids
- No single canonical item-event builder is enforced for every commerce event
- Phase-specific browser payload privacy and dedup fixtures are incomplete

## Engineering loop sequence

1. Route all item events through one canonical builder
2. Enforce content_type rules for product versus product_group
3. Keep raw PII out of browser payloads and operational logs
4. Add event_id contract fixtures for ViewContent, AddToCart, InitiateCheckout and Purchase
5. Run Events Manager Test Events as a runtime release gate

## Target directory and file contract from v6

```text
lib/meta/browser/
├─ client.ts
├─ event-id.ts
├─ payload.ts
├─ commerce.ts
├─ consent.ts
├─ diagnostics.ts
└─ types.ts

components/tracking/
├─ MetaPixelProvider.tsx
└─ MetaEventBridge.tsx
```

Refactor existing:

```text
lib/tracking/events.ts
lib/tracking/ecommerce.ts
lib/tracking/shop-events.ts
lib/tracking/manager.ts
lib/tracking/pixels/FacebookPixel.tsx
contexts/TrackingContext.tsx
```

Raw `productId` contracts replace করে `MetaCatalogReference` input ব্যবহার করতে হবে।

## Prisma and migration contract

Browser events সাধারণত direct DB row require করে না। Debug/QA capture প্রয়োজন হলে privacy-safe sample:

```prisma
model MetaBrowserEventAudit {
  id          String   @id @default(cuid())
  eventName   String
  eventId     String
  sessionId   String?
  safePayload Json?
  consent     String?
  createdAt   DateTime @default(now())

  @@index([eventName, createdAt])
  @@index([eventId])
}
```

Production retention short রাখতে হবে।

## API contract

Standard events:

```text
PageView
ViewContent
Search
AddToWishlist
AddToCart
InitiateCheckout
AddPaymentInfo
Purchase
Lead
CompleteRegistration
Contact
```

Commerce payload:

```ts
{
  content_ids: ["VARIANT-SKU"],
  content_type: "product",
  contents: [{
    id: "VARIANT-SKU",
    quantity: 1,
    item_price: 1250
  }],
  currency: "BDT",
  value: 1250,
  eventID: "AddToCart-..."
}
```

`contents[].id`, `content_ids[]` এবং catalog retailer ID একই হবে।

## Resolver and validation contract

- Variant selected: exact variant SKU
- Variant not selected: product group SKU only for ViewContent where group-level event is intended
- Cart/checkout/purchase: exact sellable line-item SKU
- Value: sum of item price × quantity, excluding shipping/discount according to one documented policy
- Event ID generated once at user action boundary and passed to server when paired CAPI event exists

- Empty `content_ids` blocked
- `contents` count and content IDs consistent
- quantity positive integer
- item price/value finite and non-negative
- currency uppercase ISO code
- `content_type` only `product` or `product_group`
- event ID required for browser/server paired event
- test/internal traffic excluded by policy

## Security and privacy contract

- Browser payload-এ access token, email, phone বা raw PII নয়।
- Consent policy before Pixel fire.
- Debug logs disabled in production; current `[MB_DEBUG]` console logging remove/gate করতে হবে।
- URL payload sanitization to avoid leaking query secrets.
- CSP এবং script nonce policy অনুসরণ করতে হবে।

## Worker and scheduling contract

Browser event direct client-side; worker নেই। তবে server audit/reconciliation job event coverage aggregate করতে পারে:

```text
META_EVENT_COVERAGE_AGGREGATE
META_PIXEL_CAPI_PAIR_AUDIT
```

## Admin UI contract

Event QA page:

- recent safe browser events
- event ID
- content IDs
- catalog match
- consent state
- paired CAPI status
- test/internal exclusion reason
- duplicate warning

## Test plan

- product/variant ViewContent
- Wishlist raw productId regression
- Search click SKU regression
- AddToCart pair
- Checkout multi-line contents
- Browser Purchase claim
- consent denied
- test order excluded
- debug logging absent in production

### Required local gates

- `npm run qa:meta-v6-gap`
- `npm run qa:master-tracking`
- `npm run typecheck`
- `npm test`

## Exit criteria

- `grep`-based audit raw `content_ids: [productId]` খুঁজে পাবে না।
- All item events canonical builder ব্যবহার করবে।
- Paired events same event ID produce করবে।
- Browser payload contains no raw PII।
- Events Manager Test Events-এ core funnel visible হবে।

## Meta compatibility notes

Catalog-backed event `content_ids` catalog item identifiers-এর সঙ্গে match করা প্রয়োজন। Browser/server deduplication-এর জন্য same event name এবং event ID ব্যবহার করতে হয়। `[M10]`

## Evidence to attach before closure

- Changed file list and rationale
- Migration SQL and disposable-environment apply result when applicable
- Automated command outputs
- Semantic payload fixtures/snapshots
- Security/privacy negative tests
- Runtime Meta sandbox/account evidence when required
- Rollback and operational handoff notes

---

# Phase 4 — Conversions API Transactional Outbox & Deduplication

**Priority:** P0.4  
**Depends on:** Phase 1, Phase 3  
**Baseline status:** `PARTIAL`  
**Current engineering status:** `READY_FOR_GENERATION`

## Objective

Server-side Meta events transactional outbox-এর মাধ্যমে reliably persist, dispatch, retry এবং deduplicate করা।

## Business outcome

- Meta/Redis outage checkout block করবে না।
- DB commit হলেও event হারাবে না।
- Duplicate Purchase কমবে।
- Event Match Quality inputs এবং diagnostics traceable হবে।

## Current implementation evidence

- PostgreSQL `MetaEventOutbox` and `MetaEventOutboxStatusEvent` models plus forward migration now provide durable lifecycle/history state.
- Online paid, Telegram COD and admin COD Purchase paths persist the outbox in the same Prisma transaction as the business-state change.
- Provider/event-name/event-ID uniqueness and conflict-safe insertion block duplicate Purchase rows.
- Dedicated dispatcher leases due rows with `FOR UPDATE SKIP LOCKED`; expired leases and Redis enqueue failures return to DB-scheduled retry.
- Dedicated sender worker validates the canonical website contract and applies a bounded immediate/+1m/+5m/+15m/+1h policy with permanent exhaustion.
- Public core CAPI persists before queue dispatch; production test-event code is blocked.
- SUPER_ADMIN Event Monitor exposes safe state/history and identity-preserving manual replay.
- Phase 4 tests **11/11**, static audit **27/27**, Phase 1–3 regressions, TypeScript and repository tests pass.

## Open gaps

- Generated Prisma client refresh is blocked in this isolated environment by `binaries.prisma.sh` DNS failure.
- Disposable PostgreSQL migration deployment and transaction rollback proof are not attached.
- Live Redis outage/recovery and Meta Test Events Purchase deduplication evidence are not attached.

## Engineering loop sequence

1. Add MetaEventOutbox and status history enums/models
2. Insert outbox row in the same DB transaction as order/payment state changes
3. Add dispatcher that leases rows and enqueues provider jobs idempotently
4. Add DB unique key for event_name + event_id/provider
5. Add age validation, source URL normalization and permanent/transient error classification

## Target directory and file contract from v6

```text
lib/meta/capi/
├─ types.ts
├─ event-id.ts
├─ builder.ts
├─ user-data.ts
├─ custom-data.ts
├─ validator.ts
├─ outbox-repository.ts
├─ dispatcher.ts
├─ sender.ts
├─ response.ts
└─ diagnostics.ts

workers/
├─ meta-outbox-dispatcher.worker.ts
└─ meta-capi-sender.worker.ts
```

Refactor/integrate:

```text
lib/queue/metaCapiQueue.ts
lib/workers/metaCapiWorker.ts
lib/tracking/meta-capi-core-event.ts
lib/tracking/meta-capi-cod-purchase.ts
lib/tracking/meta-business-sdk.ts
```

Current mixed queue also carries GA4/TikTok jobs; provider-specific queues/metrics split করতে হবে।

## Prisma and migration contract

```prisma
enum MetaEventStatus {
  PENDING
  DISPATCHED
  PROCESSING
  SENT
  RETRY_SCHEDULED
  FAILED_PERMANENT
  SUPPRESSED
}

model MetaEventOutbox {
  id             String          @id @default(cuid())
  eventName      String
  eventId        String
  sourceType     String
  sourceId       String?
  orderId        String?
  actionSource   String
  eventTime      DateTime
  payload        Json
  safePayload    Json?
  status         MetaEventStatus @default(PENDING)
  attempts       Int             @default(0)
  nextAttemptAt  DateTime?
  dispatchedAt   DateTime?
  sentAt         DateTime?
  response       Json?
  lastError      Json?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@unique([eventName, eventId])
  @@index([status, nextAttemptAt])
  @@index([orderId])
}
```

## API contract

Website server event:

```ts
{
  event_name: "Purchase",
  event_time: 1721160000,
  event_id: "Purchase-order_123",
  action_source: "website",
  event_source_url: "https://...",
  user_data: {
    em: ["sha256..."],
    ph: ["sha256..."],
    external_id: ["sha256..."],
    fbp: "...",
    fbc: "...",
    client_ip_address: "...",
    client_user_agent: "..."
  },
  custom_data: {
    currency: "BDT",
    value: 1250,
    content_ids: ["SKU"],
    content_type: "product",
    contents: [...]
  }
}
```

Test mode:

```text
META_TEST_EVENT_CODE
```

only non-production/staging control অনুযায়ী attach হবে।

## Resolver and validation contract

Transaction pattern:

```text
BEGIN
  create/update order/payment
  create MetaEventOutbox row
COMMIT

dispatcher polls PENDING
→ enqueue provider job
→ mark DISPATCHED

sender
→ validate event age
→ send
→ SENT or RETRY_SCHEDULED/FAILED_PERMANENT
```

Event IDs:

```text
Purchase-order_{orderId}
AddToCart-{sessionId}-{lineIdentity}-{actionNonce}
InitiateCheckout-{checkoutId}
```

Browser/server paired event একই ID পাবে।

- `action_source` required; website event হলে `website`
- `event_source_url` required for website events
- event time future-skew bounded
- event time send-time থেকে ৭ দিনের বেশি পুরোনো হলে block/permanent failure
- event name and event ID required
- currency/value consistency
- content IDs canonical
- email/phone normalized before hashing
- already-hashed data double-hash নয়
- duplicate `(eventName,eventId)` DB unique constraint

## Security and privacy contract

- Access token only server secret store.
- Optional `appsecret_proof` supported for secure Graph requests. `[M17]`
- PII only normalized/hashed where Meta requires; raw payload persistent storage minimize করতে হবে।
- `client_ip_address` trusted proxy configuration থেকে resolve করতে হবে।
- Logs only `safePayload`.
- Outbox payload encryption-at-rest considered if raw identifiers temporarily stored।

## Worker and scheduling contract

Recommended retry:

```text
attempt 1: immediate
attempt 2: +1 minute
attempt 3: +5 minutes
attempt 4: +15 minutes
attempt 5: +1 hour
```

Retryable:

- timeout/network
- HTTP 429
- HTTP 5xx
- selected transient Meta codes

Permanent:

- invalid token after alert/escalation
- invalid schema
- event too old
- unsupported field
- consent suppression

DLQ/manual replay must preserve original event ID।

## Admin UI contract

Event Monitor:

- event name/ID
- order/source
- status
- age
- attempts
- next retry
- match-signal flags
- safe payload
- response/error
- browser pair
- manual retry
- suppress reason

## Test plan

- order transaction rollback → no event
- order commit + Redis down → outbox remains
- dispatcher recovery
- duplicate Purchase constraint
- same browser/server ID
- event older than 7 days
- missing action_source
- missing event_source_url
- 429/5xx retry
- 400 permanent failure
- invalid token alert
- test event code

### Required local gates

- `npm run qa:meta-v6-phase4`
- `npm run qa:phase12`
- `node scripts/meta-v6-gap-audit.mjs`
- `npm run typecheck:ts`
- `npm test`

## Loop implementation result — 17 July 2026

Code/static acceptance is green and the manifest is `READY_FOR_GENERATION`. Detailed evidence is in `docs/release/meta-v6/phase-04-evidence.md`. Strict `COMPLETE` remains blocked until Prisma generation/migration application and Redis/Meta runtime recovery evidence are attached. The loop runner now selects Phase 5 without misrepresenting Phase 4 as release-complete.

## Exit criteria

- Order commit and outbox insert atomic।
- Redis outage cannot lose committed event।
- Duplicate Purchase DB-level blocked।
- Core website events contain action source and source URL।
- Event age validation passes official requirement।
- Retry and permanent failures visible।

## Meta compatibility notes

Meta CAPI uses `event_name` + `event_id` for browser/server deduplication. Website events require action source and event source URL, and events older than seven days may be rejected. Customer information fields have specific hashing requirements. `[M8][M9][M10][M11]`

## Evidence to attach before closure

- Changed file list and rationale
- Migration SQL and disposable-environment apply result when applicable
- Automated command outputs
- Semantic payload fixtures/snapshots
- Security/privacy negative tests
- Runtime Meta sandbox/account evidence when required
- Rollback and operational handoff notes

---

# Phase 5 — Durable Queue, Scheduling & Rate Control

**Priority:** P1.1  
**Depends on:** Phase 2, Phase 4  
**Baseline status:** `PARTIAL`  
**Current engineering state:** `READY_FOR_GENERATION`

## Objective

Meta catalog, CAPI, leads, diagnostics এবং token checks-এর জন্য durable, isolated এবং observable job infrastructure তৈরি করা।

## Business outcome

Provider outage, rate limit বা server restart-এর সময় কাজ হারাবে না; এক feature-এর backlog অন্য feature block করবে না।

## Current implementation evidence

- BullMQ queues/workers exist for products, Meta CAPI and courier
- Catalog sync lock and batch polling foundations exist

## Open gaps

- Meta retry window is currently exponential 1s–16s
- Provider-specific queues, rate control, DLQ replay and stalled job policy are incomplete
- Scheduled job dedupe and operational replay audit are not unified

## Engineering loop sequence

1. Separate catalog, CAPI, leads, diagnostics and connection-health queues
2. Implement retry schedule immediate, 1m, 5m, 15m, 1h with provider error classification
3. Add deterministic job IDs and scheduler dedupe
4. Add DLQ/replay records and admin-safe replay action
5. Add rate-limit token bucket/cooldown and stalled-job recovery tests

## Target directory and file contract from v6

```text
lib/jobs/
├─ connection.ts
├─ queues.ts
├─ job-types.ts
├─ idempotency.ts
├─ retry-policy.ts
├─ rate-limit.ts
├─ scheduler.ts
├─ dead-letter.ts
└─ health.ts

workers/
├─ meta-catalog.worker.ts
├─ meta-batch-status.worker.ts
├─ meta-capi.worker.ts
├─ meta-lead.worker.ts
├─ meta-diagnostics.worker.ts
└─ meta-token-health.worker.ts
```

Current:

```text
lib/queue/metaCapiQueue.ts
lib/workers/metaCapiWorker.ts
```

Target split:

```text
meta-capi-events
meta-catalog-sync
meta-catalog-status
meta-leads
meta-connection-health
```

GA4 এবং TikTok jobs Meta queue থেকে আলাদা করতে হবে।

## Prisma and migration contract

Optional operational mirror:

```prisma
enum MetaJobStatus {
  QUEUED
  RUNNING
  RETRYING
  SUCCEEDED
  FAILED
  CANCELLED
  DEAD_LETTER
}

model MetaJobAudit {
  id            String        @id @default(cuid())
  queueName     String
  jobName       String
  externalJobId String?
  idempotencyKey String?
  status        MetaJobStatus
  attempts      Int           @default(0)
  progress      Int?
  sourceId      String?
  lastError     Json?
  startedAt     DateTime?
  completedAt   DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([status, createdAt])
  @@index([idempotencyKey])
}
```

## API contract

Admin/cron endpoint response:

```ts
{
  accepted: true,
  jobId: string,
  idempotencyKey: string,
  status: "QUEUED"
}
```

API request long-running Meta call execute করবে না।

Job payload versioned হবে:

```ts
{
  schemaVersion: 1,
  catalogId: "...",
  mode: "incremental"
}
```

## Resolver and validation contract

Idempotency examples:

```text
catalog-inventory:{catalogId}:{15-minute-window}
catalog-reconcile:{catalogId}:{date}
token-health:{connectionId}:{date}
lead-fetch:{leadgenId}
```

Per-catalog lock, per-event unique key এবং per-lead unique ID একসাথে ব্যবহার হবে।

- known job type only
- payload schema version required
- max payload size
- catalog/asset ownership verified
- concurrency limit
- timeout per job
- retry policy per provider/error class
- stale running-job recovery

## Security and privacy contract

- Cron routes secret-protected।
- Admin enqueue RBAC-protected।
- Job payload-এ access token নয়।
- Redis transport security/auth must match the deployment: protected private-network `redis://` or TLS-enabled `rediss://`।
- Queue dashboard public নয়।
- Malicious serialized data execute করা যাবে না।

## Worker and scheduling contract

Schedule:

```text
Every 5 minutes   → pending batch status
Every 15 minutes  → inventory sync
Every hour        → incremental catalog sync
Every night       → reconciliation
Every day         → token/permission health
Every week        → full catalog + identity audit
```

Rate limit response headers/error data capture করে adaptive delay করতে হবে। Marketing API rate limits account/app context অনুযায়ী vary করে। `[M20]`

## Admin UI contract

- queue backlog
- oldest job age
- active workers/heartbeat
- progress
- attempts
- cancel
- retry
- dead-letter replay
- rate-limit state
- scheduler last/next run

## Test plan

- Redis restart
- worker crash mid-job
- duplicate enqueue
- lock expiry
- stalled job recovery
- DLQ
- rate limit delay
- mixed-provider isolation
- malformed payload

### Required local gates

- `npm run qa:meta-v6-gap`
- `npm run qa:tracking-runtime-health`
- `npm run typecheck`
- `npm test`

## Exit criteria

- Restart after enqueue does not lose work।
- Provider queues isolated।
- Duplicate scheduled jobs suppressed।
- Stalled jobs recovered।
- Rate limit does not create request storm।
- DLQ replay auditable।

## Meta compatibility notes

Meta catalog batch processing এবং Marketing API requests asynchronous/rate-limited হতে পারে; durable jobs এবং backoff required operational design। `[M4][M20]`

## Evidence to attach before closure

- Changed file list and rationale
- Migration SQL and disposable-environment apply result when applicable
- Automated command outputs
- Semantic payload fixtures/snapshots
- Security/privacy negative tests
- Runtime Meta sandbox/account evidence when required
- Rollback and operational handoff notes

---

# Phase 6 — Consent, Privacy, Retention & Data Governance

**Priority:** P1.2  
**Depends on:** Phase 3, Phase 4  
**Baseline status:** `PARTIAL`

## Objective

Meta tracking এবং lead data processing-কে explicit policy, consent state, retention এবং deletion workflow-এর অধীনে আনা।

## Business outcome

Privacy risk কমবে, PII leakage বন্ধ হবে এবং tracking behavior auditable হবে।

**Current engineering state:** `READY_FOR_GENERATION`

## Current implementation evidence

- `lib/privacy` now provides a versioned, deterministic, fail-closed consent and tracking policy contract.
- `Order.nonEssentialTrackingAllowed` defaults to `false`; the forward migration resets unversioned historical grants to `UNKNOWN` rather than assuming fresh consent.
- Browser envelopes, public CAPI, Purchase outbox creation and outbox delivery persist and enforce policy version, decision reason, consent state/version, advanced-matching permission and retention deadline.
- Email/phone normalization, SHA-256 hashing, double-hash prevention and recursive operational redaction are shared and covered by negative tests.
- Durable consent records, deletion requests, suppression state, retention cleanup and PII audit jobs are implemented with resumable workers and schedules.
- SUPER_ADMIN governance API exposes policy, consent distribution, deletion state, suppression and audit health without raw PII.
- Public privacy disclosure and production operations documentation now cover fail-closed consent, withdrawal, retention and backup limitations.

## Open gaps

- Generated Prisma client refresh is blocked in this environment by `binaries.prisma.sh` DNS resolution failure.
- Disposable PostgreSQL migration apply and historical backfill verification are not yet attached.
- Live Redis deletion recovery, retention cleanup, suppression sync and PII scan evidence are not yet attached.
- Business/legal approval of the retention schedule remains an external governance gate.

## Engineering loop sequence

1. Create explicit consent state enum/policy evaluator
2. Migrate default to false with documented historical-record backfill
3. Persist policy decision code/version on restricted processing
4. Enforce log redaction and hashed-only queue payloads
5. Add withdrawal, retention and deletion worker tests

## Target directory and file contract from v6

```text
lib/privacy/
├─ consent-types.ts
├─ consent-resolver.ts
├─ tracking-policy.ts
├─ pii-normalize.ts
├─ pii-hash.ts
├─ pii-redaction.ts
├─ retention.ts
├─ deletion.ts
└─ audit.ts
```

Refactor:

```text
lib/tracking/tracking-consent.ts
lib/tracking/pixels/TrackingConsentManager.tsx
lib/tracking/client-traffic-filter.ts
lib/tracking/failure-retention.ts
```

Legal/business policy config code থেকে আলাদা versioned document/config হবে।

## Prisma and migration contract

```prisma
enum TrackingConsentState {
  UNKNOWN
  GRANTED
  DENIED
  WITHDRAWN
}

model TrackingConsentRecord {
  id          String               @id @default(cuid())
  userId      String?
  visitorId   String?
  state       TrackingConsentState
  version     String
  source      String
  recordedAt  DateTime             @default(now())
  withdrawnAt DateTime?

  @@index([userId])
  @@index([visitorId])
}

model DataDeletionRequest {
  id          String   @id @default(cuid())
  userId      String?
  externalRef String?
  status      String
  requestedAt DateTime @default(now())
  completedAt DateTime?
  error       Json?
}
```

Order target:

```prisma
nonEssentialTrackingAllowed Boolean @default(false)
```

Migration:

```text
existing unknown + true
→ do not assume fresh consent
→ derive from historical consent evidence or mark UNKNOWN
```

## API contract

Policy result:

```ts
type TrackingDecision = {
  allowPixel: boolean;
  allowCapiEvent: boolean;
  allowAdvancedMatching: boolean;
  allowedUserDataFields: string[];
  reason: string;
  policyVersion: string;
};
```

Every event builder receives this decision; direct boolean checks scattered across code নিষিদ্ধ।

## Resolver and validation contract

Inputs:

- explicit consent
- event category
- user/visitor region when legitimately available
- business legal basis configuration
- test/internal traffic
- user deletion/suppression status

Output is deterministic and versioned।

- UNKNOWN does not equal GRANTED
- consent version required
- withdrawal takes precedence
- email trim/lowercase before hashing
- phone E.164-like normalization policy
- hash length/format validation
- no double hashing
- retention date mandatory for failure logs/receipts

## Security and privacy contract

- Raw PII never in general logs।
- Hashing occurs server-side।
- Encryption for retained raw lead fields।
- Least-access roles for lead/customer data।
- Backup deletion limitations documented।
- Data export/deletion actions audited।
- Legal review required; this technical spec is not legal advice।

## Worker and scheduling contract

```text
PRIVACY_RETENTION_CLEANUP
PRIVACY_DELETION_PROCESSOR
TRACKING_SUPPRESSION_SYNC
PII_AUDIT_SCAN
```

Cleanup idempotent এবং resumable হতে হবে।

## Admin UI contract

- current policy version
- Pixel/CAPI/advanced matching switches
- retention days
- consent distribution
- deletion requests
- suppressed event count
- PII log scan status
- policy change audit

## Test plan

- unknown consent
- denied consent
- granted consent
- withdrawal
- advanced matching suppression
- raw PII log scanner
- deletion request
- retention expiry
- historical order migration

### Required local gates

- `npm run qa:tracking-test-exclusion`
- `npm run qa:tracking-retention`
- `npm run qa:meta-v6-gap`
- `npm test`

## Exit criteria

- Default non-essential tracking false। **PASS (code/migration)**
- Every Meta event has policy decision metadata। **PASS (browser, public CAPI, Purchase and outbox contract)**
- Raw PII absent from operational logs। **PASS (redaction/hash gates)**
- Withdrawal prevents future restricted processing। **PASS (resolver, sender and suppression flow)**
- Retention/deletion jobs proven। **PASS locally; live Redis/PostgreSQL recovery evidence deferred**

## Phase 6 implementation result — 17 July 2026

The Phase 6 code/static acceptance is green and the manifest is `READY_FOR_GENERATION`. Dedicated tests pass `12/12`, the privacy audit passes `45/45`, internal/test exclusion passes `57/57`, retention governance passes `25/25`, repository tests pass `16/16`, direct TypeScript and targeted ESLint pass, and the global v6 blocker audit improved from `10/14` to `11/14`. Strict `COMPLETE` remains blocked until Prisma generation/migration application, live Redis privacy-job recovery evidence and business/legal retention approval are attached. Detailed evidence is in `docs/release/meta-v6/phase-06-evidence.md`. The loop runner now selects Phase 7.

## Meta compatibility notes

Meta documents required/recommended customer-information parameters and hashing rules, but lawful collection/use and consent obligations depend on the business and jurisdiction. `[M11]`

## Evidence to attach before closure

- Changed file list and rationale
- Migration SQL and disposable-environment apply result when applicable
- Automated command outputs
- Semantic payload fixtures/snapshots
- Security/privacy negative tests
- Runtime Meta sandbox/account evidence when required
- Rollback and operational handoff notes

---

# Phase 7 — Meta Connection, API Version, Token & Permission Health

**Priority:** P1.3  
**Depends on:** None  
**Baseline status:** `PARTIAL`  
**Engineering-loop status:** `READY_FOR_RUNTIME_QA`

## Objective

Meta App, Business, Catalog, Dataset/Pixel, Page, Ad Account এবং Instagram assets-এর connection health centrally manage করা।

## Business outcome

Expired token, wrong asset, permission loss এবং API-version drift campaign/sync outage হওয়ার আগে detect হবে।

## Implemented foundation — 17 July 2026

- `MetaConnectionStatus` এবং `MetaVersionRegressionStatus` Prisma enums যোগ হয়েছে।
- `MetaConnection`, immutable `MetaConnectionCheck` এবং `MetaApiVersionPolicy` persistence/migration যোগ হয়েছে।
- Canonical server-only Graph client bearer authorization, timeout, safe error classification/redaction এবং centralized `appsecret_proof` ব্যবহার করে।
- `debug_token` token validity, app association, token/data-access expiry এবং scope যাচাই করে; token value result-এ যায় না।
- `/me/permissions` required-scope diff এবং business/catalog/dataset/pixel/page/ad-account/Instagram API verification যোগ হয়েছে।
- Aggregate readiness invalid token, app mismatch, missing permission, inaccessible asset, expiry এবং version warning আলাদা status/warning হিসেবে প্রকাশ করে।
- Daily token/permission/asset এবং weekly API-version durable health schedules যোগ হয়েছে।
- SUPER_ADMIN connection API/admin card safe snapshot/history/recheck দেয়; token rotation value নেয় বা ফেরত দেয় না।
- `config/meta-api-version-policy.json` exact SDK baseline, minimum version, latest target, internal warning/block/review dates এবং regression state নিয়ন্ত্রণ করে।
- Official expiration `TBD` হলে policy `null` রাখে; internal deadline-কে official Meta expiry হিসেবে দেখায় না।

## Current controlled version decision

```text
configured Graph API:       v24.0
exact SDK baseline:         24.0.1
latest official target:     v25.0
v24 official expiration:   TBD/null at 2026-07-17 verification
internal v24 block date:   2026-10-01
v25 regression status:     PENDING
```

Project automatic version promotion করে না। v25 production promotion-এর আগে catalog, CAPI, Lead Ads, Ads Insights, SDK/adapter এবং rollback regression evidence প্রয়োজন। Official SDK repository newer release দেখালেও isolated package registry-তে exact installable baseline `24.0.1` ছিল; তাই unverified dependency declaration করা হয়নি।

## Target directory and file contract

```text
lib/meta/connection/
├─ config.ts
├─ client.ts
├─ appsecret-proof.ts
├─ token-debug.ts
├─ permissions.ts
├─ assets.ts
├─ version-policy.ts
├─ readiness.ts
├─ repository.ts
├─ types.ts
└─ errors.ts
```

Related surfaces:

```text
prisma/schema.prisma
prisma/migrations/20260717050000_meta_v6_phase7_connection_health/migration.sql
config/meta-api-version-policy.json
lib/meta-business/config.ts
lib/meta-business/sdk.ts
lib/jobs/job-types.ts
lib/jobs/queues.ts
lib/jobs/scheduler.ts
workers/meta-token-health.worker.ts
app/api/admin/meta/connection/route.ts
app/admin/meta-business/page.tsx
```

## Security and privacy contract

- Tokens and app secret server-only; no queue payload, API response, admin UI, client bundle or operational error leakage।
- App association fail-closed।
- Required permissions explicit and least-privilege reviewable।
- Applicable server Graph requests centralized `appsecret_proof` ব্যবহার করে।
- Errors redact bearer, `access_token`, `input_token` এবং proof values।
- Secret rotation external secret manager/environment operation; admin API intentionally secret-free।

## Worker and scheduling contract

```text
token-permission-asset-daily
api-version-weekly
```

Alerts/readiness warnings cover:

- invalid/app-mismatched token
- token or data access near expiry
- required permission removed
- configured asset inaccessible/mismatched
- below-minimum or internally blocked Graph version
- target version regression pending/failed

## Admin/API contract

```text
GET  /api/admin/meta/connection
POST /api/admin/meta/connection
     { "action": "recheck", "checks": ["TOKEN", "PERMISSIONS", "ASSETS", "VERSION"] }
```

No token value is returned or accepted.

## Automated result

```text
Phase 7 tests                 11/11 passed
Phase 7 static audit          50/50 passed
Graph version-policy audit    16/16 passed
Meta business platform        22/22 passed
Phase 1 regression             4/4 + 9/9 passed
Phase 2 regression             8/8 + 20/20 passed
Phase 3 regression             9/9 + 20/20 passed
Phase 4 regression            11/11 + 27/27 passed
Phase 5 regression            11/11 + 43/43 passed
Phase 6 regression            12/12 + 45/45 passed
Repository tests              16/16 passed
Changed-entry syntax compile   8/8 passed
Global v6 blockers            12/14 passed
```

Production `qa:tracking-env` correctly remains blocked in the isolated workspace because deployment secrets/service URLs are absent. Full dependency-backed typecheck/lint/build is not claimed; it remains a release-environment gate.

## Open release gaps

1. Prisma client generation and disposable PostgreSQL migration evidence।
2. Full clean dependency install, TypeScript, ESLint এবং production build।
3. Live token-debug, required-permission এবং every configured asset verification।
4. Live Redis scheduler/worker recovery এবং alert delivery।
5. Controlled v25 catalog/CAPI/lead/insights/SDK regression, approval, rollout এবং rollback evidence।
6. Production tracking environment gate with real secret-manager/service configuration।

## Required gates

- `npm run qa:meta-v6-phase7`
- `npm run qa:meta-graph-version-gate`
- `npm run qa:meta-business-platform`
- `NODE_ENV=production npm run qa:tracking-env`
- `npm run qa:meta-v6-gap`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Exit criteria

- [x] Presence-only readiness replaced by API-backed contract।
- [x] Token/app association and required permissions validated without secret exposure।
- [x] Every configured asset has API verification and safe failure status।
- [x] Persisted current health and immutable history exist।
- [x] Central secure-request/appsecret-proof path exists।
- [x] Version policy and release gate exist without fabricated official expiry।
- [x] Secret-free health schedules and SUPER_ADMIN recheck exist।
- [ ] Migration/client generation and full build evidence attached।
- [ ] Live Meta and Redis evidence attached।
- [ ] v25 controlled regression/promotion evidence attached।

## Phase 7 implementation result — 17 July 2026

The Phase 7 code/static acceptance is green and the manifest is `READY_FOR_RUNTIME_QA`. Dedicated tests pass `11/11`, the connection audit passes `50/50`, the version-policy audit passes `16/16`, Meta platform audit passes `22/22`, Phase 1–6 regressions and repository tests pass, and the global v6 blocker audit improved from `11/14` to `12/14`. A6 is resolved. Strict `COMPLETE` remains blocked until Prisma generation/migration, full dependency-backed build gates, live token/permission/asset checks, live Redis health-job evidence and controlled v25 regression/promotion are attached. Detailed evidence is in `docs/release/meta-v6/phase-07-evidence.md`. The loop runner now selects Phase 8.

---

# Phase 8 — Lead Ads Webhook, Retrieval & CRM

**Priority:** P1.4  
**Depends on:** Phase 5, Phase 7  
**Baseline status:** `PARTIAL`

## Objective

Lead Ads notification securely receive করে full lead retrieve, normalize, deduplicate, assign এবং CRM lifecycle track করা।

## Business outcome

Lead response time কমবে; campaign/ad/form থেকে order conversion measure করা যাবে।

## Current implementation evidence

- Lead retrieval, page subscription, HMAC webhook verification and MetaLead persistence exist

## Open gaps

- Lead processing status is raw String rather than v6 enum state machine
- Webhook notification, retrieval retry, assignment and CRM conversion lifecycle are incomplete
- End-to-end test-lead evidence and dedupe constraints need v6 gates

## Engineering loop sequence

1. Add webhook receipt and lead processing enums/history
2. Persist notification first, then retrieve full lead asynchronously
3. Add deterministic leadgen_id dedupe and retry/DLQ flow
4. Preserve campaign/ad/adset/form IDs and attribution
5. Add assignment, contact, qualified, converted and lost transitions with audit

## Target directory and file contract from v6

```text
app/api/webhooks/meta/route.ts
lib/meta/leads/
├─ verify.ts
├─ signature.ts
├─ receipt.ts
├─ fetch.ts
├─ normalize.ts
├─ deduplicate.ts
├─ assign.ts
├─ notify.ts
└─ types.ts
workers/meta-lead.worker.ts
```

Refactor/extend:

```text
lib/meta-business/leads.ts
prisma/schema.prisma
Meta webhook route
admin lead pages
```

## Prisma and migration contract

```prisma
enum MetaLeadStatus {
  NEW
  CONTACTED
  QUALIFIED
  UNQUALIFIED
  CONVERTED
  LOST
}

enum MetaWebhookStatus {
  RECEIVED
  VERIFIED
  QUEUED
  PROCESSED
  FAILED
  REJECTED
}

model MetaWebhookReceipt {
  id            String            @id @default(cuid())
  objectType    String
  externalId    String?
  eventKey      String            @unique
  signatureOk   Boolean
  payload       Json
  status        MetaWebhookStatus @default(RECEIVED)
  receivedAt    DateTime          @default(now())
  processedAt   DateTime?
  cleanupAfter  DateTime?
  error         Json?
}

model MetaLead {
  id             String         @id @default(cuid())
  leadgenId      String         @unique
  formId         String?
  pageId         String?
  campaignId     String?
  adsetId        String?
  adId           String?
  rawFields      Json
  normalizedData Json?
  status         MetaLeadStatus @default(NEW)
  assignedToId   String?
  receivedAt     DateTime
  contactedAt    DateTime?
  convertedOrderId String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}
```

## API contract

Webhook:

```text
GET
→ verify hub.mode, hub.verify_token, hub.challenge

POST
→ verify signature
→ save receipt
→ enqueue
→ return 200 quickly
```

Worker:

```text
notification leadgen_id
→ Graph lead retrieval
→ normalized CRM record
```

## Resolver and validation contract

Dedup priority:

```text
leadgenId
→ normalized phone
→ normalized email
```

Assignment:

- campaign/form rules
- city/area
- product interest
- round-robin
- salesperson capacity

Lead-to-order link explicit হবে।

- expected object/entry/change structure
- leadgen ID required
- Page/form ownership
- field mapping schema
- phone/email normalization
- duplicate event key
- lead retrieval freshness

## Security and privacy contract

- verify token on GET
- `X-Hub-Signature-256` verification where applicable
- replay/duplicate guard
- payload size limit
- fast response
- raw lead data encrypted/restricted
- retention policy
- Page token server-only

## Worker and scheduling contract

```text
META_LEAD_FETCH
META_LEAD_RETRY
META_LEAD_ASSIGN
META_LEAD_SLA_ALERT
META_LEAD_RETENTION
```

Graph retrieval failure retries; invalid/deleted lead permanent state হবে।

## Admin UI contract

- new leads
- status pipeline
- campaign/ad/form source
- assigned agent
- response SLA
- contact attempts
- normalized fields
- order conversion
- webhook failures
- duplicate history

## Test plan

- webhook verification
- valid signature
- invalid signature
- replay
- duplicate notification
- successful retrieval
- token failure
- missing lead
- normalization
- assignment
- lead-to-order link

### Required local gates

- `npm run qa:meta-business-platform`
- `npm run qa:meta-v6-gap`
- `npm run typecheck`
- `npm test`

## Exit criteria

- Test Lead appears end-to-end।
- Invalid signature rejected।
- Duplicate lead not created।
- Campaign/ad/form IDs preserved।
- CRM assignment and conversion fields operational।

## Meta compatibility notes

Meta Lead Ads webhooks provide real-time change notifications; full lead data retrieval requires appropriate Page/access permissions and Graph calls. `[M12][M13]`

## Evidence to attach before closure

- Changed file list and rationale
- Migration SQL and disposable-environment apply result when applicable
- Automated command outputs
- Semantic payload fixtures/snapshots
- Security/privacy negative tests
- Runtime Meta sandbox/account evidence when required
- Rollback and operational handoff notes

---

# Phase 9 — Admin Meta Operations Center

**Priority:** P1.5  
**Depends on:** Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, Phase 7, Phase 8  
**Baseline status:** `PARTIAL`

## Objective

Catalog, events, leads, connections, jobs, diagnostics এবং attribution এক secure admin control plane-এ আনা।

## Business outcome

Developer ছাড়া operations team সমস্যা identify, inspect, retry এবং approve করতে পারবে।

## Current implementation evidence

- /admin/meta-business and multiple admin Meta APIs already exist
- SUPER_ADMIN write gates and sync logs exist

## Open gaps

- Current page is not yet the full catalog/events/leads/connections/jobs/diagnostics/attribution control plane
- Dangerous mutations do not share an approval workflow
- Some status views represent submitted state rather than final Meta result

## Engineering loop sequence

1. Split operations center into connection, catalog, events, leads, jobs, diagnostics, attribution and approvals tabs
2. Add role/permission matrix and step-up confirmation for dangerous actions
3. Show final provider state, trace IDs and human-readable failure reasons
4. Add mutation audit with before/after and actor
5. Ensure secrets and raw PII never render in admin responses

## Target directory and file contract from v6

```text
app/admin/meta/
├─ page.tsx
├─ connections/
├─ catalog/
├─ catalog-issues/
├─ jobs/
├─ events/
├─ leads/
├─ attribution/
├─ product-sets/
├─ webhooks/
├─ approvals/
├─ settings/
└─ audit-logs/

app/api/admin/meta/
```

- server components/loaders
- protected admin route handlers
- tables/filters
- redacted JSON viewer
- action confirmation dialogs
- permission policy
- audit logger

## Prisma and migration contract

Use prior models plus immutable audit:

```prisma
model MetaAdminAudit {
  id          String   @id @default(cuid())
  actorId     String
  action      String
  resourceType String
  resourceId  String?
  beforeData  Json?
  afterData   Json?
  reason      String?
  createdAt   DateTime @default(now())

  @@index([actorId, createdAt])
  @@index([resourceType, resourceId])
}
```

## API contract

Read APIs:

- paginated
- filterable
- stable sort
- safe/redacted payload

Write APIs:

```text
enqueue sync
retry item/event/job
cancel queued job
approve mass delete
rotate connection
change schedule
approve ad mutation
```

Every write returns audit ID।

## Resolver and validation contract

Overview health derives from source records, not manually stored flags:

```text
catalog health
= active items - failed items - diagnostics blockers

CAPI health
= success rate + oldest pending + Purchase coverage

connection health
= token + permission + assets + version
```

- pagination bounds
- allowlisted filters/sorts
- action-specific payload schema
- confirmation token for dangerous actions
- stale resource version check
- reason required for destructive/financial action

## Security and privacy contract

- admin RBAC
- MFA/high privilege recommended
- CSRF protection
- PII redaction
- immutable audit
- no tokens in UI
- download/export authorization
- bulk action limits

## Worker and scheduling contract

UI only enqueues jobs. Polling/SSE/WebSocket may update status, but browser never runs Meta mutation directly।

## Admin UI contract

Overview metrics:

- catalog valid/failed/stale
- pending batches
- batch age
- CAPI sent/failed/pending
- Purchase coverage
- event match signal coverage
- token/version health
- webhook health
- new leads
- queue backlog
- open alerts

Catalog:

- dry run
- payload diff
- source vs Meta mapping
- single retry
- delete preview
- diagnostics

Events:

- event ID
- order
- browser/server pair
- consent
- attempts/error

Leads:

- source, SLA, assignment, conversion

## Test plan

- RBAC
- CSRF
- PII redaction
- pagination
- destructive confirmation
- stale approval
- job enqueue
- retry
- audit record
- export permissions

### Required local gates

- `npm run qa:admin-api-security`
- `npm run qa:meta-business-platform`
- `npm run qa:meta-v6-gap`
- `npm test`

## Exit criteria

- Non-technical admin failure reason বুঝতে পারে।
- Dangerous action approval ছাড়া চলে না।
- Every mutation audited।
- No secret/PII leak।
- Source-of-truth statuses reflect final Meta result।

## Meta compatibility notes

Meta asynchronous batch and diagnostics outputs must be represented as submitted/pending/final states; submission acceptance alone must not be shown as final success। `[M4][M7]`

## Evidence to attach before closure

- Changed file list and rationale
- Migration SQL and disposable-environment apply result when applicable
- Automated command outputs
- Semantic payload fixtures/snapshots
- Security/privacy negative tests
- Runtime Meta sandbox/account evidence when required
- Rollback and operational handoff notes

---

# Phase 10 — Observability, Diagnostics & Alerting

**Priority:** P2.1  
**Depends on:** Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, Phase 7, Phase 8, Phase 9  
**Baseline status:** `PARTIAL`

## Objective

Catalog, CAPI, queue, webhook, connection এবং ads operations-এর জন্য structured logs, metrics, traces এবং alerts তৈরি করা।

## Business outcome

Revenue-impacting outage customer report-এর আগে detect হবে; root-cause analysis দ্রুত হবে।

## Current implementation evidence

- Structured operational logging, tracking health and several runtime QA scripts exist

## Open gaps

- Catalog Diagnostics ingestion/per-item issue dashboard is absent
- Unified trace IDs across batch/event/job/webhook are incomplete
- Alert SLA, dedupe/cooldown and escalation policy are not implemented as one system

## Engineering loop sequence

1. Add diagnostic issue model and Meta catalog diagnostics importer
2. Standardize correlation IDs across DB outbox, BullMQ and Meta responses
3. Add metrics for lag, failure rate, dedupe, match quality and stale assets
4. Add alert rules with cooldown/dedup and ownership
5. Add redaction tests for tokens, email, phone and webhook payloads

## Target directory and file contract from v6

```text
lib/observability/
├─ logger.ts
├─ redaction.ts
├─ correlation.ts
├─ metrics.ts
├─ tracing.ts
├─ alerts.ts
└─ health.ts

lib/meta/catalog/diagnostics.ts
```

Integrate with:

```text
lib/observability/logger.ts
all Meta workers
all Meta route handlers
CAPI sender
catalog batch checker
lead webhook
connection health
```

## Prisma and migration contract

```prisma
enum MetaIncidentStatus {
  OPEN
  ACKNOWLEDGED
  RESOLVED
}

model MetaIncident {
  id          String             @id @default(cuid())
  type        String
  severity    String
  status      MetaIncidentStatus @default(OPEN)
  resourceId  String?
  details     Json?
  openedAt    DateTime           @default(now())
  acknowledgedAt DateTime?
  resolvedAt  DateTime?
}
```

## API contract

Correlation headers/internal context:

```text
correlationId
requestId
jobId
batchHandle
catalogId
retailerId
eventId
orderId
leadgenId
```

Protected health endpoint returns aggregate only; metrics endpoint restricted।

## Resolver and validation contract

Correlation chain example:

```text
admin sync request
→ job ID
→ batch handle
→ retailer item state
→ final diagnostics error
```

Incident dedup key:

```text
incidentType + resourceId + timeWindow
```

- mandatory structured fields
- bounded payload sizes
- known severity
- no uncontrolled exception serialization
- timestamps UTC
- metrics labels low-cardinality

## Security and privacy contract

- token/PII redaction
- stack trace restricted
- metrics/health auth
- webhook payload not copied to general logs
- incident exports restricted

## Worker and scheduling contract

Metrics:

```text
meta_catalog_items_submitted_total
meta_catalog_items_failed_total
meta_catalog_sync_duration_seconds
meta_catalog_batch_pending_seconds
meta_catalog_diagnostics_errors_total
meta_capi_events_sent_total
meta_capi_events_failed_total
meta_capi_delay_seconds
meta_webhook_received_total
meta_leads_created_total
meta_token_check_failed_total
meta_queue_backlog_total
```

Alerts:

- invalid token
- version expiry
- batch stuck
- catalog failure spike
- no Purchase events
- CAPI latency
- webhook silence/failure
- queue backlog
- mass delete candidate

## Admin UI contract

- incident inbox
- severity/status
- correlation timeline
- diagnostics by item
- alert acknowledgement
- runbook link
- historical trend

## Test plan

- secret redaction
- PII redaction
- stuck batch alert
- zero Purchase alert
- rate spike
- incident dedup
- mass delete circuit
- metric cardinality

### Required local gates

- `npm run qa:tracking-runtime-health`
- `npm run qa:meta-v6-gap`
- `npm run typecheck`
- `npm test`

## Exit criteria

- Critical failures alert within defined SLA।
- Every batch/event/job traceable।
- Catalog Diagnostics imported।
- Logs contain no secrets/PII।
- Alert noise controlled through dedup/cooldown।

## Meta compatibility notes

Meta Catalog Diagnostics exposes catalog issue information useful for health dashboards; API/rate-limit errors must retain Meta trace/error codes in redacted form. `[M7][M20]`

## Evidence to attach before closure

- Changed file list and rationale
- Migration SQL and disposable-environment apply result when applicable
- Automated command outputs
- Semantic payload fixtures/snapshots
- Security/privacy negative tests
- Runtime Meta sandbox/account evidence when required
- Rollback and operational handoff notes

---

# Phase 11 — First-Party Attribution & Growth Analytics

**Priority:** P2.2  
**Depends on:** Phase 3, Phase 4, Phase 6  
**Baseline status:** `PARTIAL`

## Objective

UTM, Meta click/browser identifiers, sessions, leads, orders এবং product funnel-কে first-party attribution model-এ যুক্ত করা।

## Business outcome

Campaign/product অনুযায়ী revenue, CAC এবং funnel drop-off বোঝা যাবে; Meta-reported attribution-এর বাইরে internal view পাওয়া যাবে।

## Current implementation evidence

- Campaign attribution route, order attribution helpers, migrations and production docs exist
- First-party identifiers and reporting foundations are substantial

## Open gaps

- Lead-to-order attribution and Meta-reported versus first-party labeling need one v6 contract
- Coverage/data-quality metrics are not consistently exposed in the Meta operations center
- First-touch overwrite protections require dedicated v6 regression fixtures

## Engineering loop sequence

1. Define immutable first-touch and separately updateable last-touch models
2. Link sessions, leads, orders and product funnel events
3. Label Meta-reported and first-party metrics separately
4. Expose attribution coverage, missing identifier and reconciliation metrics
5. Add reproducibility fixtures from landing through order/lead conversion

## Target directory and file contract from v6

```text
lib/attribution/
├─ capture.ts
├─ cookies.ts
├─ session.ts
├─ first-touch.ts
├─ last-touch.ts
├─ checkout-snapshot.ts
├─ order-link.ts
├─ aggregation.ts
└─ reports.ts
```

Integrate:

```text
lib/tracking/order-attribution.ts
lib/tracking/campaigns.ts
AttributionCookieCapture.tsx
checkout/order creation
lead conversion flow
admin reports
```

## Prisma and migration contract

```prisma
model MarketingAttribution {
  id          String   @id @default(cuid())
  sessionId   String?
  visitorId   String?
  customerId  String?
  orderId     String?
  leadId      String?

  fbclid      String?
  fbc         String?
  fbp         String?

  utmSource   String?
  utmMedium   String?
  utmCampaign String?
  utmTerm     String?
  utmContent  String?
  landingPage String?

  firstTouch  Json?
  lastTouch   Json?
  checkoutSnapshot Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([orderId])
  @@index([leadId])
  @@index([sessionId])
}
```

## API contract

Capture endpoint/client contract:

```ts
{
  sessionId,
  visitorId,
  landingPage,
  utm,
  fbclid,
  fbp,
  fbc,
  capturedAt
}
```

Order snapshot immutable after confirmation except explicit correction audit।

## Resolver and validation contract

- first-touch: first valid marketing touch, immutable
- last-touch: latest eligible touch before conversion
- direct traffic policy documented
- lead conversion inherits lead attribution
- order conversion snapshots current attribution
- multi-device identity only when legitimately linked

- URL/query size bounds
- sanitize landing URL
- UTM normalization
- identifier format/length
- session uniqueness
- no overwrite of immutable first-touch
- no backdating beyond policy

## Security and privacy contract

- Consent-aware cookie/identifier capture
- no sensitive query strings
- retention policy
- role-restricted customer-level reports
- aggregate export preferred

## Worker and scheduling contract

```text
ATTRIBUTION_DAILY_AGGREGATE
ATTRIBUTION_ORDER_BACKFILL
ATTRIBUTION_LEAD_CONVERSION_LINK
ATTRIBUTION_DATA_QUALITY
```

## Admin UI contract

Reports:

- campaign → leads
- campaign → orders
- campaign → revenue
- product → ViewContent/AddToCart/Purchase
- CAC
- new vs returning revenue
- first vs last touch
- unattributed conversions
- data quality coverage

## Test plan

- first touch immutability
- last touch update
- direct visit
- cross-session order
- lead-to-order
- missing fbp/fbc
- duplicate capture
- consent denial

### Required local gates

- `npm run qa:tracking-attribution`
- `npm run qa:master-tracking`
- `npm run qa:meta-v6-gap`
- `npm test`

## Exit criteria

- Order and lead attribution reproducible।
- Meta and first-party reports separately labelled।
- No silent overwrite of first touch।
- Coverage/data-quality metrics visible।

## Meta compatibility notes

`_fbp` and `_fbc` can be sent with server events as browser/click identifiers, but first-party attribution and Meta attribution are different measurement models and must not be presented as identical. `[M8][M11]`

## Evidence to attach before closure

- Changed file list and rationale
- Migration SQL and disposable-environment apply result when applicable
- Automated command outputs
- Semantic payload fixtures/snapshots
- Security/privacy negative tests
- Runtime Meta sandbox/account evidence when required
- Rollback and operational handoff notes

---

# Phase 12 — Product Sets, Categories & Merchandising Segmentation

**Priority:** P2.3  
**Depends on:** Phase 2, Phase 5  
**Baseline status:** `NOT_STARTED`

## Objective

Catalog data quality-এর উপর ভিত্তি করে deterministic product sets এবং optional Shop collections তৈরি করা।

## Business outcome

Campaign targeting, catalog ads, merchandising এবং seasonal promotion দ্রুত চালানো যাবে।

## Current implementation evidence

- Catalog/category/brand data exists, but no dedicated Meta product set implementation was found

## Open gaps

- No deterministic ProductSet rule model
- No preview/sync API or Meta product_sets integration
- No empty/broken set alerts or rule mutation audit

## Engineering loop sequence

1. Add product set rule schema and deterministic local evaluator
2. Add preview API and membership snapshot hash
3. Create/update Meta product sets only after preview validation
4. Add scheduled reconciliation and empty-set alerts
5. Add admin rule builder with audit and rollback

## Target directory and file contract from v6

```text
lib/meta/product-sets/
├─ types.ts
├─ rules.ts
├─ evaluator.ts
├─ preview.ts
├─ sync.ts
├─ status.ts
└─ collections.ts
```

- product set API client
- local membership evaluator
- sync worker
- admin rule builder
- product category mapper

## Prisma and migration contract

```prisma
model MetaProductSetDefinition {
  id          String   @id @default(cuid())
  catalogId   String
  remoteSetId String?
  name        String
  rule        Json
  isActive    Boolean  @default(true)
  lastSyncedAt DateTime?
  lastError   Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## API contract

Rules can use:

- availability
- price range
- sale status
- category/product type
- brand
- custom labels
- stock
- new/bestseller/high-margin business flags

Dry-run returns member IDs/count before remote mutation।

## Resolver and validation contract

Initial sets:

```text
In Stock
New Arrivals
Best Sellers
Discounted
Low Stock
Under ৳1000
High Margin
Skincare
Lipstick
```

Rule evaluation local and remote-filter semantics aligned করতে হবে।

- non-empty name
- allowed fields/operators
- bounded rule depth
- valid currency thresholds
- no broken category reference
- empty set warning
- all-products set explicit confirmation

## Security and privacy contract

- RBAC for rule changes
- remote set deletion confirmation
- audit before/after
- no arbitrary JSON passed directly to Meta without allowlist

## Worker and scheduling contract

- sync after successful catalog update
- nightly membership verification
- empty/broken set alert
- optional collection sync

## Admin UI contract

- set list
- rule builder
- membership preview
- item sample
- sync status/error
- associated campaign reference

## Test plan

- each rule operator
- empty filter
- sale start/end
- stock changes
- category changes
- remote partial failure
- idempotent update

### Required local gates

- `npm run qa:meta-v6-gap`
- `npm run typecheck`
- `npm test`

## Exit criteria

- Product sets deterministic।
- Membership preview matches synchronized result।
- Empty/broken sets alerted।
- Rule mutations audited।

## Meta compatibility notes

Meta Product Catalog Product Sets use JSON-encoded filter rules; an empty filter can represent all catalog items. Product categories can improve discovery/classification. `[M16][M21]`

## Evidence to attach before closure

- Changed file list and rationale
- Migration SQL and disposable-environment apply result when applicable
- Automated command outputs
- Semantic payload fixtures/snapshots
- Security/privacy negative tests
- Runtime Meta sandbox/account evidence when required
- Rollback and operational handoff notes

---

# Phase 13 — Ads Insights & Approval-Based Automation

**Priority:** P2.4  
**Depends on:** Phase 7, Phase 9, Phase 10  
**Baseline status:** `PARTIAL`

## Objective

Marketing API থেকে read-only performance insights ingest করা এবং পরে strictly approval-based ad mutations enable করা।

## Business outcome

Spend, CTR, CPC, purchases এবং ROAS এক dashboard-এ দেখা যাবে; optimization suggestions human control-এর অধীনে থাকবে।

## Current implementation evidence

- Ads Insights, campaign/adset/creative/ad read/write APIs and safe PAUSED create defaults exist

## Open gaps

- No approval request/state model for ad mutations
- No universal budget safety cap or before/after approval audit
- Read-only stability gate is not separated from write enablement

## Engineering loop sequence

1. Persist normalized Ads Insights snapshots first
2. Add recommendation generator without direct mutation
3. Add approval request, approver, expiry and immutable payload hash
4. Enforce budget/bid caps server-side and require valid approval token
5. Audit before/after provider state and handle partial failure safely

## Target directory and file contract from v6

```text
lib/meta/ads/
├─ client.ts
├─ insights.ts
├─ breakdowns.ts
├─ normalization.ts
├─ recommendations.ts
├─ drafts.ts
├─ approvals.ts
├─ mutations.ts
└─ audit.ts
```

- ad account/campaign/ad set/ad readers
- async insights jobs
- recommendation engine
- approval API
- mutation executor
- rollback metadata

## Prisma and migration contract

```prisma
enum MetaApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
  EXECUTED
  FAILED
}

model MetaAutomationSuggestion {
  id          String   @id @default(cuid())
  type        String
  resourceId  String
  recommendation Json
  evidence    Json
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}

model MetaMutationApproval {
  id           String             @id @default(cuid())
  suggestionId String
  status       MetaApprovalStatus @default(PENDING)
  requestedBy  String
  approvedBy   String?
  reason       String?
  beforeData   Json?
  afterData    Json?
  executedAt   DateTime?
  createdAt    DateTime           @default(now())
}
```

## API contract

Stages:

```text
13A Read-only Insights
13B Recommendation/Draft only
13C Human approval
13D Controlled mutation/publishing
```

Read metrics:

- spend
- impressions
- reach
- clicks
- CTR
- CPC
- purchases/conversion metrics
- ROAS where available and correctly defined

Write request requires approval ID and optimistic resource state।

## Resolver and validation contract

- Normalize time zone and attribution windows.
- Store source metric definitions.
- Recommendation requires minimum data volume/confidence.
- Before execution, refetch resource and compare stale state.

- valid ad account/resource ownership
- allowed fields only
- budget min/max and daily change cap
- approval not expired
- suggestion evidence still current
- campaign objective compatibility
- no automatic write from recommendation worker

## Security and privacy contract

- `ads_read` for insight-only path; mutation permissions separated।
- Least privilege tokens।
- Dual approval optional for high budget।
- Immutable before/after audit।
- Emergency kill switch।

## Worker and scheduling contract

```text
META_ADS_INSIGHTS_DAILY
META_ADS_INSIGHTS_HOURLY_SUMMARY
META_ADS_RECOMMENDATIONS
META_ADS_APPROVED_MUTATION
```

Rate-limit-aware async insights fetching required for large ranges।

## Admin UI contract

- performance dashboard
- campaign/ad set/ad drill-down
- trend and anomaly
- recommendation inbox
- evidence
- approve/reject
- mutation history
- rollback information

## Test plan

- ads_read permission missing
- pagination
- async insights
- rate limit
- stale suggestion
- unauthorized approval
- budget cap
- mutation failure
- audit/rollback metadata

### Required local gates

- `npm run qa:meta-business-platform`
- `npm run qa:meta-v6-gap`
- `npm run typecheck`
- `npm test`

## Exit criteria

- Read-only dashboard stable before writes enabled।
- No mutation without explicit valid approval।
- Budget safety caps enforced।
- Every write has before/after audit।

## Meta compatibility notes

The Marketing API provides endpoints for advertising objects and Ads Insights; Insights access requires appropriate authorization such as `ads_read`. Rate limits and metric semantics must be respected. `[M14][M15][M20]`

## Evidence to attach before closure

- Changed file list and rationale
- Migration SQL and disposable-environment apply result when applicable
- Automated command outputs
- Semantic payload fixtures/snapshots
- Security/privacy negative tests
- Runtime Meta sandbox/account evidence when required
- Rollback and operational handoff notes

---

# Phase 14 — Instagram Messaging & Social CRM Expansion

**Priority:** P2.5  
**Depends on:** Phase 5, Phase 6, Phase 7, Phase 8, Phase 9, Phase 10  
**Baseline status:** `FOUNDATION_ONLY`

## Objective

Instagram Professional account messaging, comments/private replies এবং product inquiries-কে secure CRM/support workflow-এ integrate করা।

## Business outcome

Social inquiries দ্রুত respond হবে; conversation-to-lead/order conversion track করা যাবে।

## Current implementation evidence

- Generic social inbox UI and Instagram labels/types exist
- Meta creative configuration supports an Instagram actor ID

### Phase 14 implementation update — 18 July 2026

**Engineering state:** `READY_FOR_GENERATION`

- Signed raw-body Instagram webhook ingestion, stable event/message dedupe and receipt-first durable queue processing are implemented.
- Typed conversations, messages, attachments, verified CRM links and immutable reply attempts are persisted through the Phase 14 schema/migration.
- Account ownership, messaging permission, standard reply-window and one-shot private-reply policies fail closed.
- `/admin/meta/instagram` provides assignment, tags/status, verified customer/lead/product/order links, health and audited reply controls.
- Phase 14 semantic tests pass 22/22 and static contract checks pass 81/81; admin security scans 97 routes.
- Prisma generation/migration and live App Review/account/webhook/reply/runtime evidence remain release holds, so this phase is not `COMPLETE`.

## Open gaps

- No verified Instagram Messaging webhook/Graph ingestion path was found
- No Instagram-specific message dedupe, reply policy or permission health flow
- Customer/lead/order linking is not proven for Instagram conversations

## Engineering loop sequence

1. Verify professional account linkage and messaging permissions
2. Add signed webhook ingestion and dedupe state machine
3. Normalize conversations/messages/attachments into social CRM models
4. Implement policy-aware replies and private-reply windows
5. Link conversation to customer, lead, product and order with audit

## Target directory and file contract from v6

```text
app/api/webhooks/meta/instagram/route.ts
lib/meta/instagram/
├─ verify.ts
├─ webhook.ts
├─ conversations.ts
├─ messages.ts
├─ attachments.ts
├─ profiles.ts
├─ assignment.ts
└─ policy.ts
workers/meta-instagram.worker.ts
```

- Instagram webhook handler
- conversation/message repository
- media downloader
- assignment/notification
- reply API client where permitted
- admin inbox

## Prisma and migration contract

```prisma
model MetaConversation {
  id             String   @id @default(cuid())
  platformId     String   @unique
  accountId      String
  participantId  String
  customerId     String?
  leadId         String?
  assignedToId   String?
  status         String
  lastMessageAt  DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model MetaMessage {
  id              String   @id @default(cuid())
  platformId      String   @unique
  conversationId  String
  direction       String
  messageType     String
  text            String?
  attachments     Json?
  sentAt          DateTime
  rawPayload      Json?
  createdAt       DateTime @default(now())
}
```

## API contract

- Webhook ingest
- conversation list/detail
- assignment
- tags/status
- reply/send only within supported policy/permission
- private reply flow where supported

All platform IDs preserved।

## Resolver and validation contract

- Instagram-scoped participant ID → conversation
- participant → existing customer/lead by verified link, not unsafe fuzzy match alone
- product inquiry can create lead with source metadata
- duplicate message ID ignored

- supported webhook event
- message/conversation ID required
- attachment type/size
- account ownership
- reply eligibility/window
- idempotency

## Security and privacy contract

- webhook signature
- RBAC
- message retention
- attachment malware/type validation
- signed/private media handling
- user profile access limited
- App Review/permissions verified before feature enable

## Worker and scheduling contract

- webhook processing
- media fetch
- profile enrichment
- assignment
- notifications
- retention cleanup

## Admin UI contract

- inbox
- assignment
- tags
- customer/lead link
- product context
- attachments
- reply status
- audit history

## Test plan

- webhook verification/signature
- duplicate message
- text/media
- private reply eligibility
- account mismatch
- permission failure
- assignment
- retention

### Required local gates

- `npm run qa:meta-v6-gap`
- `npm run typecheck`
- `npm test`

## Exit criteria

- Messages securely ingested and deduplicated।
- Account/permission checks pass।
- Customer/lead linking auditable।
- Replies only when platform policy permits।

## Meta compatibility notes

Instagram Messaging APIs and webhooks are designed for supported Instagram Professional account use cases and may require App Review and relevant permissions. `[M18][M19]`

## Evidence to attach before closure

- Changed file list and rationale
- Migration SQL and disposable-environment apply result when applicable
- Automated command outputs
- Semantic payload fixtures/snapshots
- Security/privacy negative tests
- Runtime Meta sandbox/account evidence when required
- Rollback and operational handoff notes

---

# Phase 15 — Testing, CI, Migration & Release Governance

**Priority:** P2.6  
**Depends on:** Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, Phase 7, Phase 8, Phase 9, Phase 10, Phase 11, Phase 12, Phase 13, Phase 14  
**Baseline status:** `PARTIAL`

## Objective

Schema, catalog payload, tracking, CAPI, webhooks, permissions এবং admin actions-এর regressions production deployment-এর আগে block করা।

## Business outcome

Campaign outage, stale catalog, duplicate Purchase, privacy leak এবং unsafe ad mutation-এর risk কমবে।

## Current implementation evidence

- Large static audit suite, CI workflow, typecheck/build/security/release scripts and runbooks exist

## Open gaps

- No v6 phase manifest/gate existed before this update
- Current audits can pass while A1–A14 blockers remain
- No evidence-driven phase completion state and no API version expiry blocker
- Critical catalog/CAPI/lead runtime E2E evidence remains environment-dependent

## Engineering loop sequence

1. Use the added v6 manifest, gap audit and loop runner as the controlling layer
2. Add phase-specific semantic/unit/integration/E2E tests before marking complete
3. Add migration dry-run/rollback and generated-client freshness checks
4. Generate release claim only from machine-readable evidence
5. Keep runtime-only Meta account checks explicit and never mark them statically complete

## Target directory and file contract from v6

```text
tests/
├─ unit/meta/
├─ integration/meta/
├─ e2e/meta/
├─ security/meta/
├─ contracts/meta/
└─ fixtures/meta/

scripts/
├─ meta-schema-audit.mjs
├─ meta-identity-audit.mjs
├─ meta-items-batch-contract-audit.mjs
├─ meta-capi-contract-audit.mjs
├─ meta-webhook-security-audit.mjs
├─ meta-pii-audit.mjs
├─ meta-version-gate.mjs
└─ meta-release-gate.mjs
```

Existing audits remain, but token/string-presence tests-এর সঙ্গে executable semantic tests যোগ হবে:

```text
scripts/meta-business-platform-audit.mjs
scripts/meta-catalog-semantic-audit.mjs
scripts/tracking-phase12-capi-schema-audit.mjs
```

New tests must import and execute real resolvers/adapters where possible।

## Prisma and migration contract

Migration order:

```text
1. add enums/new nullable fields
2. backfill condition/consent/variant state
3. add indexes
4. deploy resolver code supporting old+new
5. backfill catalog state hashes
6. switch writer adapter
7. verify
8. tighten non-null/constraints
```

Each migration requires rollback/forward-fix note।

## API contract

Contract snapshots:

- canonical catalog domain
- `/items_batch` write payload
- CSV feed
- CAPI web event
- webhook verification/receipt
- admin enqueue
- insights response normalization

Meta mock cases:

```text
success
partial item failure
pending
rate limit
timeout
5xx
invalid token
invalid field
malformed response
permission denied
asset not found
```

## Resolver and validation contract

Golden fixtures are source of truth:

```text
input DB fixture
→ expected canonical domain
→ expected adapter payload
→ expected tracking payload
```

Property tests:

- quantity never negative
- sale never >= price
- content IDs always match
- inactive never UPDATE
- duplicate event key impossible

CI mandatory:

```text
npm ci
npx prisma generate
npx prisma validate
migration drift check
npm run typecheck
npm run lint
unit tests
integration tests
security audits
Meta contract audits
build
critical E2E
```

Release blocked on any P0 failure।

## Security and privacy contract

- No real production tokens in CI।
- Secret scanner।
- PII fixture synthetic।
- webhook signature tests।
- SSRF/link validation tests।
- RBAC/CSRF tests।
- dependency audit and exact lockfile।

## Worker and scheduling contract

Worker tests use fake clock and isolated Redis/Postgres:

- retry schedule
- stalled recovery
- lock contention
- DLQ
- outbox dispatch
- batch polling
- lead fetch
- retention cleanup

## Admin UI contract

E2E:

- connection readiness
- catalog dry run
- failed item retry
- mass delete approval
- event retry
- lead assignment
- alert acknowledgement
- ad recommendation approve/reject

## Test plan

Critical E2E flows:

### Catalog

```text
create product
→ incremental sync
→ items batch payload verified
→ pending batch
→ final success
→ state hash active
```

### Variant deletion

```text
delete/disable variant
→ reconcile
→ DELETE submitted
→ final deleted
```

### Purchase

```text
confirm order
→ outbox inserted atomically
→ browser Purchase same event ID
→ CAPI worker send
→ deduplicated result
```

### Lead

```text
test lead
→ webhook signature
→ receipt
→ retrieval
→ CRM lead
→ assignment
```

### API version

```text
v24 contract suite
→ v25 staging suite
→ diff review
→ upgrade approval
```

### Required local gates

- `npm run qa:meta-v6-gate`
- `npm run qa:predeploy`
- `npm run build`

## Exit criteria

- Typecheck/build/migration checks pass।
- Real adapter semantic snapshots pass।
- Raw productId regression audit pass।
- PII/security tests pass।
- Catalog/CAPI/lead critical E2E pass।
- Version gate warns/blocks before expiry।
- Release claim only generated from test evidence।

## Meta compatibility notes

Meta APIs are versioned and evolve. CI must pin API/SDK versions, verify official changelogs, test adapter contracts and stage upgrades before production. `[M1]`

---

# Implementation Release Plan

## Evidence to attach before closure

- Changed file list and rationale
- Migration SQL and disposable-environment apply result when applicable
- Automated command outputs
- Semantic payload fixtures/snapshots
- Security/privacy negative tests
- Runtime Meta sandbox/account evidence when required
- Rollback and operational handoff notes

---

# 6. Completion dashboard protocol

The machine-readable source is `config/meta-v6-phase-manifest.json`. Update only the `state` object after a loop. Do not rewrite objective, gaps or acceptance criteria without a reviewed plan change.

Allowed progress:

`NOT_STARTED → FOUNDATION_ONLY/PARTIAL → READY_FOR_RUNTIME_QA → COMPLETE`

Use `BLOCKED` only with a concrete external dependency, owner and unblock action.

# 7. Commands added by this update

```bash
npm run qa:meta-v6-gap
npm run qa:meta-v6-gate
npm run loop:meta-v6 -- --next
npm run loop:meta-v6 -- --phase 2
npm run loop:meta-v6 -- --all
```

`qa:meta-v6-gap` is a reporting audit and exits successfully so it can be used during implementation. `qa:meta-v6-gate` is strict and must remain red until all configured blockers are resolved.

# 8. First recommended implementation loop

Start with **Phase 1**. It removes raw Meta catalog IDs and introduces server/browser identity parity. Phase 2 and Phase 3 should not be certified before Phase 1 is green because both depend on the same namespace contract.

Initial Phase 1 scope:

- Add server-only identity environment validator
- Add `META_CATALOG_ID_SOURCE` to environment contract
- Migrate wishlist and search click Meta payloads
- Add raw-ID scanner and identity fixture tests
- Add boot/deploy fail-fast gate
- Produce `docs/release/meta-v6/phase-01-evidence.md`

# 9. Production-readiness boundary

Static code completion is not enough for live Meta readiness. Token scopes, asset assignments, Catalog Diagnostics, Test Events, App Review, webhook subscription and production API responses require environment/account verification. Those checks must be recorded as runtime evidence and may not be inferred from code.

# 10. Current loop execution status

## Loop 1 — Phase 1 canonical identity

Implemented on 17 July 2026:

- Raw Meta `content_ids` were removed from wishlist and search-click call-sites.
- Server/browser catalog identity parity validation was added.
- Phase 1 unit tests pass 4/4.
- Phase 1 static audit passes 9/9.
- v6 blocker audit improved from 0/14 to 2/14.

Phase 1 remains `PARTIAL`, not `COMPLETE`, because the uploaded repository has a stale generated Prisma client, Prisma binary regeneration was blocked by DNS, and one unrelated FCP03 AuthShell test still fails. See `docs/release/meta-v6/phase-01-evidence.md`.

# 11. Loop 8 — Lead Ads Webhook, Retrieval & CRM

Implemented on 17 July 2026:

- Canonical signed Lead Ads webhook endpoint with challenge verification, timing-safe HMAC verification, payload bounds and Page/form ownership validation.
- Database-first encrypted webhook receipt before queue enqueue, with Redis outage recovery.
- Asynchronous Graph lead retrieval with attribution, freshness, token/not-found/permanent states.
- Typed lead, retrieval and webhook lifecycle enums.
- Leadgen/phone/email dedupe, capacity-aware assignment, contact history and explicit order conversion.
- Masked admin CRM, webhook failure surface, recovery/SLA/retention jobs and PII-free durable payloads.
- Raw phone/email and provider field values remain encrypted instead of being duplicated into normalized JSON.

Validation:

```text
Phase 8 tests                 14/14 passed
Phase 8 static audit          68/68 passed
Phase 1–7 regressions          passed
Meta Business platform        22/22 passed
Catalog semantic              23/23 passed
Repository tests              16/16 passed
Full TypeScript compiler      passed
Targeted ESLint               passed
Changed-entry integration     29/29 passed
Global v6 blockers            12/14 passed
```

Phase 8 state is `READY_FOR_RUNTIME_QA`, not `COMPLETE`. Prisma schema-engine download was blocked by DNS, the generated client freshness gate correctly blocks the build, and live Meta Test Lead plus live Redis recovery/SLA/retention evidence remain required. See `docs/release/meta-v6/phase-08-evidence.md`.

# 12. Current phase snapshot after Loop 14

| Phase | State |
|---|---|
| 1 — Canonical Product Identity | `COMPLETE` |
| 2 — Catalog Domain & Lifecycle | `READY_FOR_GENERATION` |
| 3 — Browser Tracking Contract | `READY_FOR_RUNTIME_QA` |
| 4 — Transactional Outbox | `READY_FOR_GENERATION` |
| 5 — Durable Queue & Rate Control | `READY_FOR_GENERATION` |
| 6 — Consent & Data Governance | `READY_FOR_GENERATION` |
| 7 — Connection & API Version Health | `READY_FOR_RUNTIME_QA` |
| 8 — Lead Ads Webhook & CRM | `READY_FOR_RUNTIME_QA` |
| 9 — Admin Meta Operations Center | `PARTIAL` |
| 10 — Observability, Diagnostics & Alerting | `PARTIAL` |
| 11 — First-Party Attribution & Growth Analytics | `READY_FOR_GENERATION` |
| 12 — Product Sets & Merchandising | `READY_FOR_GENERATION` |
| 13 — Ads Insights & Approval Automation | `READY_FOR_GENERATION` |
| 14 — Instagram Messaging & Social CRM | `READY_FOR_GENERATION` |
| 15 — Testing, CI, Migration & Release Governance | next engineering loop |

The loop runner should now select Phase 15. All 14 strict blockers are green, while deferred generation, migration, App Review and live provider/runtime evidence remain visible and are not treated as release completion.
