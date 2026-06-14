# SEO/Product Import Update Plan

Source JSON checked: `C:\Users\Administrator\Downloads\tovch_seo_updated_production_ready.json`

## Quick Finding

`prisma/schema.prisma` and `lib/admin-products.ts` already have most of the database and admin-create/update support. The missing work is mostly in the import UI, public product API responses, product detail UI, search/Elasticsearch transformer, and JSON text encoding cleanup.

Important: the JSON currently contains broken encoded text such as `Ã—`, `â€“`, `â€”`, `à¦...`. Importing it as-is will save broken Bangla and symbols. Fix the JSON encoding first or add a small normalization step before saving.

## Already Done

### `prisma/schema.prisma`

Around lines `270-366`, the `Product` model already contains:

- Existing SEO: `metaTitle`, `metaDescription`, `metaKeywords`, `bengaliName`, `bengaliDescription`, `focusKeyword`, `secondaryKeywords`, `ogTitle`, `ogDescription`, `canonicalUrl`
- Semantic SEO: `searchIntent`, `targetAudience`, `primaryConcern`, `keyBenefits`, `buyingIntentKeywords`, `searchTags`, `synonyms`, `banglaSearchTerms`, `reviewKeywords`, `entities`
- Structured content: `descriptionSections`, `productSpecs`, `productAttributes`, `shadeOptions`, `usageInstructions`, `imageAltTexts`, `faqSchemaReady`, `gender`
- Commerce/shipping: `shippingWeight`, `isFragile`, `flashSaleEligible`, `returnEligible`, `codAvailable`, `preOrderOption`, `faqs`

No schema field is missing for the provided JSON except there is no dedicated `urlSlug` DB column. That is okay because `urlSlug` maps to `Product.slug`.

### `lib/admin-products.ts`

Already supports create/update for most JSON fields:

- `product_specs` maps to `productSpecs`: around lines `943-945` and `1143-1145`
- `attributes` maps to `productAttributes`: around lines `945-946` and `1146-1148`
- `urlSlug` maps to `slug`: around lines `889` and `1038`
- variants import works with `size`, `shade`, `price`, `stock`, `sku`: around lines `984-996` and `1230-1244`
- semantic fields are saved on create/update: around lines `933-951` and `1116-1157`
- FAQs are saved: around lines `973` and `1188-1190`

One small improvement is still needed here: `ProductVariantPayload` does not define `attributes`, although the import page sends it. Either remove `attributes` from the import payload or add support in `buildVariantAttributes`.

## Must Update 1: Import Page

File: `app/admin/products/import/page.tsx`

Reason: The TOVCH JSON has many fields that are stored by backend but the import page does not parse, review, or submit yet.

### 1.1 Add fields to `ImportData`

Around line `31`, inside `interface ImportData`, add these fields after `secondaryKeywords` / SEO fields:

```ts
  bengaliSecondaryKeywords: string[];
  buyingIntentKeywords: string[];
  searchTags: string[];
  synonyms: string[];
  banglaSearchTerms: string[];
  reviewKeywords: string[];
  entities: string[];
  searchIntent: string;
  targetAudience: string;
  primaryConcern: string;
  keyBenefits: string[];
  productSpecs: Record<string, unknown> | null;
  productAttributes: Record<string, unknown> | null;
  shadeOptions: Array<Record<string, unknown>>;
  usageInstructions: string[];
  imageAltTexts: string[];
  descriptionSections: Array<{
    heading: string;
    points: string[];
  }>;
  faqSchemaReady: boolean;
  gender: string;
```

### 1.2 Change variant type to support shade

Around lines `18-24`, replace:

```ts
interface ImportVariant {
  size: string;
  color: string;
  price: string;
  stock: string;
  sku: string;
}
```

With:

```ts
interface ImportVariant {
  size: string;
  color: string;
  shade: string;
  price: string;
  stock: string;
  sku: string;
}
```

### 1.3 Add parser helpers before `normalizeImportData`

Add before line `101`:

```ts
function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
```

