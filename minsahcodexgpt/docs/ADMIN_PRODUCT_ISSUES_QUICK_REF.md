# Admin Product Issues - Quick Reference

## Issue Summary by Severity

### 🔴 CRITICAL (7 Issues)

| # | Issue | Location | Fix Priority |
|---|-------|----------|--------------|
| 1.1 | Missing auth on POST /api/products | `/api/products` route | 1 |
| 1.2 | Missing auth on PUT /api/products/[id] | `/api/products/[id]` route | 1 |
| 1.3 | Missing auth on DELETE /api/products/[id] | `/api/products/[id]` route | 1 |
| 1.4 | Client-side permission checks only | Admin pages | 1 |
| 1.5 | Admin ops using public endpoints | `/api/products` | 1 |
| 1.6 | GET /api/admin/products/[id] no auth | `/api/admin/products/[id]` | 1 |
| 3.1 | Upload endpoint security | `/api/upload` | 1 |

---

### 🟠 HIGH (11 Issues)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 2.1 | Dimensions format mismatch | Frontend/Backend | Data persistence |
| 2.2 | Decimal precision loss on prices | Price calculations | Financial accuracy |
| 2.3 | Variant stock aggregation not validated | POST /api/products | Inventory sync |
| 2.4 | Variant image optional inconsistency | Edit page + API | Image display |
| 2.5 | SKU uniqueness not enforced pre-creation | POST /api/products | Silent modification |
| 3.2 | OG image upload folder inconsistent | Image upload | File organization |
| 3.3 | Variant image upload folder uses URL ID | Image upload | Files scattered |
| 3.4 | Missing file validation on upload | /api/upload | Security/Storage |
| 3.5 | Image URL not validated after upload | Image uploads | Broken images |
| 3.6 | Multiple uploads not rolled back on error | Update flow | Orphaned files |
| 6.2 | Bulk delete has no transaction | Bulk delete | Partial deletion |

---

### 🟡 MEDIUM (8 Issues)

| # | Issue | Location | Type |
|---|-------|----------|------|
| 2.6 | Boolean field inconsistency | Form submission | Data handling |
| 4.1 | Inconsistent error response format | All endpoints | Error handling |
| 4.2 | Missing validation for required fields | POST /api/products | Validation |
| 4.3 | No validation on variant SKU pre-save | Variant creation | Validation |
| 4.4 | Delete operation silent failure | DELETE endpoint | Feedback |
| 4.5 | Edit doesn't validate variant removal | PUT endpoint | Validation |
| 5.1 | No form state persistence on error | Edit/New pages | UX |
| 5.2 | Image upload progress not visible | Image uploads | UX |
| 5.3 | Variant count not validated on submit | Form submit | Validation |
| 5.4 | Unsaved changes warning missing | Edit page | UX |
| 6.1 | Delete flow frontend auth missing | Delete handler | Frontend |
| 6.3 | No audit trail for deletions | DELETE endpoint | Compliance |
| 7.1 | New vs Edit page inconsistency | Admin pages | UX/Maintenance |
| 7.2 | ProductsContext refresh not consistent | All mutations | Data sync |

---

## Critical Fixes Needed Immediately

### 1. **Add Server-Side Auth to Product Endpoints**

**Files to modify:**
- `app/api/products/route.ts` (POST)
- `app/api/products/[id]/route.ts` (PUT, DELETE)
- `app/api/admin/products/[id]/route.ts` (GET)

**Pattern to implement:**
```typescript
// Add auth check at top of handler
const token = request.headers.get('Authorization')?.replace('Bearer ', '');
if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const admin = await verifyAdminToken(token);
if (!admin?.permissions.includes('required_permission')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 2. **Implement Upload Auth & Validation**

**File:** `app/api/upload/route.ts` (or similar)

**Required:**
- Bearer token validation
- File type whitelist (image/* only)
- File size limit (10MB for images, 5MB for OG)
- Scan for malware

### 3. **Standardize Error Responses**

**All endpoints should return:**
```typescript
{
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: object };
  status: number;
}
```

---

## Frontend Issues to Address

| Issue | Files | Action |
|-------|-------|--------|
| Admin ops using public endpoints | `new/page.tsx`, `[id]/edit/page.tsx`, `page.tsx` | Update fetch URLs to `/api/admin/products` |
| Unsaved changes warning | `[id]/edit/page.tsx` | Add `beforeunload` event handler |
| Upload progress | `new/page.tsx`, `[id]/edit/page.tsx` | Add progress bar during upload |
| Field-level errors | `new/page.tsx`, `[id]/edit/page.tsx` | Display errors per input field |
| Image URL validation | `new/page.tsx`, `[id]/edit/page.tsx` | Fetch URL after upload to verify |

---

## Database Considerations

- **Soft delete:** Products with orders should be soft-deleted (set `deletedAt`, `isActive = false`)
- **Hard delete:** Products without orders can be hard-deleted
- **Audit:** Consider adding `AuditLog` table for deletion tracking
- **Cascades:** `ProductImage`, `ProductVariant` cascade on delete (already set)

---

## Testing Checklist

### Security Tests
- [ ] Unauthenticated POST /api/products → 401/403
- [ ] Unauthenticated PUT /api/products/[id] → 401/403
- [ ] Unauthenticated DELETE /api/products/[id] → 401/403
- [ ] Non-admin user with valid token → 403
- [ ] Upload without auth → 401/403
- [ ] Invalid file types on upload → 400

### Data Integrity Tests
- [ ] Price precision: 99.99 stays 99.99 (not 99.98999)
- [ ] Variant stock: sum of variants = product stock
- [ ] SKU collision: handled gracefully with user notification
- [ ] Dimensions: object format preserved
- [ ] Image URLs: all images fetched post-upload

### Delete Tests
- [ ] Delete product with orders → soft delete
- [ ] Delete product without orders → hard delete
- [ ] Bulk delete: partial failure handled
- [ ] Response indicates `archived: true/false`

### Upload Tests
- [ ] Large file (>10MB) → rejected
- [ ] Non-image file → rejected
- [ ] Upload network failure → rollback not called
- [ ] Product update failure → uploaded images cleaned up (ideally)

---

## Related Files

- **Main Issue Report:** `docs/ADMIN_PRODUCT_ISSUES.md`
- **API Documentation:** `docs/api-inventory.md`, `docs/api-missing.md`
- **Admin Pages:** `app/admin/products/`
- **API Routes:** `app/api/products/`, `app/api/admin/products/`
- **Auth Context:** `contexts/AdminAuthContext.tsx`
- **Upload:** `app/api/upload/` (or variant)

---

## Quick Wins (Low-effort, High-impact)

1. **Add auth checks** (30 min) - Copy-paste auth middleware
2. **Standardize errors** (45 min) - Wrap all responses
3. **Add unsaved warning** (15 min) - `beforeunload` event
4. **Field validation messages** (1 hour) - Show errors per field
5. **Add upload auth** (30 min) - Same middleware

---

## Estimated Effort

- **Critical Fixes (Phase 1):** 3-4 hours
- **Data Integrity (Phase 2):** 4-5 hours
- **File Upload Stability (Phase 3):** 3-4 hours
- **UX & Error Handling (Phase 4):** 2-3 hours
- **Total:** 12-16 hours of focused work

