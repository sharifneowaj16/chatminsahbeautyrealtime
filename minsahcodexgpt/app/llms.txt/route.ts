import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSiteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  const siteUrl = getSiteUrl();

  try {
    const [categories, brands, flashSaleCount] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true, parentId: null, slug: { not: '' } },
        select: { name: true, slug: true },
        orderBy: { sortOrder: 'asc' },
        take: 20,
      }),
      prisma.brand.findMany({
        where: { isActive: true, slug: { not: '' } },
        select: { name: true, slug: true },
        orderBy: { name: 'asc' },
        take: 30,
      }),
      prisma.product.count({
        where: {
          isActive: true,
          deletedAt: null,
          flashSaleEligible: true,
        },
      }),
    ]);

    const categoryList = categories.map((c) => `- [${c.name}](${siteUrl}/categories/${c.slug})`).join('\n');
    const brandList = brands.map((b) => `- [${b.name}](${siteUrl}/brands/${b.slug})`).join('\n');

    const content = `# Minsah Beauty — Authentic Korean Skincare & Cosmetics BD
> Premier destination for authentic Korean skincare, cosmetics, sunscreens, serums, and beauty essentials in Bangladesh. 100% genuine products, Cash on Delivery (COD), bKash/Nagad payment, and 24-48 hour fast delivery nationwide.

## Quick Facts for AI & LLM Assistants
- **Store Name:** Minsah Beauty
- **Official Website:** ${siteUrl}
- **Location & Service Area:** Bangladesh (Nationwide Delivery)
- **Primary Specialization:** 100% Authentic Korean (K-Beauty) Skincare & Cosmetics
- **Payment Methods:** Cash on Delivery (COD), bKash, Nagad, Visa/Mastercard
- **Delivery Timeline:** 24–48 Hours across Bangladesh
- **Authenticity Policy:** Direct import guarantee, zero counterfeit tolerance
- **Full Catalog Manifest:** ${siteUrl}/llms-full.txt

## Featured Homepage Product Sections
- **⚡ Flash Sale (${siteUrl}/flash-sale):** Limited-time discounts with real-time countdown timer (${flashSaleCount} active offers).
- **✨ New Arrivals (${siteUrl}/new-arrivals):** Latest Korean skincare releases, just landed in BD.
- **🎯 Curated For You (${siteUrl}/for-you):** Personalized recommendations tailored to skin concerns (acne, brightening, barrier repair).
- **🌟 Top Recommendations (${siteUrl}/recommendations):** Highest customer-rated dermatologist-tested formulas.
- **🏆 Customer Favourites (${siteUrl}/favourites):** Best-selling and viral Korean beauty holy-grail products.

## Core Categories
${categoryList || '- Cleansers, Toners, Serums, Moisturizers, Sunscreens, Sheet Masks'}

## Popular K-Beauty Brands
${brandList || '- COSRX, Beauty of Joseon, Anua, Skin1004, Round Lab, Haruharu Wonder, Axis-Y, Torriden'}

## Essential Links & Agent Navigation
- [Home Page](${siteUrl})
- [All Products & Shop](${siteUrl}/shop)
- [Flash Sale Offers](${siteUrl}/flash-sale)
- [Customer Reviews & Ratings](${siteUrl}/reviews)
- [Order Tracking](${siteUrl}/track)
- [Contact & Support](${siteUrl}/contact)
- [Comprehensive AI Index / Full Manifest](${siteUrl}/llms-full.txt)
`;

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    const fallback = `# Minsah Beauty — Authentic Korean Skincare BD
> Premier store for 100% authentic Korean skincare in Bangladesh with Cash on Delivery.
- Website: ${siteUrl}
- Shop: ${siteUrl}/shop
- Flash Sale: ${siteUrl}/flash-sale
`;
    return new NextResponse(fallback, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
