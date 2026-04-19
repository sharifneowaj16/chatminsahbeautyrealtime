import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FACEBOOK_APP_SETTINGS_URL,
  LEGAL_EFFECTIVE_DATE,
  getPrivacyContactEmail,
} from '@/lib/privacy-policy';

export const metadata: Metadata = {
  title: 'Privacy Policy | Minsah Beauty',
  description:
    'Privacy Policy for minsahbeauty.cloud covering account, order, cookies, analytics, and Facebook Login data.',
};

export default function PrivacyPolicyPage() {
  const contactEmail = getPrivacyContactEmail();

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-gray-600">Effective Date: {LEGAL_EFFECTIVE_DATE}</p>
        </div>

        <div className="space-y-8 leading-7">
          <section>
            <p>
              This Privacy Policy explains how Minsah Beauty collects, uses, shares, and protects
              personal data when you visit <a href="https://minsahbeauty.cloud" className="text-blue-600 underline underline-offset-4">minsahbeauty.cloud</a>,
              create an account, place an order, contact us, or use Facebook Login.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">1. What Data We Collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Name, email address, phone number, and delivery address</li>
              <li>Account details such as login history, saved addresses, wishlist items, and order history</li>
              <li>Facebook data if you use Facebook Login, such as your Facebook name, email address, and profile image</li>
              <li>Order, payment, and shipping details needed to process purchases and deliveries</li>
              <li>Technical data such as IP address, browser type, device information, cookies, and analytics events</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. How Data Is Collected</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Directly from forms you submit on our website, including account, checkout, and contact forms</li>
              <li>Through Facebook Login when you choose to sign in with your Facebook account</li>
              <li>Automatically through cookies, pixels, and analytics tools that measure site usage and marketing performance</li>
              <li>From payment, delivery, and fraud-prevention workflows that support order fulfillment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Why We Collect Data</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>To create and manage user accounts</li>
              <li>To process orders, payments, shipping, and returns</li>
              <li>To communicate about orders, account activity, and customer support requests</li>
              <li>To improve website performance, product recommendations, and security</li>
              <li>To comply with legal, tax, accounting, and fraud-prevention requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. How We Use Data</h2>
            <p className="mt-3">
              We use personal data to authenticate users, deliver services, fulfill purchases,
              respond to inquiries, prevent abuse, analyze traffic, and maintain the security and
              reliability of our platform. We do not sell personal data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Data Sharing</h2>
            <p className="mt-3">We share data only when needed to operate the service, including with:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Payment gateways and payment processors</li>
              <li>Shipping and delivery partners</li>
              <li>Hosting, authentication, analytics, and infrastructure providers</li>
              <li>Professional advisers or authorities when legally required</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Data Security</h2>
            <p className="mt-3">
              We use reasonable administrative, technical, and organizational safeguards to protect
              personal data against unauthorized access, loss, misuse, or disclosure. No internet
              transmission or storage system can be guaranteed to be 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. User Rights</h2>
            <p className="mt-3">Subject to applicable law, you may request access to, correction of, or deletion of your personal data.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. User Data Deletion</h2>
            <p className="mt-3">
              You can request deletion of your account and associated personal data by emailing{' '}
              <a href={`mailto:${contactEmail}`} className="text-blue-600 underline underline-offset-4">
                {contactEmail}
              </a>.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Send your request using, or clearly include, the email address connected to your account</li>
              <li>We process verified deletion requests within 7 to 30 days</li>
              <li>You can also review the detailed deletion instructions on <Link href="/delete-data" className="text-blue-600 underline underline-offset-4">/delete-data</Link></li>
              <li>You can remove the app from your Facebook settings at <a href={FACEBOOK_APP_SETTINGS_URL} className="text-blue-600 underline underline-offset-4" target="_blank" rel="noreferrer">{FACEBOOK_APP_SETTINGS_URL}</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Contact Email</h2>
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p><strong>Minsah Beauty</strong></p>
              <p>
                Website:{' '}
                <a href="https://minsahbeauty.cloud" className="text-blue-600 underline underline-offset-4">
                  https://minsahbeauty.cloud
                </a>
              </p>
              <p>
                Email:{' '}
                <a href={`mailto:${contactEmail}`} className="text-blue-600 underline underline-offset-4">
                  {contactEmail}
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Updates to This Policy</h2>
            <p className="mt-3">
              We may update this Privacy Policy from time to time. Updates will be posted on this
              page with a revised effective date.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
