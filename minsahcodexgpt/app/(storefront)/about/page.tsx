import type { Metadata } from 'next';
import { BadgeCheck, PackageCheck, ShieldCheck } from 'lucide-react';
import { absoluteUrl } from '@/lib/seo';
import { getEnabledPaymentMethodLabels } from '@/lib/payments/payment-methods';

export const metadata: Metadata = {
  title: 'About Minsah Beauty',
  description:
    'Learn about Minsah Beauty, a Bangladesh-based beauty shop offering authentic skincare, makeup and beauty products with nationwide delivery.',
  alternates: { canonical: absoluteUrl('/about') },
  openGraph: {
    title: 'About Minsah Beauty',
    description:
      'Bangladesh-based beauty shop for authentic skincare, makeup and beauty products with nationwide delivery.',
    url: absoluteUrl('/about'),
    images: [{ url: absoluteUrl('/images/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Minsah Beauty',
    description:
      'Bangladesh-based beauty shop for authentic skincare, makeup and beauty products with nationwide delivery.',
    images: [absoluteUrl('/images/og-default.jpg')],
  },
};

const enabledPaymentSummary = getEnabledPaymentMethodLabels().join(', ');

const values = [
  {
    title: 'Authenticity first',
    description: 'We focus on trusted sourcing and clear product information so customers can buy with confidence.',
    icon: ShieldCheck,
  },
  {
    title: 'Bangladesh delivery',
    description: 'Orders are prepared for nationwide delivery with Cash on Delivery and supported mobile payment options.',
    icon: PackageCheck,
  },
  {
    title: 'Helpful support',
    description: 'Customers can contact us before or after ordering for product, delivery and return-related questions.',
    icon: BadgeCheck,
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <h1 className="mb-6 text-4xl font-bold text-gray-900">About Minsah Beauty</h1>
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="space-y-5 text-gray-700 leading-7">
              <p>
                Minsah Beauty is a Bangladesh-based online beauty shop for skincare, makeup and
                daily beauty essentials. Our goal is to make it easier for customers in Bangladesh
                to discover authentic products, compare details clearly and order online with a
                convenient delivery experience.
              </p>
              <p>
                We do not use blanket claims such as every product being natural, toxin-free or
                cruelty-free unless that information is verified for the specific product. Product
                details, ingredients, availability and support information should be checked on the
                relevant product page or with our support team before ordering.
              </p>
              <p>
                Payment options currently enabled at checkout are {enabledPaymentSummary}. Delivery time and
                charge can vary by city, zone and courier availability.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {values.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-xl border border-minsah-border-soft bg-minsah-light p-6 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-minsah-primary">
                      <Icon className="h-8 w-8" />
                    </div>
                    <h2 className="mb-2 text-xl font-semibold text-gray-900">{item.title}</h2>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
