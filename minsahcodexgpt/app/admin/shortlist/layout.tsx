// app/admin/shortlist/layout.tsx - PWA Meta Tags

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Purchase Shortlist | Admin Dashboard',
  description:
    'Fast supplier purchase checklist. Track which products need to be purchased from suppliers. Real-time order synchronization with automatic completion.',
  applicationName: 'Minsah Beauty Admin',
  manifest: '/shortlist-manifest.json',
  
  // PWA Icons
  icons: {
    icon: '/shortlist-icon-192.png',
    apple: '/shortlist-icon-192.png',
  },

  // Open Graph for share
  openGraph: {
    type: 'website',
    url: 'https://admin.minsahbeauty.cloud/admin/shortlist',
    title: 'Purchase Shortlist - Minsah Beauty Admin',
    description: 'Track supplier purchases in real-time',
    images: [
      {
        url: '/shortlist-og-image.png',
        width: 1200,
        height: 630,
      },
    ],
  },

  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'Purchase Shortlist',
    description: 'Fast supplier purchase tracker',
    images: ['/shortlist-og-image.png'],
  },
};

export const viewport: Viewport = {
  // Mobile optimization
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  
  // Theme colors for mobile browsers
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2937' },
  ],
};

export default function ShortlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
