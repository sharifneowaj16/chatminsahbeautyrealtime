import type { Metadata } from 'next';
import './globals.css';
import SocialFloatingButtons from './components/SocialFloatingButtons';
import AllPixels from '@/lib/tracking/pixels/AllPixels';
import { TrackingProvider } from '@/contexts/TrackingContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';

const BASE_URL = 'https://minsahbeauty.cloud';

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
    width: 300,
    height: 100,
  },
  description:
    "Minsah Beauty is Bangladesh's trusted beauty e-commerce store offering authentic Korean skincare, makeup, lip tints, serums, sunscreens and more. Cash on delivery available nationwide.",
  sameAs: [
    'https://www.facebook.com/minsahbeauty',
    'https://www.instagram.com/minsahbeauty',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['Bengali', 'English'],
    areaServed: 'BD',
  },
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'BD',
    addressRegion: 'Dhaka',
  },
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
      urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
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
    <html lang="bn" className="font-sans">
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
        <TrackingProvider>
          <AuthProvider>
            <CartProvider>
              {children}
              <SocialFloatingButtons />
            </CartProvider>
          </AuthProvider>
        </TrackingProvider>

        <AllPixels />
      </body>
    </html>
  );
}
