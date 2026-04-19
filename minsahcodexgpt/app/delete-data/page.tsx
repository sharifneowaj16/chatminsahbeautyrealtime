import type { Metadata } from 'next';
import Link from 'next/link';
import {
  DATA_DELETION_CALLBACK_URL,
  FACEBOOK_APP_SETTINGS_URL,
  LEGAL_EFFECTIVE_DATE,
  getPrivacyContactEmail,
} from '@/lib/privacy-policy';

export const metadata: Metadata = {
  title: 'Delete Data | Minsah Beauty',
  description:
    'Public data deletion instructions for Minsah Beauty and Facebook Login users.',
};

export default function DeleteDataPage() {
  const contactEmail = getPrivacyContactEmail();

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">User Data Deletion</h1>
          <p className="mt-3 text-sm text-gray-600">Effective Date: {LEGAL_EFFECTIVE_DATE}</p>
        </div>

        <div className="space-y-8 leading-7">
          <section>
            <p>
              This page explains how to request deletion of your Minsah Beauty account data,
              including data associated with Facebook Login.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">1. How to Request Deletion</h2>
            <p className="mt-3">
              Send a deletion request to{' '}
              <a href={`mailto:${contactEmail}`} className="text-blue-600 underline underline-offset-4">
                {contactEmail}
              </a>.
            </p>
            <p className="mt-3">Use the subject line <strong>Data Deletion Request</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. What Information to Send</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Your full name</li>
              <li>Your account email address</li>
              <li>Your Facebook-linked email address if you used Facebook Login</li>
              <li>Any recent order number or account detail that helps us verify the request</li>
            </ul>
            <p className="mt-3">Send your request with your account email whenever possible.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. What Happens Next</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>We review the request and verify account ownership</li>
              <li>We delete or anonymize eligible personal data associated with the account</li>
              <li>We may retain limited records when required for legal, tax, fraud, accounting, or order-history obligations</li>
              <li>We process verified requests within 7 to 30 days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Facebook Login Users</h2>
            <p className="mt-3">
              You can also remove the Minsah Beauty app from your Facebook settings to revoke
              Facebook access:
            </p>
            <p className="mt-3">
              <a
                href={FACEBOOK_APP_SETTINGS_URL}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline underline-offset-4"
              >
                {FACEBOOK_APP_SETTINGS_URL}
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Meta Callback Endpoint</h2>
            <p className="mt-3">
              For platform-level deletion callbacks, Minsah Beauty accepts POST requests at{' '}
              <code className="rounded bg-gray-100 px-2 py-1 text-sm">{DATA_DELETION_CALLBACK_URL}</code>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Related Privacy Policy</h2>
            <p className="mt-3">
              Read our full <Link href="/privacy-policy" className="text-blue-600 underline underline-offset-4">Privacy Policy</Link> for more details about collection, use, sharing, and retention of personal data.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
