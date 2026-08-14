# Meta Business & Commerce — A–Z Audited Final Architecture Specification v6

**Project:** Minsah Beauty Ecommerce  
**Audit date:** 17 July 2026  
**Reviewed project snapshot:** `minsahbeauty_meta_business_full_project_v4.zip`  
**Reviewed previous specification:** `meta_business_structured_final_spec_v5_bn.md`  
**Document status:** Final implementation specification and single source of truth  
**Language:** Bengali; code, schema, API field এবং file path ইংরেজিতে রাখা হয়েছে।

---

## Document contract

প্রতিটি Phase একই fixed order অনুসরণ করে:

1. Objective
2. Business outcome
3. Directory structure
4. Files
5. Prisma schema
6. API contracts
7. Resolver logic
8. Validation rules
9. Security rules
10. Background workers
11. Admin UI
12. Testing
13. Acceptance criteria
14. Meta compatibility notes

এই document implementation roadmap, schema specification, API contract, security checklist এবং release gate—সব একসাথে ধারণ করে।

---

# A–Z Audit Verdict

## Structural result

- Phase 1–15 প্রত্যেকটিতে ১৪টি required heading উপস্থিত ছিল।
- v5 structurally consistent ছিল।
- তবে v5 implementation-complete ছিল না; field-adapter contract, বর্তমান code gap, API-version policy, CAPI required fields এবং migration sequencing আরও স্পষ্ট করা প্রয়োজন ছিল।
- v6-এ roadmap এবং বর্তমান project gap একই document-এ merge করা হয়েছে।

## Current project strengths

বর্তমান V4 project-এ ইতিমধ্যে আছে:

- SKU/database identity resolver foundation
- Catalog Items Batch submission
- catalog sync lock
- known synced-item reconciliation registry
- pending batch registry এবং status checker
- BullMQ-based Meta CAPI queue/worker
- Purchase event ID, `_fbp`, `_fbc`, hashed identifiers এবং failure logging
- OrderItem SKU snapshot
- MetaLead এবং Meta sync log foundation
- Meta semantic/static audit scripts

## P0 blockers found during final audit

### A1 — `/items_batch` write payload এখনও legacy/read-model field ব্যবহার করছে

বর্তমান `lib/meta-business/catalog.ts`-এ পাওয়া গেছে:

```text
inventory
url
image_url
retailer_product_group_id
price as minor-unit integer + separate currency
```

Target `/items_batch` adapter contract হবে:

```text
quantity_to_sell_on_facebook
link
image_link
item_group_id
price = "1250.00 BDT"
sale_price = "1100.00 BDT"
```

**Important:** Graph `ProductItem` read model, legacy batch API, feed CSV এবং `/items_batch` write contract এক নয়। একটি canonical domain object থাকবে, কিন্তু প্রতিটি adapter নিজ নিজ Meta field format serialize করবে।

### A2 — Backorder availability ভুল

বর্তমান resolver:

```text
allowBackorder=true
→ in stock
```

Final rule:

```text
availableQty <= 0 AND allowBackorder=true
→ available for order
```

### A3 — Future sale বাদ যাচ্ছে

বর্তমান logic future `offerStartDate` হলে `sale_price` omit করে। Final contract future sale এখনই পাঠাবে:

```text
price
sale_price
sale_price_effective_date
```

### A4 — Tracking-এ raw database product ID আছে

বর্তমান gap:

```text
lib/tracking/events.ts
app/api/search/clicks/route.ts
```

এগুলোতে `content_ids: [productId]` রয়েছে। SKU catalog namespace হলে এটি mismatch।

### A5 — Environment drift safety অসম্পূর্ণ

`.env.example`-এ আছে:

```env
NEXT_PUBLIC_META_CATALOG_ID_SOURCE=sku
```

কিন্তু server-side:

```env
META_CATALOG_ID_SOURCE=sku
```

নেই। তাই server/client drift validator বাস্তবে enforce করা যাচ্ছে না।

### A6 — Graph API version action required

বর্তমান project:

```env
META_GRAPH_API_VERSION=v24.0
```

Official current Graph API version 17 July 2026 অনুযায়ী `v25.0`; `v24.0` 6 October 2026 পর্যন্ত listed। Immediate blind upgrade নয়—SDK/API compatibility regression test করে controlled upgrade করতে হবে। `[M1]`

### A7 — Variant schema অসম্পূর্ণ

বর্তমান `ProductVariant`-এ নেই:

- sale window
- active/deleted lifecycle
- backorder override
- availability mode
- preorder date
- GTIN/MPN/barcode
- condition override

### A8 — Consent default unsafe

বর্তমান Order field:

```prisma
nonEssentialTrackingAllowed Boolean @default(true)
```

Final privacy-safe default:

```prisma
nonEssentialTrackingAllowed Boolean @default(false)
```

Existing records backfill policy ছাড়া সরাসরি default change করা যাবে না।

### A9 — Current queue transactional outbox নয়

BullMQ queue আছে, কিন্তু order DB transaction এবং queue enqueue atomic নয়। DB commit-এর পরে Redis enqueue fail করলে event হারাতে পারে। Phase 4-এ transactional DB outbox mandatory।

### A10 — Current Meta retry window খুব ছোট

বর্তমান BullMQ retry:

```text
1s → 2s → 4s → 8s → 16s
```

Catalog/CAPI transient outage-এর জন্য final policy:

```text
immediate → 1m → 5m → 15m → 1h
```

Provider-specific retry policy প্রয়োজন।

### A11 — CAPI contract-এ required web fields explicit করতে হবে

Website CAPI events-এর জন্য final contract-এ থাকবে:

