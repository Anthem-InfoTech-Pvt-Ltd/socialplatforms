import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | SocialHub",
  description:
    "Privacy Policy for SocialHub - Social Media Management Dashboard",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "June 28, 2026";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-xl bg-white p-8 shadow">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Privacy Policy
          </h1>

          <p className="mb-8 text-sm text-gray-500">
            Last Updated: {lastUpdated}
          </p>

          <div className="space-y-8 text-gray-700 leading-7">
            <section>
              <h2 className="mb-3 text-2xl font-semibold">
                1. Introduction
              </h2>

              <p>
                Welcome to <strong>SocialHub</strong>. Your privacy is important
                to us. This Privacy Policy explains what information we collect,
                how we use it, and how we protect your information when you use
                our platform.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">
                2. Information We Collect
              </h2>

              <p>We may collect the following information:</p>

              <ul className="mt-3 list-disc pl-6 space-y-2">
                <li>Name and email address.</li>
                <li>Profile information from connected social media accounts.</li>
                <li>Access tokens required for social media integrations.</li>
                <li>Social media account IDs.</li>
                <li>Posts, analytics, and engagement data you choose to manage.</li>
                <li>Technical information such as browser type and IP address.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">
                3. How We Use Your Information
              </h2>

              <ul className="list-disc pl-6 space-y-2">
                <li>Authenticate your account.</li>
                <li>Connect your social media profiles.</li>
                <li>Publish and manage social media content.</li>
                <li>Display analytics and performance metrics.</li>
                <li>Improve our services and user experience.</li>
                <li>Provide customer support.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">
                4. Social Media Integrations
              </h2>

              <p>
                SocialHub may request permission to access your connected social
                media accounts through official APIs provided by platforms such
                as Facebook, Instagram, LinkedIn, and X (Twitter).
              </p>

              <p className="mt-4">
                We only request permissions necessary to provide the features
                you choose to use.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">
                5. Data Security
              </h2>

              <p>
                We use industry-standard security measures to help protect your
                information from unauthorized access, disclosure, or misuse.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">
                6. Data Sharing
              </h2>

              <p>
                We do not sell, rent, or trade your personal information to
                third parties.
              </p>

              <p className="mt-4">
                Your data may only be shared when required by law or to provide
                requested services through official third-party APIs.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">
                7. Cookies
              </h2>

              <p>
                We may use cookies and similar technologies to improve your
                browsing experience, maintain authentication sessions, and
                analyze website usage.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">
                8. Your Rights
              </h2>

              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal information.</li>
                <li>Request correction of inaccurate information.</li>
                <li>Request deletion of your account and associated data.</li>
                <li>Disconnect connected social media accounts at any time.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">
                9. Third-Party Services
              </h2>

              <p>
                SocialHub integrates with trusted third-party services including
                social media providers and cloud infrastructure providers.
                Please review their respective privacy policies for additional
                information.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">
                10. Changes to This Policy
              </h2>

              <p>
                We may update this Privacy Policy from time to time. Any changes
                will be posted on this page with an updated revision date.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">
                11. Contact Us
              </h2>

              <p>
                If you have any questions regarding this Privacy Policy, please
                contact us.
              </p>

              <div className="mt-4 rounded-lg border bg-gray-100 p-4">
                <p>
                  <strong>Application:</strong> SocialHub
                </p>

                <p>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:support@socialhub.app"
                    className="text-blue-600 hover:underline"
                  >
                    support@socialhub.app
                  </a>
                </p>

                <p>
                  <strong>Website:</strong>{" "}
                  <Link
                    href="/"
                    className="text-blue-600 hover:underline"
                  >
                    Home
                  </Link>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}