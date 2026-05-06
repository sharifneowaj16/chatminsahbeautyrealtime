# Admin Product Issues - Code Location Map

## File Structure & Issue Locations

```
minsahcodexgpt/
├── app/
│   ├── admin/
│   │   └── products/
│   │       ├── page.tsx                 ❌ Issues: 1.4, 6.1, 6.2, 7.2
│   │       ├── new/
│   │       │   └── page.tsx             ❌ Issues: 1.5, 2.1, 3.2, 5.1-5.3, 7.1
│   │       └── [id]/edit/
│   │           └── page.tsx             ❌ Issues: 1.5, 2.2, 3.3-3.6, 5.1-5.4, 7.1
│   │
│   └── api/
│       ├── products/
│       │   ├── route.ts                 ❌ Issues: 1.1, 1.5, 2.3-2.5, 4.2-4.3
│       │   └── [id]/
│       │       └── route.ts             ❌ Issues: 1.2, 1.3, 4.4-4.5, 6.3
│       │
│       ├── admin/
│       │   └── products/
│       │       └── [id]/
│       │           └── route.ts         ❌ Issues: 1.6
│       │
│       └── upload/
│           └── route.ts (or variant)    ❌ Issues: 1.7, 3.1, 3.4
│
├── contexts/
│   └── AdminAuthContext.tsx             ✅ Used for client-side checks (not sufficient)
│
└── docs/
    ├── api-inventory.md                 📋 API documentation
    ├── api-missing.md                   📋 Missing endpoints
    └── ADMIN_PRODUCT_ISSUES.md          📄 This report
```

---

## Detailed Line-by-Line Issues

### 1. `/app/admin/products/page.tsx`

**Lines 14-46:** Component state & UI setup
- ✅ No issues here

**Lines 69-100:** fetchProducts()
- **Issue 1.5:** Calls `GET /api/products?activeOnly=false` - uses public endpoint
- **Fix:** Change to `GET /api/admin/products`

**Lines 103-112:** handleDeleteProduct()
```typescript
const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });  // ❌ Issue 1.5, 6.1
```
- **Issue 1.5:** Uses public endpoint (not admin)
- **Issue 6.1:** No auth pre-validation
- **Fix:** Change to `/api/admin/products/[id]` and handle 401/403

**Lines 155-165:** handleBulkDelete()
```typescript
for (const productId of selectedProducts) {
  await handleDeleteProduct(productId);  // ❌ Issue 6.2: No transaction
}
```
- **Issue 6.2:** Loop-based deletion, no rollback
- **Fix:** Use batch delete endpoint with transaction

**Lines 414-415:** Delete confirmation
```typescript
if (confirm(`Are you sure...`)) {
  handleDeleteProduct(product.id);
}
```
- **Issue 7.2:** After delete, products list not refreshed
- **Fix:** Call `refreshProducts()` after delete succeeds

---

### 2. `/app/admin/products/new/page.tsx`

**Lines 1-50:** Imports & types setup
- ✅ No issues

**Lines 180-250:** State initialization
- ✅ No critical issues

**Lines 560-590:** Image uploads
```typescript
const uploadedOgImageUrl: string | undefined = formData.ogImagePreview || undefined;
if (formData.ogImageFile) {
  const ogForm = new FormData();
  ogForm.append('file', formData.ogImageFile);
  ogForm.append('folder', 'products/og-images');  // ❌ Issue 3.2: Hardcoded folder
  const ogRes = await fetch('/api/upload', { method: 'POST', body: ogForm });
  if (ogRes.ok) uploadedOgImageUrl = (await ogRes.json()).url;  // ❌ Issue 3.5: No URL validation
}
```
- **Issue 3.2:** OG image folder is `products/og-images` (inconsistent with variants: `products/[id]/variants`)
- **Issue 3.5:** URL returned but not verified accessible
- **Issue 3.4:** `/api/upload` endpoint has no server-side validation
- **Fix:** Standardize folders; validate URLs; add server-side file validation

**Line 632:** Form submission
```typescript
const res = await fetch('/api/products', {  // ❌ Issue 1.5, 1.1: No auth
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(productPayload),
});
```
- **Issue 1.5:** Uses public endpoint (not admin)
- **Issue 1.1:** No auth token sent; API doesn't check
- **Fix:** Use `/api/admin/products` and send auth token

**Lines 670-690:** Error handling & cleanup
- **Issue 5.1:** Alert box only, no field-level errors
- **Issue 3.6:** If error thrown after uploads, images are orphaned
- **Fix:** Show field errors; implement upload cleanup on failure

---

### 3. `/app/admin/products/[id]/edit/page.tsx`