- `action_source = "website"`
- `event_source_url`
- `event_time`
- `event_name`
- `event_id`
- `user_data`
- `custom_data`

Meta documentation অনুযায়ী website events-এ `action_source` এবং `event_source_url` required; event time ৭ দিনের বেশি পুরোনো হলে error হতে পারে। `[M8][M9]`

### A12 — Catalog required/recommended presentation fields incomplete ছিল

Phase 2-এ final canonical item-এ আরও থাকবে:

- title/name
- description
- condition
- brand
- link
- image_link
- additional_image_link
- product_type
- Google/Facebook category where applicable
- visibility
- custom labels
- rich variant attributes

### A13 — Status fields raw String হওয়া উচিত নয়

Final schema-তে enum ব্যবহার করতে হবে:

- Meta job status
- batch status
- event status
- lead status
- connection status
- webhook processing status
- approval status

### A14 — Catalog diagnostics missing

Meta Catalog Diagnostics data ingest করে per-item problem dashboard ও alerting-এ ব্যবহার করতে হবে। `[M7]`

---

# Priority and Dependency Serial

| Priority | Phase | Depends on | Release impact |
|---|---:|---|---|
| P0.1 | 1 — Identity | None | Catalog matching safety |
| P0.2 | 2 — Catalog schema/mapper | Phase 1 | Correct product data |
| P0.3 | 3 — Tracking events | Phase 1 | Pixel event integrity |
| P0.4 | 4 — CAPI outbox | Phase 1, 3 | Purchase reliability |
| P1.1 | 5 — Queue/workers | Phase 2, 4 | Durable processing |
| P1.2 | 6 — Privacy | Phase 3, 4 | Governance |
| P1.3 | 7 — Connection health | None | Operational readiness |
| P1.4 | 8 — Lead Ads | Phase 5, 7 | CRM leads |
| P1.5 | 9 — Admin center | Phase 2–8 | Operations |
| P2.1 | 10 — Observability | Phase 2–9 | Alerts |
| P2.2 | 11 — Attribution | Phase 3, 4, 6 | Growth reporting |
| P2.3 | 12 — Product sets | Phase 2, 5 | Catalog campaigns |
| P2.4 | 13 — Ads insights | Phase 7, 9, 10 | Controlled optimization |
| P2.5 | 14 — Instagram messaging | Phase 5–10 | Social CRM |
| P2.6 | 15 — CI/release gates | All | Production safety |

---
# Phase 1 — Canonical Product Identity
## Objective
Website, storefront state, Pixel, Conversions API এবং Meta Catalog-এর জন্য একটিমাত্র canonical item identity enforce করা।

Current project-এ resolver foundation আছে, কিন্তু raw `productId` call-site এবং dual environment source drift এখনো blocker।

## Business outcome
- Dynamic/Advantage+ Catalog Ads exact product বা variant match করবে।
- ViewContent → AddToCart → Purchase funnel একই SKU namespace বজায় রাখবে।
- Variant-specific retargeting, shade/size ads এবং product-level attribution নির্ভুল হবে।
- SKU rename accidental audience fragmentation তৈরি করবে না।

## Directory structure
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

## Files
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

## Prisma schema
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

## API contracts
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

## Resolver logic
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

## Validation rules
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

## Security rules
- Identity configuration may be public, কিন্তু access token/app secret নয়।
- Error logs-এ raw customer data থাকবে না।
- Admin SKU edit permission restricted হবে।
- SKU rename must require confirmation, impact preview এবং audit log।
- Identity resolver silent fallback করবে না।

## Background workers
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

## Admin UI
Meta Settings page:

- current server identity source
- current client identity source
- drift status
- production lock status
- duplicate/missing SKU count
- SKU migration preview
- unresolved old retailer IDs
- last identity audit timestamp

## Testing
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

## Acceptance criteria
- 100% commerce events shared resolver ব্যবহার করে।
- Production boot identity drift হলে fail করে।
- Catalog, Pixel ও CAPI sample fixtures exact same ID দেয়।
- SKU rename test old item delete এবং new item create প্রমাণ করে।
- কোনো raw DB ID Meta catalog field-এ যায় না।

## Meta compatibility notes
Catalog-based ad delivery-এর জন্য event content ID এবং catalog item ID matching critical। Product variants একই group ID-এর অধীনে রাখা যায়; selected variant-এর exact item ID tracking-এ পাঠানো উচিত। `[M6]`

# Phase 2 — Catalog Domain Model, Field Mapping & Lifecycle
## Objective
Product/ProductVariant schema থেকে একটি canonical commerce domain item তৈরি করা এবং তারপর adapter-specific Meta payload serialize করা।

এই Phase legacy `ProductItem` read field, legacy batch field, feed field এবং `/items_batch` write field mix হওয়া বন্ধ করবে।

## Business outcome
- Price, stock, sale, variant, link, image এবং identifiers সঠিক হবে।
- Meta Catalog Diagnostics rejection কমবে।
- Future sale exact সময়ে চালু হবে এবং expired sale clean হবে।
- Deleted/inactive SKU stale ad হিসেবে থাকবে না।
- Facebook/Instagram variant swatch data উন্নত হবে।

## Directory structure
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

## Files
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

## Prisma schema
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

## API contracts
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

## Resolver logic
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

## Validation rules
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

## Security rules
- Only project-owned state registry items may be auto-deleted.
- Mass delete threshold and percentage threshold both required.
- Delete dry-run + admin approval when threshold exceeded.
- Feed download token must be unguessable and rotatable.
- Catalog access token server-only.
- Error payloads redact tokens and customer data.
- Remote image URLs must be validated; no internal/private-network SSRF fetch.
- User-supplied HTML stripped from title/description.

