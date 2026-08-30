import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import AllPixels from '@/lib/tracking/pixels/AllPixels';
import { TrackingProvider } from '@/contexts/TrackingContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { CartDrawerProvider } from '@/contexts/CartDrawerContext';
import { getSiteConfig } from '@/lib/site-config';
import { getSiteUrl } from '@/lib/seo';
import { ToastProvider } from '@/components/ui/ToastProvider';

const seedSans = localFont({
  src: [
    {
      path: '../fonts/SeedSans-Light-subset.woff2',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../fonts/SeedSans-LightItalic-subset.woff2',
      weight: '300',
      style: 'italic',
    },
    {
      path: '../fonts/SeedSans-Regular-subset.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/SeedSans-RegularItalic-subset.woff2',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../fonts/SeedSans-Medium-subset.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/SeedSans-MediumItalic-subset.woff2',
      weight: '500',
      style: 'italic',
    },
  ],
  variable: '--font-seed-sans',
  display: 'swap',
});

const BASE_URL = getSiteUrl();
const siteConfig = getSiteConfig();
const businessProfile = siteConfig.business;
const businessSameAs = siteConfig.socialLinks.map((item) => item.href);

const SITE_TITLE = 'Minsah Beauty - Authentic Beauty Products Bangladesh';
const SITE_DESCRIPTION =
  'Shop authentic Korean skincare, lip tint, serum, sunscreen, makeup, and beauty products in Bangladesh with cash on delivery nationwide.';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s | Minsah Beauty',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'beauty products bangladesh',
    'korean skincare bangladesh',
    'lip tint bd',
    'serum bangladesh',
    'sunscreen bd',
    'authentic beauty products bd',
    'minsah beauty',
    'beauty shop dhaka',
  ],
  authors: [{ name: 'Minsah Beauty', url: BASE_URL }],
  creator: 'Minsah Beauty',
  publisher: 'Minsah Beauty',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'bn_BD',
    alternateLocale: ['en_US'],
    url: BASE_URL,
    siteName: 'Minsah Beauty',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${BASE_URL}/images/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: 'Minsah Beauty - Beauty Products Bangladesh',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [`${BASE_URL}/images/og-default.jpg`],
  },
  alternates: {
    canonical: BASE_URL,
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${BASE_URL}/#organization`,
  name: 'Minsah Beauty',
  url: BASE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${BASE_URL}/images/logo.png`,
    width: 512,
    height: 512,
  },
  description:
    "Minsah Beauty is Bangladesh's trusted beauty e-commerce store offering authentic Korean skincare, makeup, lip tints, serums, sunscreens and more. Cash on delivery available nationwide.",
  ...(businessSameAs.length ? { sameAs: businessSameAs } : {}),
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: businessProfile.supportEmail,
    ...(businessProfile.supportPhone ? { telephone: businessProfile.supportPhone } : {}),
    availableLanguage: ['Bengali', 'English'],
    areaServed: 'BD',
  },
  ...(businessProfile.businessAddress
    ? {
        address: {
          '@type': 'PostalAddress',
          streetAddress: businessProfile.businessAddress,
          addressCountry: 'BD',
          addressRegion: 'Dhaka',
        },
      }
    : {
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'BD',
          addressRegion: 'Dhaka',
        },
      }),
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${BASE_URL}/#website`,
  name: 'Minsah Beauty',
  url: BASE_URL,
  publisher: { '@id': `${BASE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE_URL}/shop?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
  inLanguage: ['bn-BD', 'en-US'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${seedSans.variable} font-sans`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="antialiased">
        <ToastProvider>
          <TrackingProvider>
            <AuthProvider>
              <CartProvider>
                <CartDrawerProvider>{children}</CartDrawerProvider>
              </CartProvider>
            </AuthProvider>
          </TrackingProvider>
        </ToastProvider>

        <AllPixels />
      </body>
    </html>
  );
}
