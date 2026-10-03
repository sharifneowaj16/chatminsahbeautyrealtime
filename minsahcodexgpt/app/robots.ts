// app/robots.ts
import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: [
          'facebookexternalhit',
          'Facebot',
          'meta-externalagent',
          'meta-externalfetcher',
        ],
        allow: ['/', '/products/', '/api/meta/catalog/feed', '/api/meta/catalog/'],
        disallow: ['/admin/'],
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/account/',
          '/checkout/',
          '/cart/',
          '/login/',
          '/register/',
          '/reset-password/',
          '/forgot-password/',
          '/verify-otp/',
          '/wishlist/',
          '/favourites/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