## Background workers
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

## Admin UI
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

## Testing
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

## Acceptance criteria
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

# Phase 3 — Pixel & Browser Tracking Contract
## Objective
Storefront browser events-কে canonical identity, consent policy এবং Meta standard event schema অনুযায়ী unify করা।

## Business outcome
- Funnel signals consistent হবে।
- Dynamic retargeting product match উন্নত হবে।
- Duplicate/malformed browser events কমবে।
- Campaign optimization-এর জন্য ViewContent, AddToCart, Checkout এবং Purchase signals পরিষ্কার হবে।

## Directory structure
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

## Files
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

## Prisma schema
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

## API contracts
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

## Resolver logic
- Variant selected: exact variant SKU
- Variant not selected: product group SKU only for ViewContent where group-level event is intended
- Cart/checkout/purchase: exact sellable line-item SKU
- Value: sum of item price × quantity, excluding shipping/discount according to one documented policy
- Event ID generated once at user action boundary and passed to server when paired CAPI event exists

## Validation rules
- Empty `content_ids` blocked
- `contents` count and content IDs consistent
- quantity positive integer
- item price/value finite and non-negative
- currency uppercase ISO code
- `content_type` only `product` or `product_group`
- event ID required for browser/server paired event
- test/internal traffic excluded by policy

## Security rules
- Browser payload-এ access token, email, phone বা raw PII নয়।
- Consent policy before Pixel fire.
- Debug logs disabled in production; current `[MB_DEBUG]` console logging remove/gate করতে হবে।
- URL payload sanitization to avoid leaking query secrets.
- CSP এবং script nonce policy অনুসরণ করতে হবে।

## Background workers
Browser event direct client-side; worker নেই। তবে server audit/reconciliation job event coverage aggregate করতে পারে:

```text
META_EVENT_COVERAGE_AGGREGATE
META_PIXEL_CAPI_PAIR_AUDIT
```

## Admin UI
Event QA page:

- recent safe browser events
- event ID
- content IDs
- catalog match
- consent state
- paired CAPI status
- test/internal exclusion reason
- duplicate warning

## Testing
- product/variant ViewContent
- Wishlist raw productId regression
- Search click SKU regression
- AddToCart pair
- Checkout multi-line contents
- Browser Purchase claim
- consent denied
- test order excluded
- debug logging absent in production

## Acceptance criteria
- `grep`-based audit raw `content_ids: [productId]` খুঁজে পাবে না।
- All item events canonical builder ব্যবহার করবে।
- Paired events same event ID produce করবে।
- Browser payload contains no raw PII।
- Events Manager Test Events-এ core funnel visible হবে।

## Meta compatibility notes
Catalog-backed event `content_ids` catalog item identifiers-এর সঙ্গে match করা প্রয়োজন। Browser/server deduplication-এর জন্য same event name এবং event ID ব্যবহার করতে হয়। `[M10]`

# Phase 4 — Conversions API Transactional Outbox & Deduplication
## Objective
Server-side Meta events transactional outbox-এর মাধ্যমে reliably persist, dispatch, retry এবং deduplicate করা।

## Business outcome
- Meta/Redis outage checkout block করবে না।
- DB commit হলেও event হারাবে না।
- Duplicate Purchase কমবে।
- Event Match Quality inputs এবং diagnostics traceable হবে।

## Directory structure
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

## Files
Refactor/integrate:

```text
lib/queue/metaCapiQueue.ts
lib/workers/metaCapiWorker.ts
lib/tracking/meta-capi-core-event.ts
lib/tracking/meta-capi-cod-purchase.ts
lib/tracking/meta-business-sdk.ts
```

Current mixed queue also carries GA4/TikTok jobs; provider-specific queues/metrics split করতে হবে।

## Prisma schema
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

## API contracts
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

## Resolver logic
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

## Validation rules
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

## Security rules
- Access token only server secret store.
- Optional `appsecret_proof` supported for secure Graph requests. `[M17]`
- PII only normalized/hashed where Meta requires; raw payload persistent storage minimize করতে হবে।
- `client_ip_address` trusted proxy configuration থেকে resolve করতে হবে।
- Logs only `safePayload`.
- Outbox payload encryption-at-rest considered if raw identifiers temporarily stored।

## Background workers
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

## Admin UI
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

## Testing
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

## Acceptance criteria
- Order commit and outbox insert atomic।
- Redis outage cannot lose committed event।
- Duplicate Purchase DB-level blocked।
- Core website events contain action source and source URL।
- Event age validation passes official requirement।
- Retry and permanent failures visible।

## Meta compatibility notes
Meta CAPI uses `event_name` + `event_id` for browser/server deduplication. Website events require action source and event source URL, and events older than seven days may be rejected. Customer information fields have specific hashing requirements. `[M8][M9][M10][M11]`

# Phase 5 — Durable Queue, Scheduling & Rate Control
## Objective
Meta catalog, CAPI, leads, diagnostics এবং token checks-এর জন্য durable, isolated এবং observable job infrastructure তৈরি করা।

## Business outcome
Provider outage, rate limit বা server restart-এর সময় কাজ হারাবে না; এক feature-এর backlog অন্য feature block করবে না।

## Directory structure
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

## Files
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

## Prisma schema
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

## API contracts
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

## Resolver logic
Idempotency examples:

```text
catalog-inventory:{catalogId}:{15-minute-window}
catalog-reconcile:{catalogId}:{date}
token-health:{connectionId}:{date}
lead-fetch:{leadgenId}
```

