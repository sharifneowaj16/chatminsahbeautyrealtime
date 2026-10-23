import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSiteUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  const siteUrl = getSiteUrl();

  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        slug: { not: '' },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        salePrice: true,
        quantity: true,
        averageRating: true,
        flashSaleEligible: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: [{ flashSaleEligible: 'desc' }, { updatedAt: 'desc' }],
      take: 200,
    });

    const productRows = products.map((p) => {
      const brandName = p.brand?.name || 'Korean Beauty';
      const catName = p.category?.name || 'Skincare';
      const effectivePrice = p.salePrice && Number(p.salePrice) > 0 && Number(p.salePrice) < Number(p.price)
        ? `${p.salePrice} BDT (Original: ${p.price} BDT)`
        : `${p.price} BDT`;
      const stockStatus = (p.quantity ?? 0) > 0 ? 'In Stock' : 'Out of Stock';
      const flashBadge = p.flashSaleEligible ? ' [FLASH SALE]' : '';

      return `### ${p.name}${flashBadge}
- **Brand:** ${brandName}
- **Category:** ${catName}
- **Price:** ${effectivePrice}
- **Availability:** ${stockStatus}
- **URL:** ${siteUrl}/products/${p.slug}
`;
    }).join('\n');

    const content = `# Minsah Beauty — Full Product Catalog & AI Manifest
> Complete catalog of authentic Korean skincare and cosmetics available at Minsah Beauty in Bangladesh.
> Delivery: 24-48 Hours across Bangladesh | Payment: Cash on Delivery, bKash, Nagad | 100% Authentic Guaranteed.

## Active Products List (${products.length} Items)

${productRows}

---
Generated dynamically for AI Search Assistants (ChatGPT, Google Gemini, Perplexity, Claude).
Official website: ${siteUrl}
`;

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return new NextResponse(
      `# Minsah Beauty Full Catalog\nFailed to load dynamic catalog. Visit ${siteUrl}/shop for live products.`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  }
}
