// app/robots.ts
import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'Google-Extended',
          'ClaudeBot',
          'PerplexityBot',
          'Anthropic-ai',
          'cohere-ai',
        ],
        allow: ['/', '/llms.txt', '/llms-full.txt', '/products/', '/shop/', '/categories/', '/brands/', '/flash-sale/'],
        disallow: ['/admin/', '/api/', '/account/', '/checkout/', '/cart/'],
      },
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
        allow: ['/', '/llms.txt', '/llms-full.txt'],
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
