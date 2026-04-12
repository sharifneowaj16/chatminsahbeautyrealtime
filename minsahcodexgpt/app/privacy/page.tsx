export const metadata = {
  title: "Privacy Policy | Minsah Beauty",
  description:
    "Privacy Policy for Minsah Beauty covering account data, Facebook Login data, data usage, and customer rights.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Effective Date: April 2, 2026
          </p>
        </div>

        <div className="space-y-8 leading-7">
          <section>
            <p>
              Welcome to <strong>Minsah Beauty</strong> (
              <a
                href="https://minsahbeauty.cloud"
                className="text-blue-600 underline underline-offset-4"
              >
                minsahbeauty.cloud
              </a>
              ). We respect your privacy and are committed to protecting your
              personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">1. Information We Collect</h2>
            <p className="mt-3">
              We may collect the following personal information when you use our
              website or create an account:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Name</li>
              <li>Email address</li>
              <li>Profile picture, if provided through Facebook Login</li>
              <li>Delivery address and phone number for order processing</li>
              <li>Order and account activity related to purchases on our site</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. How We Use Your Information</h2>
            <p className="mt-3">We use your information to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Create and manage your account</li>
              <li>Allow you to sign in securely</li>
              <li>Process orders and deliveries</li>
              <li>Provide customer support</li>
              <li>Improve our website, products, and services</li>
              <li>Communicate important account or order updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Facebook Login</h2>
            <p className="mt-3">
              If you choose to log in using Facebook, we may receive basic
              profile information in accordance with the permissions you grant.
              This may include:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Your name</li>
              <li>Your email address</li>
              <li>Your profile picture</li>
            </ul>
            <p className="mt-3">
              This information is used only for authentication, account
              creation, and account access on Minsah Beauty.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Data Sharing</h2>
            <p className="mt-3">
              We do not sell or rent your personal information to third
              parties.
            </p>
            <p className="mt-3">
              We may share limited information only when necessary for:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Payment processing</li>
              <li>Order fulfillment and delivery services</li>
              <li>Legal compliance or lawful requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Data Security</h2>
            <p className="mt-3">
              We use reasonable technical and organizational safeguards to help
              protect your information from unauthorized access, misuse, or
              disclosure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Your Rights</h2>
            <p className="mt-3">You may request to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Access your personal information</li>
              <li>Correct or update your information</li>
              <li>Delete your account and personal data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Data Retention</h2>
            <p className="mt-3">
              We retain personal information only for as long as necessary to
              provide our services, comply with legal obligations, resolve
              disputes, and enforce our agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Third-Party Services</h2>
            <p className="mt-3">
              Our website may use trusted third-party services for payments,
              analytics, authentication, and order operations. These services
              may process data only as needed to perform their functions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Contact Us</h2>
            <p className="mt-3">
              If you have any questions about this Privacy Policy or your data,
              please contact us:
            </p>
            <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p>
                <strong>Minsah Beauty</strong>
              </p>
              <p>
                Website:{" "}
                <a
                  href="https://minsahbeauty.cloud"
                  className="text-blue-600 underline underline-offset-4"
                >
                  https://minsahbeauty.cloud
                </a>
              </p>
              <p>
                Email:{" "}
                <a
                  href="mailto:sharifneowaz577@gmail.com"
                  className="text-blue-600 underline underline-offset-4"
                >
                  sharifneowaz577@gmail.com
                </a>
              </p>
              <p>
                Facebook Page:{" "}
                <a
                  href="https://www.facebook.com/profile.php?id=61588399845702"
                  className="text-blue-600 underline underline-offset-4"
                  target="_blank"
                  rel="noreferrer"
                >
                  Minsah Beauty on Facebook
                </a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Changes to This Policy</h2>
            <p className="mt-3">
              We may update this Privacy Policy from time to time. Any updates
              will be posted on this page with a revised effective date.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