### 1.4 Update `normalizeImportData`

Around lines `111-121`, change variant mapping from:

```ts
size:  String(v.size  || ''),
color: String(v.color || ''),
```

To:

```ts
size:  String(v.size || ''),
color: String(v.color || v.shade || ''),
shade: String(v.shade || v.color || ''),
```

Around line `132`, after `secondaryKeywords`, add:

```ts
    bengaliSecondaryKeywords: asStringArray(p.bengaliSecondaryKeywords),
    buyingIntentKeywords: asStringArray(p.buyingIntentKeywords),
    searchTags: asStringArray(p.searchTags),
    synonyms: asStringArray(p.synonyms),
    banglaSearchTerms: asStringArray(p.banglaSearchTerms),
    reviewKeywords: asStringArray(p.reviewKeywords),
    entities: asStringArray(p.entities),
    searchIntent: String(p.searchIntent || ''),
    targetAudience: String(p.targetAudience || ''),
    primaryConcern: String(p.primaryConcern || ''),
    keyBenefits: asStringArray(p.keyBenefits),
    productSpecs: asRecord(p.productSpecs) || asRecord(p.product_specs),
    productAttributes: asRecord(p.productAttributes) || asRecord(p.attributes),
    shadeOptions: Array.isArray(p.shadeOptions) ? p.shadeOptions as Array<Record<string, unknown>> : [],
    usageInstructions: asStringArray(p.usageInstructions),
    imageAltTexts: asStringArray(p.imageAltTexts),
    descriptionSections: Array.isArray(p.descriptionSections)
      ? (p.descriptionSections as Array<Record<string, unknown>>).map((section) => ({
          heading: String(section.heading || ''),
          points: asStringArray(section.points),
        })).filter((section) => section.heading || section.points.length > 0)
      : [],
    faqSchemaReady: Boolean(p.faqSchemaReady),
    gender: String(p.gender || ''),
```

### 1.5 Submit all new fields to backend

Around lines `294-322`, in the `json` payload, add these fields:

```ts
          gender: importData.gender || undefined,
          searchIntent: importData.searchIntent || undefined,
          targetAudience: importData.targetAudience || undefined,
          primaryConcern: importData.primaryConcern || undefined,
          keyBenefits: importData.keyBenefits.length > 0 ? importData.keyBenefits : undefined,
          buyingIntentKeywords: importData.buyingIntentKeywords.length > 0 ? importData.buyingIntentKeywords : undefined,
          searchTags: importData.searchTags.length > 0 ? importData.searchTags : undefined,
          synonyms: importData.synonyms.length > 0 ? importData.synonyms : undefined,
          banglaSearchTerms: importData.banglaSearchTerms.length > 0 ? importData.banglaSearchTerms : undefined,
          reviewKeywords: importData.reviewKeywords.length > 0 ? importData.reviewKeywords : undefined,
          entities: importData.entities.length > 0 ? importData.entities : undefined,
          bengaliSecondaryKeywords: importData.bengaliSecondaryKeywords.length > 0 ? importData.bengaliSecondaryKeywords : undefined,
          productSpecs: importData.productSpecs || undefined,
          productAttributes: importData.productAttributes || undefined,
          shadeOptions: importData.shadeOptions.length > 0 ? importData.shadeOptions : undefined,
          usageInstructions: importData.usageInstructions.length > 0 ? importData.usageInstructions : undefined,
          imageAltTexts: importData.imageAltTexts.length > 0 ? importData.imageAltTexts : undefined,
          descriptionSections: importData.descriptionSections.length > 0 ? importData.descriptionSections : undefined,
          faqSchemaReady: importData.faqSchemaReady,
```

Also update variants around lines `286-293`:

```ts
          variants: importData.variants.map((v) => ({
            size: v.size,
            color: v.color,
            shade: v.shade,
            price: parseFloat(v.price) || basePrice,
            stock: parseInt(v.stock) || 0,
            sku: v.sku,
          })),
```

Delete the current nested `attributes` inside variant payload unless backend explicitly supports it.

