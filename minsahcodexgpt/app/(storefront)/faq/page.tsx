import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { getEnabledPaymentMethodLabels } from '@/lib/payments/payment-methods';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers about Minsah Beauty delivery, payment, Cash on Delivery, returns and support in Bangladesh.',
  alternates: { canonical: absoluteUrl('/faq') },
  openGraph: {
    title: 'Minsah Beauty FAQ',
    description:
      'Find answers about delivery, payment, Cash on Delivery, returns and support in Bangladesh.',
    url: absoluteUrl('/faq'),
    images: [{ url: absoluteUrl('/images/og-default.jpg'), width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Minsah Beauty FAQ',
    description:
      'Find answers about delivery, payment, Cash on Delivery, returns and support in Bangladesh.',
    images: [absoluteUrl('/images/og-default.jpg')],
  },
};

const enabledPaymentLabels = getEnabledPaymentMethodLabels();
const paymentSummary = enabledPaymentLabels.join(', ');

const faqs = [
  {
    question: 'Are Minsah Beauty products authentic?',
    answer:
      'We focus on trusted sourcing and clearly display available product information on each product page. If you have a question about a specific item, contact us before ordering.',
  },
  {
    question: 'Do you deliver outside Dhaka?',
    answer:
      'Yes, Minsah Beauty can deliver across Bangladesh. Delivery time and charge may vary depending on your city, zone and courier availability.',
  },
  {
    question: 'Do you offer Cash on Delivery?',
    answer:
      `Eligible orders can use the payment methods currently enabled at checkout: ${paymentSummary}. Availability can depend on the order and delivery address.`,
  },
  {
    question: 'How long does delivery take?',
    answer:
      'Delivery time depends on your location and courier schedule. Dhaka orders are usually faster than outside-Dhaka orders. You will receive order updates after confirmation.',
  },
  {
    question: 'Can I return or exchange a product?',
    answer:
      'Return or exchange eligibility depends on the product condition, seal status and issue type. Please contact support as soon as possible after receiving your order.',
  },
  {
    question: 'How can I contact support?',
    answer:
      'You can contact Minsah Beauty through the phone, WhatsApp, email or contact form listed on the Contact page.',
  },
];

export default function FAQPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="flex-grow py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="mb-8 text-4xl font-bold text-gray-900">Frequently Asked Questions</h1>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-2 text-xl font-semibold text-gray-900">{faq.question}</h2>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
