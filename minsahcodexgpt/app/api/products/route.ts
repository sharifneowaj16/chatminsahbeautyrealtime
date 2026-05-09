import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { adminHasPermission, getVerifiedAdmin } from '@/lib/auth/admin-request';
import { AdminProductError, createAdminProduct } from '@/lib/admin-products';

export const dynamic = 'force-dynamic';

function parseRelatedProducts(value: string | null): unknown {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
    return trimmed;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function getNumericFilter(value: string | null): number | null {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const category = searchParams.get('category')?.trim() || '';
    const brand = searchParams.get('brand')?.trim() || '';
    const featured = searchParams.get('featured') || '';
    const isNew = searchParams.get('new') || '';
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.min(500, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 20));
    const skip = (page - 1) * limit;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const slugParam = searchParams.get('slug')?.trim() || '';
    const minPrice = getNumericFilter(searchParams.get('minPrice'));
    const maxPrice = getNumericFilter(searchParams.get('maxPrice'));

    const where: Prisma.ProductWhereInput = { deletedAt: null };

    if (activeOnly) where.isActive = true;
    if (featured === 'true') where.isFeatured = true;
    if (isNew === 'true') where.isNew = true;
    if (slugParam) where.slug = slugParam;

    if (category) {
      where.category = {
        OR: [{ name: { contains: category, mode: 'insensitive' } }, { slug: category }],
      };
    }

    if (brand) {
      where.brand = {
        OR: [{ name: { contains: brand, mode: 'insensitive' } }, { slug: brand }],
      };
    }

    if (minPrice != null || maxPrice != null) {
      where.price = {
        ...(minPrice != null ? { gte: minPrice } : {}),
        ...(maxPrice != null ? { lte: maxPrice } : {}),
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const allowedSortFields: Record<string, Prisma.ProductOrderByWithRelationInput> = {
      createdAt: { createdAt: sortOrder },
      price: { price: sortOrder },
      name: { name: sortOrder },
      rating: { averageRating: sortOrder },
      reviewCount: { reviewCount: sortOrder },
    };
    const orderBy = allowedSortFields[sortBy] || { createdAt: 'desc' };

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 10 },
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          variants: {
            select: {
              id: true,
              sku: true,
              name: true,
              price: true,
              quantity: true,
              attributes: true,
              image: true,
            },
            take: 20,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const formatted = products.map((product) => {
      const mainImage = product.images.find((image) => image.isDefault) || product.images[0];
      const price = product.price.toNumber();
      const compareAtPrice = product.compareAtPrice ? product.compareAtPrice.toNumber() : null;

      return {
        id: product.id,
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        price,
        originalPrice: compareAtPrice,
        compareAtPrice,
        salePrice: product.salePrice ? product.salePrice.toNumber() : null,
        costPrice: product.costPrice ? product.costPrice.toNumber() : null,
        discountPercentage: product.discountPercentage?.toNumber() || 0,
        image: mainImage?.url || '',
        images: product.images.map((image) => ({
          url: image.url,
          alt: image.alt || product.name,
          title: image.title || product.name,
          sortOrder: image.sortOrder,
          isDefault: image.isDefault,
        })),
        stock: product.quantity,
        quantity: product.quantity,
        inStock: product.quantity > 0,
        lowStockThreshold: product.lowStockThreshold,
        trackInventory: product.trackInventory,
        allowBackorder: product.allowBackorder,
        category: product.category?.name || '',
        categoryId: product.categoryId || '',
        categorySlug: product.category?.slug || '',
        brand: product.brand?.name || '',
        brandId: product.brandId || '',
        brandSlug: product.brand?.slug || '',
        subcategory: product.subcategory || '',
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        isNew: product.isNew,
        status: !product.isActive ? 'inactive' : product.quantity === 0 ? 'out_of_stock' : 'active',
        featured: product.isFeatured,
        rating: product.averageRating?.toNumber() || 0,
        reviews: product.reviewCount || 0,
        reviewCount: product.reviewCount || 0,
        averageRating: product.averageRating?.toNumber() || 0,
        codAvailable: product.codAvailable,
        returnEligible: product.returnEligible,
        preOrderOption: product.preOrderOption,
        freeShippingEligible: !product.isFragile,
        metaTitle: product.metaTitle || '',
        metaDescription: product.metaDescription || '',
        metaKeywords: product.metaKeywords || '',
        tags: product.metaKeywords || '',
        bengaliName: product.bengaliName || '',
        bengaliDescription: product.bengaliDescription || '',
        focusKeyword: product.focusKeyword || '',
        ogTitle: product.ogTitle || '',
        ogImageUrl: product.ogImageUrl || '',
        canonicalUrl: product.canonicalUrl || '',
        skinType: product.skinType || [],
        ingredients: product.ingredients || '',
        shelfLife: product.shelfLife || '',
        expiryDate: product.expiryDate?.toISOString() || null,
        originCountry: product.originCountry || 'Bangladesh (Local)',
        weight: product.weight ? product.weight.toNumber() : null,
        length: product.length ? product.length.toNumber() : null,
        width: product.width ? product.width.toNumber() : null,
        height: product.height ? product.height.toNumber() : null,
        dimensions: {
          length: product.length ? product.length.toNumber().toString() : '',
          width: product.width ? product.width.toNumber().toString() : '',
          height: product.height ? product.height.toNumber().toString() : '',
        },
        shippingWeight: product.shippingWeight || '',
        isFragile: product.isFragile || false,
        flashSaleEligible: product.flashSaleEligible || false,
        offerStartDate: product.offerStartDate?.toISOString() || null,
        offerEndDate: product.offerEndDate?.toISOString() || null,
        barcode: product.barcode || '',
        condition: product.condition || 'NEW',
        gtin: product.gtin || '',
        relatedProducts: parseRelatedProducts(product.relatedProducts),
        hasVariants: product.variants.length > 0,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          name: variant.name,
          price: variant.price?.toNumber() ?? price,
          stock: variant.quantity,
          quantity: variant.quantity,
          attributes: variant.attributes || {},
          image: variant.image || null,
        })),
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      products: formatted,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/products error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch products', details: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_CREATE)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const product = await createAdminProduct(await request.json());

    return NextResponse.json(
      { success: true, product: { id: product.id, slug: product.slug, name: product.name } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AdminProductError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('POST /api/products error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