### 1.6 Add review UI sections

Around line `180`, change expanded sections:

```ts
basic: true, variants: true, seo: false, semantic: false, content: false, shipping: false, options: false, faqs: false,
```

After the SEO section ending around line `753`, add two new sections:

- `semantic`: show/edit `searchIntent`, `targetAudience`, `primaryConcern`, `keyBenefits`, `buyingIntentKeywords`, `searchTags`, `synonyms`, `banglaSearchTerms`, `reviewKeywords`, `entities`
- `content`: show/edit `productSpecs`, `productAttributes`, `shadeOptions`, `usageInstructions`, `imageAltTexts`, `descriptionSections`

Minimum simple UI: use comma-separated text inputs for arrays and JSON textareas for object/array fields.

## Must Update 2: Public Product API

### `app/api/products/[id]/route.ts`

Reason: Product detail page fetches this endpoint, but it does not return most new fields.

Around lines `146-173`, inside `product: { ... }`, add:

```ts
        metaKeywords: product.metaKeywords || '',
        tags: product.metaKeywords || '',
        bengaliName: product.bengaliName || '',
        bengaliDescription: product.bengaliDescription || '',
        focusKeyword: product.focusKeyword || '',
        secondaryKeywords: product.secondaryKeywords || [],
        bengaliFocusKeyword: product.bengaliFocusKeyword || '',
        bengaliSecondaryKeywords: product.bengaliSecondaryKeywords || [],
        ogDescription: product.ogDescription || '',
        canonicalUrl: product.canonicalUrl || '',
        searchIntent: product.searchIntent || '',
        targetAudience: product.targetAudience || '',
        primaryConcern: product.primaryConcern || '',
        keyBenefits: product.keyBenefits || [],
        buyingIntentKeywords: product.buyingIntentKeywords || [],
        searchTags: product.searchTags || [],
        synonyms: product.synonyms || [],
        banglaSearchTerms: product.banglaSearchTerms || [],
        reviewKeywords: product.reviewKeywords || [],
        entities: product.entities || [],
        descriptionSections: product.descriptionSections || [],
        productSpecs: product.productSpecs || null,
        productAttributes: product.productAttributes || null,
        shadeOptions: product.shadeOptions || null,
        usageInstructions: product.usageInstructions || [],
        imageAltTexts: product.imageAltTexts || [],
        faqSchemaReady: product.faqSchemaReady,
        gender: product.gender || '',
        faqs: Array.isArray(product.faqs) ? product.faqs : [],
```

### `app/api/products/route.ts`

Reason: shop/search cards can benefit from richer keyword and tag data. It currently returns old SEO only around lines `183-192`.

Around lines `183-192`, add:

```ts
        secondaryKeywords: product.secondaryKeywords || [],
        bengaliFocusKeyword: product.bengaliFocusKeyword || '',
        bengaliSecondaryKeywords: product.bengaliSecondaryKeywords || [],
        ogDescription: product.ogDescription || '',
        searchIntent: product.searchIntent || '',
        targetAudience: product.targetAudience || '',
        primaryConcern: product.primaryConcern || '',
        keyBenefits: product.keyBenefits || [],
        buyingIntentKeywords: product.buyingIntentKeywords || [],
        searchTags: product.searchTags || [],
        synonyms: product.synonyms || [],
        banglaSearchTerms: product.banglaSearchTerms || [],
        reviewKeywords: product.reviewKeywords || [],
        entities: product.entities || [],
        imageAltTexts: product.imageAltTexts || [],
```

Also update the search filter around lines `84-92` to include:

```ts
        { metaTitle: { contains: search, mode: 'insensitive' } },
        { metaDescription: { contains: search, mode: 'insensitive' } },
        { metaKeywords: { contains: search, mode: 'insensitive' } },
        { focusKeyword: { contains: search, mode: 'insensitive' } },
        { searchTags: { has: search } },
        { synonyms: { has: search } },
        { banglaSearchTerms: { has: search } },
```