Per-catalog lock, per-event unique key এবং per-lead unique ID একসাথে ব্যবহার হবে।

## Validation rules
- known job type only
- payload schema version required
- max payload size
- catalog/asset ownership verified
- concurrency limit
- timeout per job
- retry policy per provider/error class
- stale running-job recovery

## Security rules
- Cron routes secret-protected।
- Admin enqueue RBAC-protected।
- Job payload-এ access token নয়।
- Redis transport security/auth must match the deployment: protected private-network `redis://` or TLS-enabled `rediss://`।
- Queue dashboard public নয়।
- Malicious serialized data execute করা যাবে না।

## Background workers
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

## Admin UI
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

## Testing
- Redis restart
- worker crash mid-job
- duplicate enqueue
- lock expiry
- stalled job recovery
- DLQ
- rate limit delay
- mixed-provider isolation
- malformed payload

## Acceptance criteria
- Restart after enqueue does not lose work।
- Provider queues isolated।
- Duplicate scheduled jobs suppressed।
- Stalled jobs recovered।
- Rate limit does not create request storm।
- DLQ replay auditable।

## Meta compatibility notes
Meta catalog batch processing এবং Marketing API requests asynchronous/rate-limited হতে পারে; durable jobs এবং backoff required operational design। `[M4][M20]`

# Phase 6 — Consent, Privacy, Retention & Data Governance
## Objective
Meta tracking এবং lead data processing-কে explicit policy, consent state, retention এবং deletion workflow-এর অধীনে আনা।

## Business outcome
Privacy risk কমবে, PII leakage বন্ধ হবে এবং tracking behavior auditable হবে।

## Directory structure
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

## Files
Refactor:

```text
lib/tracking/tracking-consent.ts
lib/tracking/pixels/TrackingConsentManager.tsx
lib/tracking/client-traffic-filter.ts
lib/tracking/failure-retention.ts
```

Legal/business policy config code থেকে আলাদা versioned document/config হবে।

## Prisma schema
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

## API contracts
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

## Resolver logic
Inputs:

- explicit consent
- event category
- user/visitor region when legitimately available
- business legal basis configuration
- test/internal traffic
- user deletion/suppression status

Output is deterministic and versioned।

## Validation rules
- UNKNOWN does not equal GRANTED
- consent version required
- withdrawal takes precedence
- email trim/lowercase before hashing
- phone E.164-like normalization policy
- hash length/format validation
- no double hashing
- retention date mandatory for failure logs/receipts

## Security rules
- Raw PII never in general logs।
- Hashing occurs server-side।
- Encryption for retained raw lead fields।
- Least-access roles for lead/customer data।
- Backup deletion limitations documented।
- Data export/deletion actions audited।
- Legal review required; this technical spec is not legal advice।

## Background workers
```text
PRIVACY_RETENTION_CLEANUP
PRIVACY_DELETION_PROCESSOR
TRACKING_SUPPRESSION_SYNC
PII_AUDIT_SCAN
```

Cleanup idempotent এবং resumable হতে হবে।

## Admin UI
- current policy version
- Pixel/CAPI/advanced matching switches
- retention days
- consent distribution
- deletion requests
- suppressed event count
- PII log scan status
- policy change audit

## Testing
- unknown consent
- denied consent
- granted consent
- withdrawal
- advanced matching suppression
- raw PII log scanner
- deletion request
- retention expiry
- historical order migration

## Acceptance criteria
- Default non-essential tracking false।
- Every Meta event has policy decision metadata।
- Raw PII absent from operational logs।
- Withdrawal prevents future restricted processing।
- Retention/deletion jobs proven।

## Meta compatibility notes
Meta documents required/recommended customer-information parameters and hashing rules, but lawful collection/use and consent obligations depend on the business and jurisdiction. `[M11]`

# Phase 7 — Meta Connection, API Version, Token & Permission Health
## Objective
Meta App, Business, Catalog, Dataset/Pixel, Page, Ad Account এবং Instagram assets-এর connection health centrally manage করা।

## Business outcome
Expired token, wrong asset, permission loss এবং API version expiry campaign/sync outage হওয়ার আগে detect হবে।

## Directory structure
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
└─ errors.ts
```

## Files
Refactor:

```text
lib/meta-business/config.ts
lib/meta-business/sdk.ts
lib/tracking/meta-business-sdk.ts
config/env.manifest.json
.env.example
scripts/validate-env.mjs
```

Package policy:

```text
facebook-nodejs-business-sdk
→ exact version pin
→ no caret for production-critical SDK
```

## Prisma schema
```prisma
enum MetaConnectionStatus {
  UNCONFIGURED
  HEALTHY
  DEGRADED
  INVALID_TOKEN
  MISSING_PERMISSION
  ASSET_NOT_FOUND
  VERSION_WARNING
  ERROR
}

