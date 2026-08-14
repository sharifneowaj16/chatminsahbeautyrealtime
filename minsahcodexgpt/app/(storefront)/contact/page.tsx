import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock3, Mail, MapPin, MessageCircle, PackageSearch, Phone } from 'lucide-react';
import ContactTrackingForm from './ContactTrackingForm';
import { getSiteConfig } from '@/lib/site-config';
import { absoluteUrl } from '@/lib/seo';

const site = getSiteConfig();
const { business, identity } = site;

export const metadata: Metadata = {
  title: 'Contact Minsah Beauty',
  description:
    'Contact Minsah Beauty for product questions, delivery support, payment help and order assistance in Bangladesh.',
  alternates: { canonical: absoluteUrl('/contact') },
  openGraph: {
    title: 'Contact Minsah Beauty',
    description: 'Get support for Minsah Beauty product, delivery, payment and order questions in Bangladesh.',
    url: absoluteUrl('/contact'),
    images: [{ url: absoluteUrl('/images/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Minsah Beauty',
    description: 'Get support for Minsah Beauty product, delivery, payment and order questions in Bangladesh.',
    images: [absoluteUrl('/images/og-default.jpg')],
  },
};

export default function ContactPage() {
  const contactSchema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': absoluteUrl('/contact#contactpage'),
    url: absoluteUrl('/contact'),
    name: `Contact ${identity.name}`,
    description: `${identity.name} customer support contact page for Bangladesh.`,
    isPartOf: { '@id': absoluteUrl('/#website') },
    mainEntity: {
      '@type': 'Organization',
      '@id': absoluteUrl('/#organization'),
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: business.supportEmail,
        ...(business.supportPhone ? { telephone: business.supportPhone } : {}),
        availableLanguage: ['Bengali', 'English'],
        areaServed: 'BD',
      },
      ...(site.socialLinks.length ? { sameAs: site.socialLinks.map((item) => item.href) } : {}),
      ...(business.businessAddress
        ? {
            address: {
              '@type': 'PostalAddress',
              streetAddress: business.businessAddress,
              addressCountry: 'BD',
            },
          }
        : {}),
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-minsah-page text-minsah-text">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />
      <div className="flex-grow py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-minsah-secondary">Customer care</p>
            <h1 className="mt-2 text-3xl font-black text-minsah-dark sm:text-4xl">Contact {identity.name}</h1>
            <p className="mt-3 text-sm leading-7 text-minsah-muted sm:text-base">
              Get help with products, payments, delivery and existing orders. Verified contact methods are shown below.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="minsah-panel p-5 sm:p-8" aria-labelledby="contact-form-heading">
              <h2 id="contact-form-heading" className="mb-6 text-2xl font-black text-minsah-dark">Send a message</h2>
              <ContactTrackingForm />
            </section>

            <aside className="minsah-panel p-5 sm:p-8" aria-labelledby="support-info-heading">
              <h2 id="support-info-heading" className="text-2xl font-black text-minsah-dark">Support information</h2>
              <div className="mt-6 space-y-4">
                <div className="flex gap-3 rounded-2xl bg-minsah-light p-4">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-minsah-primary" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold text-minsah-dark">Service area</h3>
                    <p className="mt-1 text-sm leading-6 text-minsah-muted">
                      {business.businessAddress || 'Online store serving customers across Bangladesh'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 rounded-2xl bg-minsah-light p-4">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-minsah-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-minsah-dark">Email</h3>
                    <a
                      href={`mailto:${business.supportEmail}`}
                      className="mt-1 inline-flex min-h-11 items-center break-all text-sm font-semibold text-minsah-primary underline decoration-minsah-secondary/40 underline-offset-4"
                    >
                      {business.supportEmail}
                    </a>
                  </div>
                </div>

                {business.supportPhone && business.supportPhoneHref ? (
                  <div className="flex gap-3 rounded-2xl bg-minsah-light p-4">
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-minsah-primary" aria-hidden="true" />
                    <div>
                      <h3 className="font-bold text-minsah-dark">Phone</h3>
                      <a
                        href={business.supportPhoneHref}
                        className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-minsah-primary underline decoration-minsah-secondary/40 underline-offset-4"
                      >
                        {business.supportPhone}
                      </a>
                    </div>
                  </div>
                ) : null}

                {business.whatsappUrl ? (
                  <div className="flex gap-3 rounded-2xl bg-minsah-light p-4">
                    <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-minsah-primary" aria-hidden="true" />
                    <div>
                      <h3 className="font-bold text-minsah-dark">WhatsApp</h3>
                      <a
                        href={business.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-minsah-primary underline decoration-minsah-secondary/40 underline-offset-4"
                      >
                        Start a support chat
                      </a>
                    </div>
                  </div>
                ) : null}

                <div className="flex gap-3 rounded-2xl bg-minsah-light p-4">
                  <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-minsah-primary" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold text-minsah-dark">Support hours</h3>
                    <p className="mt-1 text-sm leading-6 text-minsah-muted">
                      {business.supportHours || 'Send your message anytime. The support team will reply during the next available business period.'}
                    </p>
                  </div>
                </div>
              </div>

              <Link
                href="/track"
                className="minsah-control mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-minsah-primary px-4 py-3 text-sm font-bold text-white hover:bg-minsah-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minsah-focus focus-visible:ring-offset-2"
              >
                <PackageSearch size={18} aria-hidden="true" /> Track an existing order
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
