// app/sitemap.ts
import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { absoluteUrl, getSiteUrl, safeCanonicalUrl, shouldIndexFromSitemapPayload } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/shop'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/categories'), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: absoluteUrl('/brands'), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: absoluteUrl('/about'), lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: absoluteUrl('/contact'), lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: absoluteUrl('/faq'), lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];

  const [products, categories, brands] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        slug: { not: '' },
      },
      select: {
        slug: true,
        canonicalUrl: true,
        updatedAt: true,
        sitemapIndexing: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 45000,
    }),
    prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null,
        slug: { not: '' },
      },
      select: { slug: true, updatedAt: true },
      orderBy: { sortOrder: 'asc' },
      take: 5000,
    }),
    prisma.brand.findMany({
      where: {
        isActive: true,
        slug: { not: '' },
      },
      select: { slug: true, updatedAt: true },
      orderBy: { name: 'asc' },
      take: 5000,
    }),
  ]);

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((product) => shouldIndexFromSitemapPayload(product.sitemapIndexing))
    .map((product) => ({
      url: safeCanonicalUrl(product.canonicalUrl, `/products/${product.slug}`),
      lastModified: product.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.85,
    }));

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: absoluteUrl(`/categories/${category.slug}`),
    lastModified: category.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.65,
  }));

  const brandRoutes: MetadataRoute.Sitemap = brands.map((brand) => ({
    url: absoluteUrl(`/brands/${brand.slug}`),
    lastModified: brand.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...brandRoutes];
}
