// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { adminHasPermission, getVerifiedAdmin } from '@/lib/auth/admin-request';
import { getDeliveryOfferBadgeText, isDeliveryOfferActive } from '@/lib/delivery-pricing';
import { enqueueProductDelete, enqueueProductIndex } from '@/lib/queue/productQueue';
import { normalizeProductCondition } from '@/lib/products/product-condition';

export const dynamic = 'force-dynamic';

function toOptionalNumber(value: unknown, fallback: unknown): unknown {
  if (value == null || value === '') return fallback;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function validateOptionalNumber(value: unknown, label: string): string | null {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? null : `${label} must be a valid number`;
}

function buildStoredSubcategory(subcategory: unknown, item: unknown): string | null {
  const normalizedSubcategory =
    typeof subcategory === 'string' ? subcategory.trim() : '';
  const normalizedItem = typeof item === 'string' ? item.trim() : '';

  if (!normalizedSubcategory) {
    return null;
  }

  return normalizedItem
    ? `${normalizedSubcategory} > ${normalizedItem}`
    : normalizedSubcategory;
}

// ── GET /api/products/[id] ─────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getProductDetail(id);
    if (!data) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

// ── PUT /api/products/[id] ─────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_EDIT)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const numericValidationError =
      validateOptionalNumber(body.weight, 'Weight') ||
      validateOptionalNumber(body.dimensions?.length, 'Length') ||
      validateOptionalNumber(body.dimensions?.width, 'Width') ||
      validateOptionalNumber(body.dimensions?.height, 'Height');
    if (numericValidationError) {
      return NextResponse.json({ error: numericValidationError }, { status: 400 });
    }

    const existing = await prisma.product.findFirst({
      where: { AND: [{ OR: [{ id }, { slug: id }] }, { deletedAt: null }] },
      include: { variants: true, images: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const requestedStatus = typeof body.status === 'string' ? body.status : null;
    const forceOutOfStock = requestedStatus === 'out_of_stock';
    const storedSubcategory =
      body.subcategory !== undefined || body.item !== undefined
        ? buildStoredSubcategory(body.subcategory, body.item)
        : existing.subcategory;

    // Resolve category
    let categoryId: string | null = existing.categoryId;
    if (body.category) {
      const cat = await prisma.category.findFirst({
        where: { OR: [{ name: body.category }, { slug: body.category }] },
      });
      categoryId = cat?.id ?? existing.categoryId ?? null;
    }

    // Resolve / create brand
    let brandId: string | null = existing.brandId;
    if (body.brand) {
      let brand = await prisma.brand.findFirst({
        where: { OR: [{ name: body.brand }, { slug: body.brand }] },
      });
      if (!brand) {
        brand = await prisma.brand.create({
          data: {
            name:     body.brand,
            slug:     body.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
            isActive: true,
          },
        });
      }
      brandId = brand.id;
    }

    // Resolve slug
    let slug = existing.slug;
    if (body.slug && body.slug !== existing.slug) {
      const conflict = await prisma.product.findFirst({
        where: { slug: body.slug, id: { not: existing.id } },
      });
      if (!conflict) slug = body.slug;
    }

    const updateData: Record<string, unknown> = {
      name:             body.name             ?? existing.name,
      slug,
      description:      body.description      ?? existing.description,
      shortDescription: body.shortDescription ?? existing.shortDescription,
      categoryId,
      brandId,
      price:          body.price         != null ? body.price         : existing.price,
      compareAtPrice: body.originalPrice != null ? body.originalPrice : existing.compareAtPrice,
      costPrice:      body.costPrice     != null ? body.costPrice     : existing.costPrice,
      lowStockThreshold: body.lowStockThreshold != null ? Number(body.lowStockThreshold) : existing.lowStockThreshold,
      weight: toOptionalNumber(body.weight, existing.weight),
      // FIXED: dimensions saved correctly
      length: body.dimensions?.length && body.dimensions.length !== '' ? Number(body.dimensions.length) : existing.length,
      width:  body.dimensions?.width  && body.dimensions.width  !== '' ? Number(body.dimensions.width)  : existing.width,
      height: body.dimensions?.height && body.dimensions.height !== '' ? Number(body.dimensions.height) : existing.height,
      trackInventory: body.trackInventory ?? existing.trackInventory,
      allowBackorder: body.allowBackorder ?? existing.allowBackorder,
      quantity: forceOutOfStock ? 0 : existing.quantity,
      isActive:   body.status   !== undefined ? body.status !== 'inactive' : existing.isActive,
      isFeatured: body.featured != null       ? body.featured            : existing.isFeatured,
      metaTitle:          body.metaTitle          ?? existing.metaTitle,
      metaDescription:    body.metaDescription    ?? existing.metaDescription,
      metaKeywords:       body.tags               ?? existing.metaKeywords,
      bengaliName:        body.bengaliName        ?? existing.bengaliName,
      bengaliDescription: body.bengaliDescription ?? existing.bengaliDescription,
      focusKeyword:       body.focusKeyword       ?? existing.focusKeyword,
      secondaryKeywords:  Array.isArray(body.secondaryKeywords) ? body.secondaryKeywords : existing.secondaryKeywords,
      bengaliFocusKeyword: body.bengaliFocusKeyword ?? existing.bengaliFocusKeyword,
      bengaliSecondaryKeywords: Array.isArray(body.bengaliSecondaryKeywords) ? body.bengaliSecondaryKeywords : existing.bengaliSecondaryKeywords,
      ogTitle:            body.ogTitle            ?? existing.ogTitle,
      ogDescription:      body.ogDescription      ?? existing.ogDescription,
      ogImageUrl:         body.ogImageUrl         ?? existing.ogImageUrl,
      canonicalUrl:       body.canonicalUrl       ?? existing.canonicalUrl,

      // SEO 1-22 fields
      pageH1:             body.pageH1             ?? existing.pageH1,
      seoIntro:           body.seoIntro           ?? existing.seoIntro,
      faqSchemaNote:      body.faqSchemaNote      ?? existing.faqSchemaNote,
      authenticityNote:   body.authenticityNote   ?? existing.authenticityNote,
      ingredientVerificationStatus: body.ingredientVerificationStatus ?? existing.ingredientVerificationStatus,
      seoValidationChecklist: Array.isArray(body.seoValidationChecklist) ? body.seoValidationChecklist : existing.seoValidationChecklist,
      structuredDataJsonLd: body.structuredDataJsonLd ?? existing.structuredDataJsonLd,
      productGroupJsonLd:   body.productGroupJsonLd   ?? existing.productGroupJsonLd,
      merchantListingJsonLd: body.merchantListingJsonLd ?? existing.merchantListingJsonLd,
      breadcrumbJsonLd:     body.breadcrumbJsonLd     ?? existing.breadcrumbJsonLd,
      sitemapIndexing:      body.sitemapIndexing      ?? existing.sitemapIndexing,
      variantUrlStrategy:   body.variantUrlStrategy   ?? existing.variantUrlStrategy,
      searchIntent:         body.searchIntent         ?? existing.searchIntent,
      targetAudience:       body.targetAudience       ?? existing.targetAudience,
      primaryConcern:       body.primaryConcern       ?? existing.primaryConcern,
      keyBenefits:          Array.isArray(body.keyBenefits) ? body.keyBenefits : existing.keyBenefits,
      buyingIntentKeywords: Array.isArray(body.buyingIntentKeywords) ? body.buyingIntentKeywords : existing.buyingIntentKeywords,
      searchTags:           Array.isArray(body.searchTags) ? body.searchTags : existing.searchTags,
      synonyms:             Array.isArray(body.synonyms) ? body.synonyms : existing.synonyms,
      banglaSearchTerms:    Array.isArray(body.banglaSearchTerms) ? body.banglaSearchTerms : existing.banglaSearchTerms,
      reviewKeywords:       Array.isArray(body.reviewKeywords) ? body.reviewKeywords : existing.reviewKeywords,
      entities:             Array.isArray(body.entities) ? body.entities : existing.entities,
      descriptionSections:  body.descriptionSections  ?? existing.descriptionSections,
      productSpecs:         body.productSpecs         ?? existing.productSpecs,
      productAttributes:    body.productAttributes    ?? existing.productAttributes,
      shadeOptions:         body.shadeOptions         ?? existing.shadeOptions,
      variantPriceTable:    body.variantPriceTable    ?? existing.variantPriceTable,
      variantComparisonTable: body.variantComparisonTable ?? existing.variantComparisonTable,
      internalLinks:        body.internalLinks        ?? existing.internalLinks,
      usageInstructions:    Array.isArray(body.usageInstructions) ? body.usageInstructions : existing.usageInstructions,
      imageAltTexts:        Array.isArray(body.imageAltTexts) ? body.imageAltTexts : existing.imageAltTexts,
      faqSchemaReady:       body.faqSchemaReady       ?? existing.faqSchemaReady,
      gender:               body.gender               ?? existing.gender,
      faqs:                 body.faqs                 ?? existing.faqs,

      subcategory:   storedSubcategory,
      skinType:      body.skinType      ?? existing.skinType,
      ingredients:   body.ingredients   ?? existing.ingredients,
      shelfLife:     body.shelfLife     ?? existing.shelfLife,
      expiryDate:    body.expiryDate    ? new Date(body.expiryDate) : existing.expiryDate,
      originCountry: body.originCountry ?? existing.originCountry,
      shippingWeight: body.shippingWeight ?? existing.shippingWeight,
      isFragile:      body.isFragile      ?? existing.isFragile,
      discountPercentage: body.discountPercentage != null ? Number(body.discountPercentage) : existing.discountPercentage,
      salePrice:          body.salePrice          != null ? Number(body.salePrice)          : existing.salePrice,
      offerStartDate: body.offerStartDate ? new Date(body.offerStartDate) : existing.offerStartDate,
      offerEndDate:   body.offerEndDate   ? new Date(body.offerEndDate)   : existing.offerEndDate,
      flashSaleEligible:  body.flashSaleEligible ?? existing.flashSaleEligible,
      returnEligible:  body.returnEligible  ?? existing.returnEligible,
      codAvailable:    body.codAvailable    ?? existing.codAvailable,
      preOrderOption:  body.preOrderOption  ?? existing.preOrderOption,
      barcode:         body.barcode         ?? existing.barcode,
      relatedProducts: body.relatedProducts ?? existing.relatedProducts,
      condition:     normalizeProductCondition(body.condition, normalizeProductCondition(existing.condition)),
      gtin:          body.gtin          ?? existing.gtin,
      averageRating: body.averageRating != null ? Number(body.averageRating) : existing.averageRating,
      reviewCount:   body.reviewCount   != null ? Number(body.reviewCount)   : existing.reviewCount,
    };

    const updated = await prisma.product.update({
      where: { id: existing.id },
      data:  updateData,
    });

    // FIXED: Images with alt text saved properly
    if (Array.isArray(body.images) && body.images.length > 0) {
      await prisma.productImage.deleteMany({ where: { productId: existing.id } });
      await prisma.productImage.createMany({
        data: body.images.map(
          (img: { url: string; alt?: string; title?: string; sortOrder?: number }, idx: number) => ({
            productId: existing.id,
            url:       img.url,
            alt:       img.alt   || '',
            title:     img.title || '',
            sortOrder: img.sortOrder ?? idx,
            isDefault: idx === 0,
          })
        ),
      });
    }

    // FIXED: Variants with image field
    if (Array.isArray(body.variants) && body.variants.length > 0) {
      const existingVariantIds = new Set(existing.variants.map((variant) => variant.id));
      const submittedExistingVariantIds = new Set(
        body.variants
          .map((variant: { id?: string }) => variant.id)
          .filter((variantId: unknown): variantId is string =>
            typeof variantId === 'string' && existingVariantIds.has(variantId)
          )
      );
      const removedVariantIds = existing.variants
        .map((variant) => variant.id)
        .filter((variantId) => !submittedExistingVariantIds.has(variantId));

      if (removedVariantIds.length > 0) {
        const orderedVariant = await prisma.orderItem.findFirst({
          where: { variantId: { in: removedVariantIds } },
          select: { variantId: true },
        });

        if (orderedVariant) {
          return NextResponse.json(
            { error: 'Cannot remove a variant that exists in order history. Set its stock to 0 instead.' },
            { status: 400 }
          );
        }

        await prisma.$transaction([
          prisma.cartItem.deleteMany({ where: { variantId: { in: removedVariantIds } } }),
          prisma.productVariant.deleteMany({ where: { id: { in: removedVariantIds } } }),
        ]);
      }

      for (const v of body.variants) {
        const variantSku  = v.sku || `${updated.sku}-V${Date.now()}`;
        const isRealId    = v.id && v.id.length > 10 && !['1','2','3','4','5'].includes(v.id);
        const variantData = {
          productId:  existing.id,
          name:       v.size || v.color || v.name || updated.name,
          sku:        variantSku,
          price:      v.price != null ? Number(v.price) : updated.price,
          quantity:   forceOutOfStock ? 0 : (v.stock != null ? Number(v.stock) : 0),
          attributes: { size: v.size || '', color: v.color || '' },
          image:      v.image || null, // FIXED: variant image saved
        };
        if (isRealId) {
          await prisma.productVariant.upsert({
            where:  { id: v.id },
            update: variantData,
            create: { ...variantData, sku: variantSku },
          });
        } else {
          const skuConflict = await prisma.productVariant.findUnique({ where: { sku: variantSku } });
          if (!skuConflict) await prisma.productVariant.create({ data: variantData });
        }
      }
      const totalStock = forceOutOfStock ? 0 : body.variants.reduce(
        (sum: number, v: { stock?: string | number }) => sum + (Number(v.stock) || 0), 0
      );
      await prisma.product.update({ where: { id: existing.id }, data: { quantity: totalStock } });
    }

    const searchSyncQueued = await enqueueProductIndex(updated.id, 'admin product update legacy route');

    return NextResponse.json({
      success: true,
      product: { id: updated.id, slug: updated.slug, name: updated.name },
      searchSyncQueued,
    });
  } catch (error) {
    console.error('PUT /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// ── DELETE /api/products/[id] ──────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_DELETE)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.product.findFirst({
      where: { AND: [{ OR: [{ id }, { slug: id }] }, { deletedAt: null }] },
    });
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const orderItemCount = await prisma.orderItem.count({ where: { productId: existing.id } });

    if (orderItemCount > 0) {
      await prisma.$transaction([
        prisma.cartItem.deleteMany({ where: { productId: existing.id } }),
        prisma.wishlistItem.deleteMany({ where: { productId: existing.id } }),
        prisma.product.update({
          where: { id: existing.id },
          data: { deletedAt: new Date(), isActive: false, quantity: 0, isFeatured: false },
        }),
      ]);

      const searchSyncQueued = await enqueueProductDelete(existing.id, 'admin product soft-delete legacy route');

      return NextResponse.json({ success: true, archived: true, searchSyncQueued });
    }

    await prisma.product.delete({ where: { id: existing.id } });
    const searchSyncQueued = await enqueueProductDelete(existing.id, 'admin product hard-delete legacy route');
    return NextResponse.json({ success: true, searchSyncQueued });
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
