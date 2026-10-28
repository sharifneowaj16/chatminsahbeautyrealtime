import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import AllPixels from '@/lib/tracking/pixels/AllPixels';
import { TrackingProvider } from '@/contexts/TrackingContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { CartDrawerProvider } from '@/contexts/CartDrawerContext';
import { DeliveryLocationProvider } from '@/contexts/DeliveryLocationContext';
import { getSiteConfig } from '@/lib/site-config';
import { getSiteUrl } from '@/lib/seo';
import { ToastProvider } from '@/components/ui/ToastProvider';

import { ConciergeModalCoordinator } from '@/components/concierge/ConciergeModalCoordinator';
import { StockAlertCoordinator } from '@/components/stock-alert/mobile/StockAlertCoordinator';
import NotificationPreviewModal from '@/components/notifications/preview/NotificationPreviewModal';
import DeliveryLocationModal from '@/components/delivery/location/DeliveryLocationModal';
import ProductComparisonDesktopModal from '@/components/compare/ProductComparisonDesktopModal';
import IOSSearchModalOverlay from '@/components/search/mobile/IOSSearchModalOverlay';
import MemberAuthModal from '@/components/auth/MemberAuthModal';

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

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
    <html lang="en" suppressHydrationWarning className={`${seedSans.variable} font-sans`}>
      <head>
        {/* iOS Diagnostic Banner: catches runtime JS errors, syntax errors, and hydration failures directly on iPhone */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function showDiag(msg, bg) {
                  var box = document.getElementById('__ios_diag');
                  if (!box) {
                    box = document.createElement('div');
                    box.id = '__ios_diag';
                    box.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:12px;font-size:12px;font-family:monospace;color:#fff;word-break:break-all;max-height:55vh;overflow:auto;background:' + (bg || '#b91c1c');
                    var btn = document.createElement('button');
                    btn.textContent = 'Test Native Tap';
                    btn.style.cssText = 'display:block;margin-bottom:8px;padding:6px 12px;background:#fff;color:#000;border-radius:6px;font-weight:bold;';
                    btn.onclick = function() { alert('Native JS tap works! Hydrated: ' + !!window.__REACT_HYDRATED__); };
                    box.appendChild(btn);
                    (document.body || document.documentElement).appendChild(box);
                  }
                  var row = document.createElement('div');
                  row.style.marginBottom = '6px';
                  row.textContent = msg;
                  box.appendChild(row);
                }
                window.addEventListener('error', function(e) {
                  if (e.target && e.target !== window) {
                    var src = e.target.src || e.target.href || '';
                    if (String(src).indexOf('_next') !== -1) showDiag('CHUNK LOAD ERROR: ' + src);
                    return;
                  }
                  showDiag('JS ERROR: ' + e.message + ' @ ' + (e.filename || '') + ':' + (e.lineno || ''));
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  var r = e.reason;
                  showDiag('PROMISE ERROR: ' + (r && (r.stack || r.message) ? (r.stack || r.message) : String(r)));
                });
                setTimeout(function() {
                  if (!window.__REACT_HYDRATED__) {
                    showDiag('NOT HYDRATED AFTER 5s | UA: ' + navigator.userAgent, '#b45309');
                  }
                }, 5000);
              })();
            `,
          }}
        />
        {/* iOS Safari: prevent auto-formatting of phone numbers/dates that causes React hydration mismatch #418 */}
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Bengali:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased overflow-x-clip min-h-screen min-h-[100dvh]">
        <ToastProvider>
          <TrackingProvider>
            <AuthProvider>
              <CartProvider>
                <CartDrawerProvider>
                  <DeliveryLocationProvider>
                    {children}
                    <DeliveryLocationModal />
                  </DeliveryLocationProvider>
                </CartDrawerProvider>
              </CartProvider>
            </AuthProvider>
          </TrackingProvider>
          <ConciergeModalCoordinator />
          <StockAlertCoordinator />
          <NotificationPreviewModal />
          <ProductComparisonDesktopModal />
          <IOSSearchModalOverlay />
          <MemberAuthModal />
        </ToastProvider>

        <AllPixels />
      </body>
    </html>
  );
}
