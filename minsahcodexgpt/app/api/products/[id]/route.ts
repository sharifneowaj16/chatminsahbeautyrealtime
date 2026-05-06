// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { adminHasPermission, getVerifiedAdmin } from '@/lib/auth/admin-request';

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
    type FrequentlyBoughtRow = {
      productId: string;
      orderCount: number;
      totalUnits: number;
    };

    const product = await prisma.product.findFirst({
      where: { AND: [{ OR: [{ id }, { slug: id }] }, { deletedAt: null }] },
      include: {
        images:   { orderBy: { sortOrder: 'asc' } },
        variants: { orderBy: { id: 'asc' } },
        category: true,
        brand:    true,
        reviews:  {
          where:   { isApproved: true },
          select:  {
            id: true, rating: true, comment: true, title: true, createdAt: true,
            user: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const mainImage = product.images.find((i) => i.isDefault) || product.images[0];
    const frequentlyBoughtRows = await prisma.$queryRaw<FrequentlyBoughtRow[]>`
      SELECT
        companion."productId" AS "productId",
        COUNT(DISTINCT companion."orderId")::int AS "orderCount",
        COALESCE(SUM(companion."quantity"), 0)::int AS "totalUnits"
      FROM "OrderItem" source_item
      INNER JOIN "Order" source_order
        ON source_order."id" = source_item."orderId"
      INNER JOIN "OrderItem" companion
        ON companion."orderId" = source_item."orderId"
       AND companion."productId" <> source_item."productId"
      INNER JOIN "Product" companion_product
        ON companion_product."id" = companion."productId"
      WHERE source_item."productId" = ${product.id}
        AND source_order."status" IN ('SHIPPED', 'DELIVERED')
        AND source_order."paymentStatus" IN ('PROCESSING', 'COMPLETED')
        AND companion_product."isActive" = true
      GROUP BY companion."productId"
      ORDER BY "orderCount" DESC, "totalUnits" DESC
      LIMIT 4
    `;

    const frequentlyBoughtProducts = frequentlyBoughtRows.length
      ? await prisma.product.findMany({
          where: {
            id: { in: frequentlyBoughtRows.map((row) => row.productId) },
            isActive: true,
          },
          include: {
            images: { where: { isDefault: true }, take: 1 },
            variants: { select: { id: true }, take: 1 },
          },
        })
      : [];

    const frequentlyBoughtMap = new Map(
      frequentlyBoughtProducts.map((relatedProduct) => [relatedProduct.id, relatedProduct])
    );

    const relatedProducts = product.categoryId
      ? await prisma.product.findMany({
          where: { categoryId: product.categoryId, id: { not: product.id }, isActive: true },
          take: 4,
          include: {
            images: { where: { isDefault: true }, take: 1 },
            variants: { select: { id: true }, take: 1 },
          },
        })
      : [];

    const reviews = product.reviews.map((r) => ({
      id:        r.id,
      userName:  [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || 'Customer',
      rating:    r.rating,
      title:     r.title   || '',
      content:   r.comment || '',
      verified:  true,
      createdAt: r.createdAt.toISOString(),
    }));

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });

    return NextResponse.json({
      product: {
        id:               product.id,
        name:             product.name,
        slug:             product.slug,
        description:      product.description      || '',
        shortDescription: product.shortDescription || '',
        price:            product.price.toNumber(),
        originalPrice:    product.compareAtPrice ? product.compareAtPrice.toNumber() : null,
        image:            mainImage?.url  || '',
        // FIXED: return full image objects with alt text
        images:           product.images.map((i) => ({ url: i.url, alt: i.alt || '', isDefault: i.isDefault })),
        sku:              product.sku,
        stock:            product.quantity,
        category:         product.category?.name || '',
        categorySlug:     product.category?.slug || '',
        brand:            product.brand?.name    || '',
        rating:           product.averageRating?.toNumber() || 0,
        reviews:          product.reviewCount    || 0,
        inStock:          product.quantity > 0,
        isNew:            product.isNew,
        isFeatured:       product.isFeatured,
        ingredients:      product.ingredients    || '',
        skinType:         product.skinType       || [],
        codAvailable:     product.codAvailable,
        returnEligible:   product.returnEligible,
        weight:           product.weight ? product.weight.toNumber() : null,
        shippingWeight:   product.shippingWeight || '',
        metaTitle:        product.metaTitle      || '',
        metaDescription:  product.metaDescription || '',
        ogTitle:          product.ogTitle         || '',
        ogImageUrl:       product.ogImageUrl      || '',
        // FIXED: variants with image field
        variants: product.variants.map((v) => ({
          id:         v.id,
          sku:        v.sku,
          name:       v.name,
          price:      v.price ? v.price.toNumber() : product.price.toNumber(),
          stock:      v.quantity,
          attributes: v.attributes || {},
          image:      v.image || '',
          weight:
            typeof v.attributes === 'object' &&
            v.attributes !== null &&
            'weight' in v.attributes &&
            typeof v.attributes.weight === 'number'
              ? v.attributes.weight
              : product.weight
                ? product.weight.toNumber()
                : null,
        })),
      },
      reviews,
      rating: {
        average:      product.averageRating?.toNumber() || 0,
        total:        product.reviewCount || 0,
        distribution,
      },
      relatedProducts: relatedProducts.map((rp) => ({
        id:            rp.id,
        name:          rp.name,
        slug:          rp.slug,
        price:         rp.price.toNumber(),
        originalPrice: rp.compareAtPrice ? rp.compareAtPrice.toNumber() : null,
        image:         rp.images[0]?.url || '',
        stock:         rp.quantity,
        hasVariants:   rp.variants.length > 0,
      })),
      frequentlyBoughtTogether: frequentlyBoughtRows
        .map((row) => {
          const relatedProduct = frequentlyBoughtMap.get(row.productId);
          if (!relatedProduct) {
            return null;
          }

          return {
            id: relatedProduct.id,
            name: relatedProduct.name,
            slug: relatedProduct.slug,
            price: relatedProduct.price.toNumber(),
            originalPrice: relatedProduct.compareAtPrice
              ? relatedProduct.compareAtPrice.toNumber()
              : null,
            image: relatedProduct.images[0]?.url || '',
            stock: relatedProduct.quantity,
            hasVariants: relatedProduct.variants.length > 0,
            orderCount: row.orderCount,
            totalUnits: row.totalUnits,
          };
        })
        .filter(Boolean),
    });
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
      quantity: forceOutOfStock ? 0 : existing.quantity,
      isActive:   body.status   !== undefined ? body.status !== 'inactive' : existing.isActive,
      isFeatured: body.featured != null       ? body.featured            : existing.isFeatured,
      metaTitle:          body.metaTitle          ?? existing.metaTitle,
      metaDescription:    body.metaDescription    ?? existing.metaDescription,
      metaKeywords:       body.tags               ?? existing.metaKeywords,
      bengaliName:        body.bengaliName        ?? existing.bengaliName,
      bengaliDescription: body.bengaliDescription ?? existing.bengaliDescription,
      focusKeyword:       body.focusKeyword       ?? existing.focusKeyword,
      ogTitle:            body.ogTitle            ?? existing.ogTitle,
      ogImageUrl:         body.ogImageUrl         ?? existing.ogImageUrl,
      canonicalUrl:       body.canonicalUrl       ?? existing.canonicalUrl,
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
      condition:     body.condition     ?? existing.condition,
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

    return NextResponse.json({ success: true, product: { id: updated.id, slug: updated.slug, name: updated.name } });
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

      return NextResponse.json({ success: true, archived: true });
    }

    await prisma.product.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