Note: `has` is exact array match. For partial matching, use Elasticsearch instead.

## Must Update 3: Product Detail Page Metadata

File: `app/products/[id]/page.tsx`

### 3.1 Improve keywords

Around lines `53-60`, replace the keyword builder with:

```ts
  const keywordParts: string[] = [];
  if (product.focusKeyword) keywordParts.push(product.focusKeyword);
  if (Array.isArray(product.secondaryKeywords)) keywordParts.push(...product.secondaryKeywords);
  if (product.bengaliFocusKeyword) keywordParts.push(product.bengaliFocusKeyword);
  if (Array.isArray(product.bengaliSecondaryKeywords)) keywordParts.push(...product.bengaliSecondaryKeywords);
  if (Array.isArray(product.searchTags)) keywordParts.push(...product.searchTags);
  if (Array.isArray(product.synonyms)) keywordParts.push(...product.synonyms);
  if (Array.isArray(product.banglaSearchTerms)) keywordParts.push(...product.banglaSearchTerms);
  if (Array.isArray(product.reviewKeywords)) keywordParts.push(...product.reviewKeywords);
  if (Array.isArray(product.entities)) keywordParts.push(...product.entities);
  if (product.tags) keywordParts.push(...product.tags.split(',').map((t: string) => t.trim()));
  if (product.bengaliName) keywordParts.push(product.bengaliName);
  if (product.category) keywordParts.push(`${product.category} bangladesh`);
  if (product.brand) keywordParts.push(`${product.brand} bangladesh`);
```

### 3.2 Use `ogDescription`

Around lines `47-52`, change description handling:

```ts
  const description = product.metaDescription || product.shortDescription || '';
  const ogDescription = product.ogDescription || description;
```

Then use `ogDescription` in `openGraph.description` and `twitter.description`.

### 3.3 Add more schema fields

Inside `buildProductSchema`, around lines `100-160`, add optional schema fields:

```ts
  if (product.category) schema.category = product.category;
  if (product.gtin) schema.gtin13 = product.gtin;
  if (product.productSpecs) schema.additionalProperty = Object.entries(product.productSpecs as Record<string, unknown>).map(([name, value]) => ({
    '@type': 'PropertyValue',
    name,
    value: String(value),
  }));
```

## Must Update 4: Product Detail UI

File: `app/products/[id]/components/ProductClient.tsx`

Reason: new content is stored but not visible on product page.

### 4.1 Extend product prop type

Around lines `91-116`, add:

```ts
    productSpecs?: Record<string, unknown> | null;
    productAttributes?: Record<string, unknown> | null;
    shadeOptions?: Array<{ shadeCode?: string; shadeName?: string }> | null;
    usageInstructions?: string[];
    descriptionSections?: Array<{ heading: string; points: string[] }>;
    keyBenefits?: string[];
    primaryConcern?: string;
    targetAudience?: string;
    faqs?: Array<{ question: string; answer: string }>;
```

### 4.2 Render imported SEO/detail content

After the description block around lines `488-499`, add UI blocks for:

- `keyBenefits`: bullet list
- `descriptionSections`: heading + points
- `usageInstructions`: ordered list
- `productSpecs`: table/grid
- `shadeOptions`: shade code/name chips
- `faqs`: visible FAQ accordion/list

Minimum placement: add these before the ingredients accordion.

## Must Update 5: Elasticsearch/Search Index

File: `lib/search/productTransformer.ts`

Reason: current ES document ignores the new SEO/search fields. Search will not rank TOVCH terms like `tovch shade chart`, Bangla terms, synonyms, buying intent keywords, etc.

### 5.1 Extend `ProductWithRelations`

Around line `20`, add:

```ts
  focusKeyword?: string | null;
  secondaryKeywords?: string[];
  bengaliFocusKeyword?: string | null;
  bengaliSecondaryKeywords?: string[];
  searchTags?: string[];
  synonyms?: string[];
  banglaSearchTerms?: string[];
  buyingIntentKeywords?: string[];
  reviewKeywords?: string[];
  entities?: string[];
  keyBenefits?: string[];
  ingredients?: string | null;
  flashSaleEligible?: boolean;
```