model MetaConnection {
  id                 String               @id @default(cuid())
  name               String
  businessId         String?
  catalogId          String?
  datasetId          String?
  pixelId            String?
  adAccountId        String?
  pageId             String?
  instagramAccountId String?
  tokenRef           String?
  tokenExpiresAt     DateTime?
  graphApiVersion    String
  sdkVersion         String?
  status             MetaConnectionStatus @default(UNCONFIGURED)
  permissions        Json?
  lastCheckedAt      DateTime?
  lastError          Json?
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt
}
```

## API contracts
Readiness response:

```ts
{
  graphApiVersion: "v25.0",
  sdkVersion: "...",
  token: { valid: true, expiresAt: "..." },
  assets: {
    business: { ok: true },
    catalog: { ok: true },
    dataset: { ok: true },
    page: { ok: true },
    adAccount: { ok: true }
  },
  permissions: [...],
  warnings: [...]
}
```

No token value returned।

## Resolver logic
- Environment is bootstrap only.
- Secret manager/token reference is source of truth where available.
- Asset IDs verified through API, not presence-only.
- Version policy evaluates current configured version, release date, expiry date and regression-test status.

## Validation rules
Current project action:

```text
configured: v24.0
latest official: v25.0
v24 listed expiration: 6 October 2026
```

Required:

1. add v25 staging regression suite
2. verify SDK support
3. pin upgraded SDK
4. switch staging
5. run catalog/CAPI/lead/insights tests
6. production rollout
7. rollback plan

Other rules:

- required IDs format
- access token non-empty
- token/app association
- Page token used for Lead retrieval where required
- unsupported/expired version blocked

## Security rules
- Tokens encrypted or external secret manager।
- App secret server-only।
- Support `appsecret_proof` for secure server calls। `[M17]`
- Token rotation without deploy।
- Least privilege permissions।
- No token in queue payload, DB response logs বা client bundle।

## Background workers
```text
META_TOKEN_HEALTH_DAILY
META_PERMISSION_HEALTH_DAILY
META_ASSET_HEALTH_DAILY
META_API_VERSION_WEEKLY
```

Urgent alerts:

- token invalid
- token near expiry
- asset inaccessible
- required permission removed
- API version within 90/30/7 days of expiry

## Admin UI
Connection cards:

- API version and expiry
- SDK version
- token state
- permissions
- catalog/dataset/page/ad account health
- last successful call
- recheck
- rotate token workflow
- version upgrade checklist

## Testing
- missing token
- invalid token
- app mismatch
- missing permission
- wrong asset
- expired API version
- appsecret proof
- secret redaction
- v24/v25 adapter regression

## Acceptance criteria
- Presence-only readiness removed।
- Every asset verified via API।
- API version upgrade date tracked।
- Token never exposed।
- v25 controlled upgrade completed before v24 expiry or documented supported alternative।

## Meta compatibility notes
Meta’s official changelog lists v25.0 as the latest Graph API release and publishes version expiration dates. Marketing API capabilities require proper authorization and permissions. `[M1][M14]`

# Phase 8 — Lead Ads Webhook, Retrieval & CRM
## Objective
Lead Ads notification securely receive করে full lead retrieve, normalize, deduplicate, assign এবং CRM lifecycle track করা।

## Business outcome
Lead response time কমবে; campaign/ad/form থেকে order conversion measure করা যাবে।

## Directory structure
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

## Files
Refactor/extend:

```text
lib/meta-business/leads.ts
prisma/schema.prisma
Meta webhook route
admin lead pages
```

## Prisma schema
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

## API contracts
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

## Resolver logic
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

## Validation rules
- expected object/entry/change structure
- leadgen ID required
- Page/form ownership
- field mapping schema
- phone/email normalization
- duplicate event key
- lead retrieval freshness

## Security rules
- verify token on GET
- `X-Hub-Signature-256` verification where applicable
- replay/duplicate guard
- payload size limit
- fast response
- raw lead data encrypted/restricted
- retention policy
- Page token server-only

## Background workers
```text
META_LEAD_FETCH
META_LEAD_RETRY
META_LEAD_ASSIGN
META_LEAD_SLA_ALERT
META_LEAD_RETENTION
```

Graph retrieval failure retries; invalid/deleted lead permanent state হবে।

## Admin UI
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

## Testing
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

## Acceptance criteria
- Test Lead appears end-to-end।
- Invalid signature rejected।
- Duplicate lead not created।
- Campaign/ad/form IDs preserved।
- CRM assignment and conversion fields operational।

## Meta compatibility notes
Meta Lead Ads webhooks provide real-time change notifications; full lead data retrieval requires appropriate Page/access permissions and Graph calls. `[M12][M13]`

# Phase 9 — Admin Meta Operations Center

> **Phase-09 implementation loop status (18 July 2026):** `PARTIAL`. Unified operations dashboard, typed approval/audit persistence, exact-payload two-person gates for replay/cancel, final-state display helpers and redacted admin APIs are implemented. Prisma generation/migration runtime proof, remaining Meta write-route audit adoption and Phase-10 Catalog Diagnostics remain open.
## Objective
Catalog, events, leads, connections, jobs, diagnostics এবং attribution এক secure admin control plane-এ আনা।

## Business outcome
Developer ছাড়া operations team সমস্যা identify, inspect, retry এবং approve করতে পারবে।

## Directory structure
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

## Files
- server components/loaders
- protected admin route handlers
- tables/filters
- redacted JSON viewer
- action confirmation dialogs
- permission policy
- audit logger

## Prisma schema
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

## API contracts
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

## Resolver logic
Overview health derives from source records, not manually stored flags:

```text
catalog health
= active items - failed items - diagnostics blockers

CAPI health
= success rate + oldest pending + Purchase coverage

