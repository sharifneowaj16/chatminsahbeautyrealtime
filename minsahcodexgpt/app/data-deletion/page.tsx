export const metadata = {
  title: "Data Deletion | Minsah Beauty",
  description:
    "Data deletion instructions for Minsah Beauty, including Facebook Login account data removal requests.",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Data Deletion
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Effective Date: April 2, 2026
          </p>
        </div>

        <div className="space-y-8 leading-7">
          <section>
            <p>
              At <strong>Minsah Beauty</strong>, we respect your privacy and
              provide a way for users to request deletion of their account and
              personal data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">1. Requesting Data Deletion</h2>
            <p className="mt-3">
              If you want us to delete your account and associated personal
              data, you can send a deletion request by email.
            </p>
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:sharifneowaz577@gmail.com"
                  className="text-blue-600 underline underline-offset-4"
                >
                  sharifneowaz577@gmail.com
                </a>
              </p>
              <p className="mt-2">
                Please use the subject line:{" "}
                <strong>Data Deletion Request</strong>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. What to Include</h2>
            <p className="mt-3">
              To help us identify your account, please include the following in
              your request:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Your full name</li>
              <li>Your email address</li>
              <li>Any order-related information that helps us verify ownership</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Processing Time</h2>
            <p className="mt-3">
              We aim to process verified deletion requests within 7 business
              days. Some limited information may be retained when required for
              legal, fraud prevention, tax, accounting, or order recordkeeping
              purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Facebook Login Users</h2>
            <p className="mt-3">
              If you signed in using Facebook, you can also remove our app from
              your Facebook account settings to revoke access to your Facebook
              data.
            </p>
            <p className="mt-3">
              Facebook app settings link:{" "}
              <a
                href="https://www.facebook.com/settings?tab=applications"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline underline-offset-4"
              >
                https://www.facebook.com/settings?tab=applications
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Scope of Deletion</h2>
            <p className="mt-3">
              Upon successful verification and processing of your request, we
              will delete or anonymize personal data associated with your
              account, except where retention is required by law or for
              legitimate business obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Contact</h2>
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
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
        </div>
      </section>
    </main>
  );
}