**Lines 130-170:** useEffect - Fetch product
```typescript
const res = await fetch(`/api/admin/products/${productId}`);  // ✅ Uses admin endpoint
if (!res.ok) throw new Error(...);
const { product: p } = await res.json();
```
- ✅ Correctly uses `/api/admin/products/[id]`
- **Issue 1.6:** This endpoint doesn't verify auth though

**Lines 195-230:** State population - dimensions
```typescript
dimensions: {
  length: dims.length || '',
  width:  dims.width  || '',
  height: dims.height || '',
},
```
- **Issue 2.1:** Dimensions set as object with strings. Frontend preserves, but no guarantee backend handles.

**Lines 395-415:** OG image upload
```typescript
if (formData.ogImageFile) {
  const ogForm = new FormData();
  ogForm.append('folder', 'products/og-images');  // ❌ Issue 3.2: Hardcoded
  const ogRes = await fetch('/api/upload', { method: 'POST', body: ogForm });
}
```
- **Issue 3.2:** Same hardcoded folder path
- **Issue 3.4:** No server validation on upload

**Lines 420-435:** Variant image upload
```typescript
folder: `products/${dbProductId || productId}/variants`  // ❌ Issue 3.3: Uses URL param if dbProductId undefined
```
- **Issue 3.3:** On page load, `dbProductId` is undefined. First upload uses URL param. After fetch, uses DB ID.
- **Fix:** Ensure DB ID is set before any uploads

**Lines 430-480:** Product update payload
```typescript
const basePrice = parseFloat(formData.variants[0]?.price || '0') || 0;  // ❌ Issue 2.2
const originalPrice = formData.discountPercentage
  ? basePrice / (1 - parseFloat(formData.discountPercentage) / 100)
  : formData.salePrice ? parseFloat(formData.salePrice) : undefined;
```
- **Issue 2.2:** `parseFloat()` loses decimal precision
- **Fix:** Use Decimal arithmetic or fixed-point math

**Lines 485-495:** Dimensions in payload
```typescript
dimensions: (formData.dimensions.length || formData.dimensions.width || formData.dimensions.height)
  ? { length: formData.dimensions.length, width: formData.dimensions.width, height: formData.dimensions.height }
  : undefined,
```
- **Issue 2.1:** Format preserved but inconsistent with API expectations

**Line 512:** Update request
```typescript
const res = await fetch(`/api/products/${targetId}`, {  // ❌ Issue 1.5, 1.2: No auth
  method:  'PUT',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify(payload),
});
```
- **Issue 1.5:** Uses public endpoint
- **Issue 1.2:** No auth token
- **Fix:** Use `/api/admin/products/[targetId]` with auth

**Lines 395-435:** Upload sequence
```typescript
// Upload images
const uploadedImages = await Promise.all(...);
// ... 30+ lines ...
// Update product
const res = await fetch(`/api/products/${targetId}`, ...);
if (!res.ok) throw new Error(...);  // ❌ Issue 3.6: Images already uploaded!
```
- **Issue 3.6:** If product update fails, uploaded images are orphaned
- **Fix:** Wrap in transaction or implement cleanup

---

### 4. `/app/api/products/route.ts`

**Lines 17-130:** GET endpoint
- ✅ No auth required (public product listing) - OK

**Line 135:** POST endpoint declaration
```typescript
export async function POST(request: NextRequest) {  // ❌ CRITICAL ISSUE 1.1
  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
```
- **Issue 1.1:** NO AUTH CHECK
- **Issue 4.2:** Only checks `name`. No validation for:
  - `price > 0`
  - `variants` (if provided)
  - `category` (if required)
  - `images` (count)
- **Fix:** Add auth middleware; add Zod validation schema

**Lines 160-190:** SKU handling
```typescript
const baseSku = `MB-${Date.now()}`;
const sku = body.variants?.[0]?.sku || baseSku;
const existingSku = await prisma.product.findUnique({ where: { sku } });
const finalSku = existingSku ? `${sku}-${Date.now()}` : sku;
```
- **Issue 2.5:** SKU modified silently on collision
- **Fix:** Reject with error; require unique SKU upfront

**Lines 195-200:** Total stock calculation
```typescript
const totalStock = Array.isArray(body.variants)
  ? body.variants.reduce((sum: number, v: { stock?: string | number }) => sum + (Number(v.stock) || 0), 0)
  : (body.stock ?? 0);
```
- **Issue 2.3:** No validation. Can create product with 0 stock.
- **Fix:** Validate minimum stock or variant requirements

**Lines 220-230:** Base price handling
```typescript
const basePrice = body.price != null
  ? Number(body.price)
  : (body.variants?.[0]?.price ? Number(body.variants[0].price) : 0);
```
- **Issue 2.2:** `Number()` conversion loses precision
- **Fix:** Use Decimal or BigDecimal for financial data