connection health
= token + permission + assets + version
```

## Validation rules
- pagination bounds
- allowlisted filters/sorts
- action-specific payload schema
- confirmation token for dangerous actions
- stale resource version check
- reason required for destructive/financial action

## Security rules
- admin RBAC
- MFA/high privilege recommended
- CSRF protection
- PII redaction
- immutable audit
- no tokens in UI
- download/export authorization
- bulk action limits

## Background workers
UI only enqueues jobs. Polling/SSE/WebSocket may update status, but browser never runs Meta mutation directly।

## Admin UI
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

## Testing
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

## Acceptance criteria
- Non-technical admin failure reason বুঝতে পারে।
- Dangerous action approval ছাড়া চলে না।
- Every mutation audited।
- No secret/PII leak।
- Source-of-truth statuses reflect final Meta result।

## Meta compatibility notes
Meta asynchronous batch and diagnostics outputs must be represented as submitted/pending/final states; submission acceptance alone must not be shown as final success। `[M4][M7]`

# Phase 10 — Observability, Diagnostics & Alerting
## Objective
Catalog, CAPI, queue, webhook, connection এবং ads operations-এর জন্য structured logs, metrics, traces এবং alerts তৈরি করা।

## Business outcome
Revenue-impacting outage customer report-এর আগে detect হবে; root-cause analysis দ্রুত হবে।

## Directory structure
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

## Files
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

## Prisma schema
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

## API contracts
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

## Resolver logic
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

## Validation rules
- mandatory structured fields
- bounded payload sizes
- known severity
- no uncontrolled exception serialization
- timestamps UTC
- metrics labels low-cardinality

## Security rules
- token/PII redaction
- stack trace restricted
- metrics/health auth
- webhook payload not copied to general logs
- incident exports restricted

## Background workers
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

## Admin UI
- incident inbox
- severity/status
- correlation timeline
- diagnostics by item
- alert acknowledgement
- runbook link
- historical trend

## Testing
- secret redaction
- PII redaction
- stuck batch alert
- zero Purchase alert
- rate spike
- incident dedup
- mass delete circuit
- metric cardinality

## Acceptance criteria
- Critical failures alert within defined SLA।
- Every batch/event/job traceable।
- Catalog Diagnostics imported।
- Logs contain no secrets/PII।
- Alert noise controlled through dedup/cooldown।

## Meta compatibility notes
Meta Catalog Diagnostics exposes catalog issue information useful for health dashboards; API/rate-limit errors must retain Meta trace/error codes in redacted form. `[M7][M20]`

# Phase 11 — First-Party Attribution & Growth Analytics
## Objective
UTM, Meta click/browser identifiers, sessions, leads, orders এবং product funnel-কে first-party attribution model-এ যুক্ত করা।

## Business outcome
Campaign/product অনুযায়ী revenue, CAC এবং funnel drop-off বোঝা যাবে; Meta-reported attribution-এর বাইরে internal view পাওয়া যাবে।

## Directory structure
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

## Files
Integrate:

```text
lib/tracking/order-attribution.ts
lib/tracking/campaigns.ts
AttributionCookieCapture.tsx
checkout/order creation
lead conversion flow
admin reports
```

## Prisma schema
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

## API contracts
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

## Resolver logic
- first-touch: first valid marketing touch, immutable
- last-touch: latest eligible touch before conversion
- direct traffic policy documented
- lead conversion inherits lead attribution
- order conversion snapshots current attribution
- multi-device identity only when legitimately linked

## Validation rules
- URL/query size bounds
- sanitize landing URL
- UTM normalization
- identifier format/length
- session uniqueness
- no overwrite of immutable first-touch
- no backdating beyond policy

## Security rules
- Consent-aware cookie/identifier capture
- no sensitive query strings
- retention policy
- role-restricted customer-level reports
- aggregate export preferred

## Background workers
```text
ATTRIBUTION_DAILY_AGGREGATE
ATTRIBUTION_ORDER_BACKFILL
ATTRIBUTION_LEAD_CONVERSION_LINK
ATTRIBUTION_DATA_QUALITY
```

## Admin UI
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

## Testing
- first touch immutability
- last touch update
- direct visit
- cross-session order
- lead-to-order
- missing fbp/fbc
- duplicate capture
- consent denial

## Acceptance criteria
- Order and lead attribution reproducible।
- Meta and first-party reports separately labelled।
- No silent overwrite of first touch।
- Coverage/data-quality metrics visible।

## Meta compatibility notes
`_fbp` and `_fbc` can be sent with server events as browser/click identifiers, but first-party attribution and Meta attribution are different measurement models and must not be presented as identical. `[M8][M11]`

# Phase 12 — Product Sets, Categories & Merchandising Segmentation
## Objective
Catalog data quality-এর উপর ভিত্তি করে deterministic product sets এবং optional Shop collections তৈরি করা।

## Business outcome
Campaign targeting, catalog ads, merchandising এবং seasonal promotion দ্রুত চালানো যাবে।

## Directory structure
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

## Files
- product set API client
- local membership evaluator
- sync worker
- admin rule builder
- product category mapper

## Prisma schema
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

## API contracts
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

## Resolver logic
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

## Validation rules
- non-empty name
- allowed fields/operators
- bounded rule depth
- valid currency thresholds
- no broken category reference
- empty set warning
- all-products set explicit confirmation

## Security rules
- RBAC for rule changes
- remote set deletion confirmation
- audit before/after
- no arbitrary JSON passed directly to Meta without allowlist

## Background workers
- sync after successful catalog update
- nightly membership verification
- empty/broken set alert
- optional collection sync

## Admin UI
- set list
- rule builder
- membership preview
- item sample
- sync status/error
- associated campaign reference

## Testing
- each rule operator
- empty filter
- sale start/end
- stock changes
- category changes
- remote partial failure
- idempotent update

## Acceptance criteria
- Product sets deterministic।
- Membership preview matches synchronized result।
- Empty/broken sets alerted।
- Rule mutations audited।

## Meta compatibility notes
Meta Product Catalog Product Sets use JSON-encoded filter rules; an empty filter can represent all catalog items. Product categories can improve discovery/classification. `[M16][M21]`

# Phase 13 — Ads Insights & Approval-Based Automation
## Objective
Marketing API থেকে read-only performance insights ingest করা এবং পরে strictly approval-based ad mutations enable করা।

## Business outcome
Spend, CTR, CPC, purchases এবং ROAS এক dashboard-এ দেখা যাবে; optimization suggestions human control-এর অধীনে থাকবে।

## Directory structure
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

## Files
- ad account/campaign/ad set/ad readers
- async insights jobs
- recommendation engine
- approval API
- mutation executor
- rollback metadata

## Prisma schema
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

## API contracts
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

## Resolver logic
- Normalize time zone and attribution windows.
- Store source metric definitions.
- Recommendation requires minimum data volume/confidence.
- Before execution, refetch resource and compare stale state.

## Validation rules
- valid ad account/resource ownership
- allowed fields only
- budget min/max and daily change cap
- approval not expired
- suggestion evidence still current
- campaign objective compatibility
- no automatic write from recommendation worker

## Security rules
- `ads_read` for insight-only path; mutation permissions separated।
- Least privilege tokens।
- Dual approval optional for high budget।
- Immutable before/after audit।
- Emergency kill switch।

## Background workers
```text
META_ADS_INSIGHTS_DAILY
META_ADS_INSIGHTS_HOURLY_SUMMARY
META_ADS_RECOMMENDATIONS
META_ADS_APPROVED_MUTATION
```

Rate-limit-aware async insights fetching required for large ranges।

## Admin UI
- performance dashboard
- campaign/ad set/ad drill-down
- trend and anomaly
- recommendation inbox
- evidence
- approve/reject
- mutation history
- rollback information

## Testing
- ads_read permission missing
- pagination
- async insights
- rate limit
- stale suggestion
- unauthorized approval
- budget cap
- mutation failure
- audit/rollback metadata

## Acceptance criteria
- Read-only dashboard stable before writes enabled।
- No mutation without explicit valid approval।
- Budget safety caps enforced।
- Every write has before/after audit।

## Meta compatibility notes
The Marketing API provides endpoints for advertising objects and Ads Insights; Insights access requires appropriate authorization such as `ads_read`. Rate limits and metric semantics must be respected. `[M14][M15][M20]`

# Phase 14 — Instagram Messaging & Social CRM Expansion
## Objective
Instagram Professional account messaging, comments/private replies এবং product inquiries-কে secure CRM/support workflow-এ integrate করা।

## Business outcome
Social inquiries দ্রুত respond হবে; conversation-to-lead/order conversion track করা যাবে।

## Directory structure
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

## Files
- Instagram webhook handler
- conversation/message repository
- media downloader
- assignment/notification
- reply API client where permitted
- admin inbox

## Prisma schema
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

## API contracts
- Webhook ingest
- conversation list/detail
- assignment
- tags/status
- reply/send only within supported policy/permission
- private reply flow where supported

All platform IDs preserved।

## Resolver logic
- Instagram-scoped participant ID → conversation
- participant → existing customer/lead by verified link, not unsafe fuzzy match alone
- product inquiry can create lead with source metadata
- duplicate message ID ignored

## Validation rules
- supported webhook event
- message/conversation ID required
- attachment type/size
- account ownership
- reply eligibility/window
- idempotency

## Security rules
- webhook signature
- RBAC
- message retention
- attachment malware/type validation
- signed/private media handling
- user profile access limited
- App Review/permissions verified before feature enable

## Background workers
- webhook processing
- media fetch
- profile enrichment
- assignment
- notifications
- retention cleanup

## Admin UI
- inbox
- assignment
- tags
- customer/lead link
- product context
- attachments
- reply status
- audit history

## Testing
- webhook verification/signature
- duplicate message
- text/media
- private reply eligibility
- account mismatch
- permission failure
- assignment
- retention

## Acceptance criteria
- Messages securely ingested and deduplicated।
- Account/permission checks pass।
- Customer/lead linking auditable।
- Replies only when platform policy permits।

## Meta compatibility notes
Instagram Messaging APIs and webhooks are designed for supported Instagram Professional account use cases and may require App Review and relevant permissions. `[M18][M19]`

# Phase 15 — Testing, CI, Migration & Release Governance
## Objective
Schema, catalog payload, tracking, CAPI, webhooks, permissions এবং admin actions-এর regressions production deployment-এর আগে block করা।

## Business outcome
Campaign outage, stale catalog, duplicate Purchase, privacy leak এবং unsafe ad mutation-এর risk কমবে।

## Directory structure
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

## Files
Existing audits remain, but token/string-presence tests-এর সঙ্গে executable semantic tests যোগ হবে:

```text
scripts/meta-business-platform-audit.mjs
scripts/meta-catalog-semantic-audit.mjs
scripts/tracking-phase12-capi-schema-audit.mjs
```

New tests must import and execute real resolvers/adapters where possible।

## Prisma schema
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

## API contracts
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

## Resolver logic
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

## Validation rules
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

## Security rules
- No real production tokens in CI।
- Secret scanner।
- PII fixture synthetic।
- webhook signature tests।
- SSRF/link validation tests।
- RBAC/CSRF tests।
- dependency audit and exact lockfile।

## Background workers
Worker tests use fake clock and isolated Redis/Postgres:

- retry schedule
- stalled recovery
- lock contention
- DLQ
- outbox dispatch
- batch polling
- lead fetch
- retention cleanup

## Admin UI
E2E:

- connection readiness
- catalog dry run
- failed item retry
- mass delete approval
- event retry
- lead assignment
- alert acknowledgement
- ad recommendation approve/reject

## Testing
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

## Acceptance criteria
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

## Release 0 — Baseline proof

1. Run `npm ci`
2. Run `npx prisma generate`
3. Run `npx prisma validate`
4. Run `npm run typecheck`
5. Run existing Meta audits
6. Record current failures as baseline

## Release 1 — P0 Catalog and Identity

```text
Phase 1
→ Phase 2
→ Phase 3
```

Mandatory before main catalog campaign scaling:

- raw DB IDs removed
- `/items_batch` fields corrected
- backorder corrected
- effective sale range added
- variant schema migration
- environment drift gate

## Release 2 — Reliable CAPI

```text
Phase 4
→ Phase 5
→ Phase 6
```

Mandatory before relying on Purchase optimization:

- transactional outbox
- deduplication proof
- required CAPI web fields
- consent policy
- persistent retry

## Release 3 — Connection, Leads and Operations

```text
Phase 7
→ Phase 8
→ Phase 9
```

## Release 4 — Monitoring and Growth

```text
Phase 10
→ Phase 11
→ Phase 12
```

## Release 5 — Advanced Platform

```text
Phase 13
→ Phase 14
→ Phase 15
```

---

# Immediate P0 File Checklist

```text
.env.example
config/env.manifest.json
prisma/schema.prisma
lib/meta-business/catalog.ts
lib/tracking/meta-content-id.ts
lib/tracking/events.ts
app/api/search/clicks/route.ts
lib/queue/metaCapiQueue.ts
lib/workers/metaCapiWorker.ts
lib/tracking/meta-capi-core-event.ts
```

---

# Definition of Final Production Readiness

System production-ready তখনই হবে যখন:

- Website, Pixel, CAPI এবং Catalog একই SKU identity ব্যবহার করে
- `/items_batch` current write field contract ব্যবহার করে
- Product/Variant schema lifecycle এবং sale data support করে
- availability/quantity deterministic
- future/expired sale exact
- stale item safely reconciled
- browser/server events same event ID দিয়ে deduplicate হয়
- DB transactional outbox event loss prevent করে
- CAPI required website fields এবং age gate enforce হয়
- consent/PII policy audited
- Meta tokens/assets/API version continuously monitored
- Lead Ads secure CRM flow চালায়
- admin safely inspect/retry/approve করতে পারে
- diagnostics/alerts available
- attribution reports clearly labelled
- ads mutation approval ছাড়া হয় না
- CI Meta contract regression block করে

---

# Official Meta Verification Source Register

The following official Meta for Developers sources were checked for this audit.

- **[M1] Graph API Versions / Changelog**  
  https://developers.facebook.com/docs/graph-api/changelog/versions/

- **[M2] Catalog Fields**  
  https://developers.facebook.com/documentation/ads-commerce/commerce-platform/catalog/fields

- **[M3] Quantity to Sell**  
  https://developers.facebook.com/documentation/ads-commerce/commerce-platform/catalog/quantity-to-sell

- **[M4] Product Catalog Items Batch**  
  https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/items_batch

- **[M5] Migrate to `/items_batch`**  
  https://developers.facebook.com/documentation/ads-commerce/catalog/guides/manage-catalog-items/catalog-batch-api/migrate-to-items-batch

- **[M6] Catalog Reference / Variants**  
  https://developers.facebook.com/documentation/ads-commerce/catalog/reference

- **[M7] Catalog Overview / Diagnostics**  
  https://developers.facebook.com/documentation/ads-commerce/commerce-platform/catalog/overview

- **[M8] Conversions API Parameters**  
  https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters

- **[M9] Conversions API — Using the API**  
  https://developers.facebook.com/documentation/ads-commerce/conversions-api/using-the-api

- **[M10] Pixel and Server Event Deduplication**  
  https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events

- **[M11] Customer Information Parameters**  
  https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters

- **[M12] Webhooks for Lead Ads**  
  https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-leadgen/

- **[M13] Retrieving Lead Ads Data**  
  https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving

- **[M14] Marketing API**  
  https://developers.facebook.com/documentation/ads-commerce/marketing-api

- **[M15] Ads Insights API**  
  https://developers.facebook.com/documentation/ads-commerce/marketing-api/insights

- **[M16] Product Catalog Product Sets**  
  https://developers.facebook.com/documentation/ads-commerce/marketing-api/reference/product-catalog/product_sets

- **[M17] Secure Graph API Requests / App Secret Proof**  
  https://developers.facebook.com/docs/graph-api/guides/secure-requests/

- **[M18] Instagram Messaging Overview**  
  https://developers.facebook.com/documentation/business-messaging/instagram-messaging/overview

- **[M19] Instagram Messaging Webhooks**  
  https://developers.facebook.com/documentation/business-messaging/instagram-messaging/webhooks

- **[M20] Marketing API Rate Limiting**  
  https://developers.facebook.com/documentation/ads-commerce/marketing-api/overview/rate-limiting

- **[M21] Catalog Product Categories**  
  https://developers.facebook.com/documentation/ads-commerce/commerce-platform/catalog/categories

---

# Final Audit Sign-off

## Verified

- 15 phases present
- Every phase contains all 14 required headings in the requested order
- Patch v2 and addendum incorporated
- Environment drift check incorporated
- Current V4 code gaps incorporated
- Adapter-specific catalog field correction incorporated
- CAPI required website fields incorporated
- Graph API version policy incorporated
- Security, workers, admin UI, tests and acceptance criteria expanded
- Official Meta source register included

## Important limitation

এই specification official Meta documentation এবং uploaded V4 source snapshot-এর static audit-এর উপর ভিত্তি করে। Live Meta Business account permissions, actual Catalog diagnostics, Events Manager Test Events, App Review status এবং production API responses project environment/account-এ runtime verification করতে হবে।
