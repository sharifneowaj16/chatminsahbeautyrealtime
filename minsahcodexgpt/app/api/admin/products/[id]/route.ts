// app/api/admin/products/[id]/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_PERMISSIONS } from '@/lib/auth/admin-permissions';
import { adminHasPermission, getVerifiedAdmin } from '@/lib/auth/admin-request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function splitStoredSubcategory(value: string | null): { subcategory: string; item: string } {
  if (!value) {
    return { subcategory: '', item: '' };
  }

  const [subcategory, ...itemParts] = value.split(' > ');
  return {
    subcategory: subcategory?.trim() || '',
    item: itemParts.join(' > ').trim(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getVerifiedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminHasPermission(admin, ADMIN_PERMISSIONS.PRODUCTS_VIEW)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: { AND: [{ OR: [{ id }, { slug: id }] }, { deletedAt: null }] },
      include: {
        images:   { orderBy: { sortOrder: 'asc' } },
        category: true,
        brand:    true,
        variants: { orderBy: { id: 'asc' } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const { subcategory, item } = splitStoredSubcategory(product.subcategory);

    return NextResponse.json({
      product: {
        id:               product.id,
        sku:              product.sku,
        name:             product.name,
        slug:             product.slug,
        description:      product.description      || '',
        shortDescription: product.shortDescription || '',

        // Pricing
        price:          product.price.toNumber(),
        compareAtPrice: product.compareAtPrice ? product.compareAtPrice.toNumber() : null,
        costPrice:      product.costPrice      ? product.costPrice.toNumber()      : null,

        // Inventory
        stock:             product.quantity,
        quantity:          product.quantity,
        lowStockThreshold: product.lowStockThreshold,
        trackInventory:    product.trackInventory,
        allowBackorder:    product.allowBackorder,

        // Physical — FIXED: dimensions returned individually
        weight: product.weight ? product.weight.toNumber() : null,
        dimensions: {
          length: product.length ? product.length.toNumber().toString() : '',
          width:  product.width  ? product.width.toNumber().toString()  : '',
          height: product.height ? product.height.toNumber().toString() : '',
        },

        // Status
        isActive:   product.isActive,
        isFeatured: product.isFeatured,
        isNew:      product.isNew,
        status:     !product.isActive ? 'inactive' : product.quantity === 0 ? 'out_of_stock' : 'active',
        featured:   product.isFeatured,

        // Category & Brand
        category:     product.category?.name || '',
        categoryId:   product.categoryId     || '',
        categorySlug: product.category?.slug || '',
        brand:        product.brand?.name    || '',
        brandId:      product.brandId        || '',
        brandSlug:    product.brand?.slug    || '',

        subcategory,
        item,

        // Images — FIXED: alt text properly returned
        images: product.images.map((img) => ({
          id:        img.id,
          url:       img.url,
          alt:       img.alt   || '',
          title:     img.title || '',
          sortOrder: img.sortOrder,
          isDefault: img.isDefault,
        })),

        // Variants — FIXED: image field included
        variants: product.variants.map((v) => ({
          id:         v.id,
          sku:        v.sku,
          name:       v.name,
          price:      v.price ? v.price.toNumber() : product.price.toNumber(),
          stock:      v.quantity,
          quantity:   v.quantity,
          attributes: v.attributes || {},
          image:      v.image || '',
          imageAlt:   '', // stored in attributes if needed
        })),

        // SEO
        metaTitle:          product.metaTitle          || '',
        metaDescription:    product.metaDescription    || '',
        tags:               product.metaKeywords        || '',
        metaKeywords:       product.metaKeywords        || '',
        bengaliName:        product.bengaliName        || '',
        bengaliDescription: product.bengaliDescription || '',
        focusKeyword:       product.focusKeyword       || '',
        ogTitle:            product.ogTitle            || '',
        ogImageUrl:         product.ogImageUrl         || '',
        canonicalUrl:       product.canonicalUrl       || '',

        // Structured Data
        condition:     product.condition     || 'NEW',
        gtin:          product.gtin          || '',
        averageRating: product.averageRating ? product.averageRating.toNumber() : 0,
        reviewCount:   product.reviewCount   || 0,

        // Beauty Specs — ALL INCLUDED
        skinType:      product.skinType      || [],
        ingredients:   product.ingredients   || '',
        shelfLife:     product.shelfLife     || '',
        expiryDate:    product.expiryDate ? product.expiryDate.toISOString().split('T')[0] : '',
        originCountry: product.originCountry || 'Bangladesh (Local)',

        // Shipping — ALL INCLUDED
        shippingWeight: product.shippingWeight || '',
        isFragile:      product.isFragile || false,

        // Discount & Offers
        discountPercentage: product.discountPercentage ? product.discountPercentage.toNumber().toString() : '',
        salePrice:          product.salePrice          ? product.salePrice.toNumber().toString()          : '',
        offerStartDate:     product.offerStartDate ? product.offerStartDate.toISOString().slice(0, 16) : '',
        offerEndDate:       product.offerEndDate   ? product.offerEndDate.toISOString().slice(0, 16)   : '',
        flashSaleEligible:  product.flashSaleEligible || false,

        // Commerce Options
        returnEligible:  product.returnEligible !== false,
        codAvailable:    product.codAvailable   !== false,
        preOrderOption:  product.preOrderOption  || false,
        barcode:         product.barcode         || '',
        relatedProducts: product.relatedProducts || '',

        // Timestamps
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching product (admin):', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
