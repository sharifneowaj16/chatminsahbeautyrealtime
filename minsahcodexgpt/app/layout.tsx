// app/layout.tsx
import type { Metadata } from "next";
import { Tenor_Sans, Lato, Inter, Mrs_Saint_Delafield } from "next/font/google";
import "./globals.css";
import SocialFloatingButtons from "./components/SocialFloatingButtons";
import { FacebookPixel } from "@/lib/facebook/pixel";
import AllPixels from "@/lib/tracking/pixels/AllPixels";
import { TrackingProvider } from "@/contexts/TrackingContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ProductsProvider } from "@/contexts/ProductsContext";

const tenorSans = Tenor_Sans({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-tenor-sans",
});

const lato = Lato({
  weight: ["300", "400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lato",
});

const circularStd = Inter({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-circular-std",
});

// ✅ FIX 1: Google Fonts manual <link> সরিয়ে Next.js font system এ নিলাম
// এটা render-blocking 750ms বাঁচাবে
const mrsSaintDelafield = Mrs_Saint_Delafield({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mrs-saint-delafield",
});

const BASE_URL = "https://minsahbeauty.cloud";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Minsah Beauty — অথেনটিক বিউটি প্রোডাক্ট বাংলাদেশ",
    template: "%s | Minsah Beauty",
  },
  description:
    "Minsah Beauty — বাংলাদেশের বিশ্বস্ত বিউটি শপ। Korean skincare, lip tint, serum, sunscreen, makeup সহ সব ধরনের অথেনটিক বিউটি প্রোডাক্ট পাবেন। Cash on Delivery সারা বাংলাদেশে।",
  keywords: [
    "beauty products bangladesh",
    "korean skincare bangladesh",
    "lip tint bd",
    "serum bangladesh",
    "sunscreen bd",
    "মিনসা বিউটি",
    "বিউটি প্রোডাক্ট বাংলাদেশ",
    "অথেনটিক কোরিয়ান স্কিনকেয়ার",
    "minsah beauty",
    "beauty shop dhaka",
  ],
  authors: [{ name: "Minsah Beauty", url: BASE_URL }],
  creator: "Minsah Beauty",
  publisher: "Minsah Beauty",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "bn_BD",
    alternateLocale: ["en_US"],
    url: BASE_URL,
    siteName: "Minsah Beauty",
    title: "Minsah Beauty — অথেনটিক বিউটি প্রোডাক্ট বাংলাদেশ",
    description:
      "বাংলাদেশে অথেনটিক Korean skincare, lip tint, serum, sunscreen কিনুন। Cash on Delivery সারা বাংলাদেশে।",
    images: [
      {
        url: `${BASE_URL}/images/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: "Minsah Beauty — Beauty Products Bangladesh",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Minsah Beauty — অথেনটিক বিউটি প্রোডাক্ট বাংলাদেশ",
    description: "বাংলাদেশে অথেনটিক বিউটি প্রোডাক্ট। Cash on Delivery সারা বাংলাদেশে।",
    images: [`${BASE_URL}/images/og-default.jpg`],
  },
  alternates: {
    canonical: BASE_URL,
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "Minsah Beauty",
  url: BASE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}/images/logo.png`,
    width: 300,
    height: 100,
  },
  description:
    "Minsah Beauty is Bangladesh's trusted beauty e-commerce store offering authentic Korean skincare, makeup, lip tints, serums, sunscreens and more. Cash on delivery available nationwide.",
  sameAs: [
    "https://www.facebook.com/minsahbeauty",
    "https://www.instagram.com/minsahbeauty",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    availableLanguage: ["Bengali", "English"],
    areaServed: "BD",
  },
  address: {
    "@type": "PostalAddress",
    addressCountry: "BD",
    addressRegion: "Dhaka",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BASE_URL}/#website`,
  name: "Minsah Beauty",
  url: BASE_URL,
  publisher: { "@id": `${BASE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
  inLanguage: ["bn-BD", "en-US"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      // ✅ FIX 1 continued: mrsSaintDelafield variable add করলাম
      className={`${tenorSans.variable} ${lato.variable} ${circularStd.variable} ${mrsSaintDelafield.variable}`}
    >
      <head>
        {/* ✅ FIX 1: manual <link> Google Fonts সরিয়ে দিলাম — এটাই 750ms block করছিল */}
        {/* <link href="https://fonts.googleapis.com/css2?family=Mrs+Saint+Delafield&display=swap" rel="stylesheet" /> */}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className={`${lato.variable} antialiased`}>
        {/* ✅ FIX 2: FacebookPixel এবং AllPixels body এর শেষে নিলাম */}
        {/* Main content আগে render হবে, pixel পরে load হবে */}
        <TrackingProvider>
          <AuthProvider>
            <ProductsProvider>
              <CartProvider>
                {children}
                <SocialFloatingButtons />
              </CartProvider>
            </ProductsProvider>
          </AuthProvider>
        </TrackingProvider>

        {/* ✅ FIX 2: Pixel scripts body এর একদম শেষে */}
        <FacebookPixel />
        <AllPixels />
      </body>
    </html>
  );
}