**Lines 245-260:** Variant creation
```typescript
const variantData = [];
for (const v of body.variants) {
  const vSku = v.sku || `${finalSku}-V${Date.now()}...`;
  const conflict = await prisma.productVariant.findUnique({ where: { sku: vSku } });
  if (!conflict) {
    variantData.push({...});
  }
}
```
- **Issue 4.3:** Check inside loop, not batch. Some variants may succeed, others fail.
- **Fix:** Validate all variant SKUs upfront before creation

**Lines 250-260:** Variant image field
```typescript
attributes: { size: v.size || '', color: v.color || '' },
// Note: v.image field NOT included here!
```
- **Issue 2.4:** Variant image field not saved in POST
- **Fix:** Add `image: v.image || null` to variant data

---

### 5. `/app/api/products/[id]/route.ts`

**Lines 12-50:** GET endpoint (for product details)
- ✅ Auth optional (public product page) - OK
- ✅ Comprehensive data structure

**Lines 200-300:** PUT endpoint
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {  // ❌ CRITICAL ISSUE 1.2: NO AUTH CHECK
```
- **Issue 1.2:** NO AUTH CHECK
- **Issue 2.4:** Variant image field not always saved
- **Issue 4.5:** Variant removal checked but not smart

**Lines 320-370:** Delete endpoint
```typescript
export async function DELETE(...) {  // ❌ CRITICAL ISSUE 1.3: NO AUTH CHECK
  try {
    const { id } = await params;
    const existing = await prisma.product.findFirst({ where: { ... } });
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    
    const orderItemCount = await prisma.orderItem.count({ where: { productId: existing.id } });
    
    if (orderItemCount > 0) {
      // Soft delete
      await prisma.$transaction([...]);
      return NextResponse.json({ success: true, archived: true });
    }
    
    // Hard delete
    await prisma.product.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });  // ❌ Issue 4.4: No indication of hard vs soft delete
  }
}
```
- **Issue 1.3:** NO AUTH CHECK
- **Issue 4.4:** Response doesn't always include `archived` flag (inconsistent)
- **Issue 6.3:** No audit logging
- **Fix:** Add auth; ensure response always has `archived` flag; log deletion

---

### 6. `/app/api/admin/products/[id]/route.ts`

**Lines 8-30:** GET endpoint
```typescript
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {  // ❌ ISSUE 1.6: NO AUTH CHECK
  try {
    const { id } = await params;
    const product = await prisma.product.findFirst({ where: { ... } });
```
- **Issue 1.6:** NO AUTH CHECK on admin endpoint
- **Fix:** Add `verifyAdminToken()` call

---

### 7. `/app/api/upload/route.ts` (Not visible - inferred from usage)

**General issues:**
- **Issue 1.7:** NO AUTH CHECK (likely)
- **Issue 3.1:** NO FILE VALIDATION (likely)
- **Issue 3.4:** NO FILE TYPE CHECK (likely)
- **Issue 3.5:** NO SIZE LIMIT (likely)

**Fix needed:**
```typescript
export async function POST(request: NextRequest) {
  // 1. Verify auth token
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  // 2. Validate admin
  const admin = await verifyAdminToken(token);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
  // 3. Get file
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // 4. Validate file
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 });
  }
  
  // 5. Upload...
}
```

---

## Quick Navigation: Find Issues by File

| File | Critical | High | Medium |
|------|----------|------|--------|
| `admin/products/page.tsx` | 1.4 | — | 6.1, 6.2, 7.2 |
| `admin/products/new/page.tsx` | 1.5 | 3.2 | 2.1, 3.4, 5.1-5.3, 7.1 |
| `admin/products/[id]/edit/page.tsx` | 1.5 | 2.2, 3.3, 3.6 | 2.1, 3.4, 5.1-5.4, 7.1 |
| `api/products/route.ts` | 1.1 | 2.3-2.5 | 2.6, 4.2-4.3 |
| `api/products/[id]/route.ts` | 1.2, 1.3 | 2.4 | 4.4-4.5 |
| `api/admin/products/[id]/route.ts` | 1.6 | — | — |
| `api/upload/` | 1.7 | 3.1 | 3.4 |

---

## Implementation Order

1. **First:** Add auth to all API endpoints (1.1, 1.2, 1.3, 1.6, 1.7)
2. **Second:** Fix critical data handling (2.2, 2.3, 2.4, 2.5)
3. **Third:** Fix file upload workflows (3.1-3.6)
4. **Fourth:** Standardize errors & validation (4.1-4.5)
5. **Last:** Improve UX (5.1-5.4, 6.1-6.3, 7.1-7.2)