### 5.2 Extend ES document

Around line `40`, add:

```ts
  focusKeyword: string;
  secondaryKeywords: string[];
  searchTags: string[];
  synonyms: string[];
  banglaSearchTerms: string[];
  buyingIntentKeywords: string[];
  reviewKeywords: string[];
  entities: string[];
```

### 5.3 Update suggestions

Inside `buildSuggestions`, around lines `77-90`, add inputs from:

```ts
  [
    product.focusKeyword,
    product.bengaliFocusKeyword,
    ...(product.secondaryKeywords || []),
    ...(product.bengaliSecondaryKeywords || []),
    ...(product.searchTags || []),
    ...(product.synonyms || []),
    ...(product.banglaSearchTerms || []),
    ...(product.buyingIntentKeywords || []),
    ...(product.reviewKeywords || []),
    ...(product.entities || []),
  ].filter(Boolean).forEach((value) => inputs.add(String(value)));
```

### 5.4 Update return document

Around lines `148-169`, replace:

```ts
    tags: [],
    ingredients: '',
    isFlashSale: false,
```

With:

```ts
    tags: [
      ...(product.searchTags || []),
      ...(product.secondaryKeywords || []),
      ...(product.synonyms || []),
      ...(product.banglaSearchTerms || []),
      ...(product.buyingIntentKeywords || []),
    ],
    ingredients: product.ingredients || '',
    isFlashSale: product.flashSaleEligible || false,
    focusKeyword: product.focusKeyword || '',
    secondaryKeywords: product.secondaryKeywords || [],
    searchTags: product.searchTags || [],
    synonyms: product.synonyms || [],
    banglaSearchTerms: product.banglaSearchTerms || [],
    buyingIntentKeywords: product.buyingIntentKeywords || [],
    reviewKeywords: product.reviewKeywords || [],
    entities: product.entities || [],
```

### 5.5 Update ES query

File: `app/api/search/route.ts`

Around lines `118-126`, add new fields to `multi_match.fields`:

```ts
            'focusKeyword^4',
            'secondaryKeywords^3',
            'searchTags^3',
            'synonyms^3',
            'banglaSearchTerms^3',
            'buyingIntentKeywords^2.5',
            'reviewKeywords^2',
            'entities^2',
```

## Must Update 6: Admin New/Edit Forms

Files:

- `app/admin/products/new/page.tsx`
- `app/admin/products/[id]/edit/page.tsx`

Reason: detail formatter already returns new fields, but create/edit UI only includes older SEO + FAQ fields.

Add these fields to form type, initial state, load mapping, submit payload, and UI:

- `searchIntent`
- `targetAudience`
- `primaryConcern`
- `keyBenefits`
- `buyingIntentKeywords`
- `searchTags`
- `synonyms`
- `banglaSearchTerms`
- `reviewKeywords`
- `entities`
- `descriptionSections`
- `productSpecs`
- `productAttributes`
- `shadeOptions`
- `usageInstructions`
- `imageAltTexts`
- `faqSchemaReady`
- `gender`

Useful current locations:

- New product form type: around lines `33-98`
- New product initial state: around lines `127-138`
- New product JSON import mapping: around lines `262-304`
- New product submit payload: around lines `509-536`
- New product SEO UI: around lines `1013-1166`
- Edit product form type: around lines `31-90`
- Edit product API type: around lines `120-162`
- Edit product load mapping: around lines `272-304`
- Edit product submit payload: around lines `576-608`
- Edit product SEO UI: around lines `1017-1174`

## Must Update 7: Encoding Cleanup

The project files and JSON show mojibake. Examples:

- `30mlÃ—2` should be `30ml×2`
- `20â€“30` should be `20–30`
- `Bangladeshâ€™s` should be `Bangladesh's`
- `à¦...` should be real Bangla

Recommended options:

1. Best: regenerate/export JSON as UTF-8 correctly.
2. Good: add an import warning if pasted text contains `Ã`, `â`, or `à¦`.
3. Optional: add a manual cleanup helper for common English punctuation replacements before save.

Do not auto-convert Bangla mojibake unless tested, because it can damage valid text.

## Final Import Field Mapping Checklist

This JSON should map as:

- `name` -> `Product.name`
- `sku` -> `Product.sku`
- `price` -> `Product.price`
- `category` -> category lookup
- `subcategory` + `item` -> `Product.subcategory` as `subcategory > item`
- `brand` -> brand lookup/create
- `originCountry` -> `Product.originCountry`
- `gender` -> `Product.gender`
- `featured` -> `Product.isFeatured`
- `stockStatus` -> optional status handling; currently not directly used
- `manageStock` -> should map to `trackInventory` if needed
- `product_specs` -> `Product.productSpecs`
- `attributes` -> `Product.productAttributes`
- `shippingWeight` -> `Product.shippingWeight`
- `description` -> `Product.description`
- `usageInstructions` -> `Product.usageInstructions`
- `weight` -> `Product.weight`; current DB expects number, but JSON has text. This needs either numeric extraction or keep only in specs.
- `ingredients` -> `Product.ingredients`
- `shelfLife` -> `Product.shelfLife`
- `variants` -> `ProductVariant[]`
- `shadeOptions` -> `Product.shadeOptions`
- `searchIntent` -> `Product.searchIntent`
- `targetAudience` -> `Product.targetAudience`
- `primaryConcern` -> `Product.primaryConcern`
- `keyBenefits` -> `Product.keyBenefits`
- `metaTitle` -> `Product.metaTitle`
- `metaDescription` -> `Product.metaDescription`
- `bengaliProductName` -> `Product.bengaliName`
- `bengaliMetaDescription` -> `Product.bengaliDescription`
- `focusKeyword` -> `Product.focusKeyword`
- `secondaryKeywords` -> `Product.secondaryKeywords`
- `bengaliFocusKeyword` -> `Product.bengaliFocusKeyword`
- `bengaliSecondaryKeywords` -> `Product.bengaliSecondaryKeywords`
- `buyingIntentKeywords` -> `Product.buyingIntentKeywords`
- `searchTags` -> `Product.searchTags`
- `synonyms` -> `Product.synonyms`
- `ogTitle` -> `Product.ogTitle`
- `ogDescription` -> `Product.ogDescription`
- `urlSlug` -> `Product.slug`
- `tags` -> `Product.metaKeywords`
- `relatedProducts` -> `Product.relatedProducts`
- `imageAltTexts` -> `Product.imageAltTexts`
- `faqSchemaReady` -> `Product.faqSchemaReady`
- `dimensions` -> `Product.length`, `Product.width`, `Product.height`
- `isFragile` -> `Product.isFragile`
- `flashSaleEligible` -> `Product.flashSaleEligible`
- `lowStockThreshold` -> `Product.lowStockThreshold`
- `returnEligible` -> `Product.returnEligible`
- `codAvailable` -> `Product.codAvailable`
- `preOrderOption` -> `Product.preOrderOption`
- `faqs` -> `Product.faqs`
- `banglaSearchTerms` -> `Product.banglaSearchTerms`
- `reviewKeywords` -> `Product.reviewKeywords`
- `entities` -> `Product.entities`
- `descriptionSections` -> `Product.descriptionSections`

## Priority Order

1. Fix JSON encoding.
2. Update `app/admin/products/import/page.tsx`.
3. Update `app/api/products/[id]/route.ts`.
4. Update `app/products/[id]/page.tsx`.
5. Update `app/products/[id]/components/ProductClient.tsx`.
6. Update `lib/search/productTransformer.ts` and `app/api/search/route.ts`.
7. Update admin new/edit forms.
8. Run Prisma migration/client generation if this database has not already applied `202606100002_add_product_semantic_seo_fields`.
9. Reindex Elasticsearch after products are imported.
