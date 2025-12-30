import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-gray-900 dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 md:px-6 py-12 md:py-16 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Last updated: December 30, 2025
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Welcome to NeoMath ("we," "our," or "us"). We are committed to
              protecting your personal information and your right to privacy.
              This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our AI-powered math
              tutoring service.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              2. Information We Collect
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              We collect information that you provide directly to us:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>
                <strong>Account Information:</strong> Email address, name, and
                password when you create an account
              </li>
              <li>
                <strong>Usage Data:</strong> Math problems you submit, solutions
                generated, and your interaction history
              </li>
              <li>
                <strong>Payment Information:</strong> Billing details processed
                securely through our payment provider (we do not store your full
                payment card details)
              </li>
              <li>
                <strong>Communications:</strong> Any messages you send to us for
                support or feedback
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, IP address,
                and device identifiers for security and analytics
              </li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              3. How We Use Your Information
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Provide, maintain, and improve our math tutoring service</li>
              <li>Process your transactions and manage your subscription</li>
              <li>
                Send you technical notices, updates, and administrative messages
              </li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>
                Analyze usage patterns to improve our AI models and user
                experience
              </li>
              <li>Detect, prevent, and address technical issues and fraud</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              4. How We Share Your Information
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              We do not sell your personal information. We may share your
              information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>
                <strong>Service Providers:</strong> With third-party vendors who
                help us operate our service (e.g., hosting, payment processing,
                analytics)
              </li>
              <li>
                <strong>AI Processing:</strong> Math problems are processed
                using AI services to generate solutions; this data is used
                solely for providing the service
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law or to
                protect our rights and safety
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a
                merger, acquisition, or sale of assets
              </li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              We implement appropriate technical and organizational security
              measures to protect your personal information. However, no method
              of transmission over the Internet is 100% secure. We use
              industry-standard encryption (HTTPS/TLS) for data in transit and
              secure storage practices for data at rest.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              We retain your personal information for as long as your account is
              active or as needed to provide you services. You may request
              deletion of your account and associated data at any time by
              contacting us. We will delete or anonymize your information within
              30 days of such request, except where we are required to retain it
              for legal purposes.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify or update inaccurate information</li>
              <li>Request deletion of your personal data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability (receive your data in a usable format)</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
              To exercise these rights, please contact us at{" "}
              <a
                href="mailto:abhishekbalija@zohomail.in"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                abhishekbalija@zohomail.in
              </a>
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              8. Cookies and Tracking
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              We use cookies and similar technologies to maintain your session,
              remember your preferences, and analyze how you use our service.
              You can control cookies through your browser settings. Essential
              cookies are required for the service to function properly.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              9. Children's Privacy
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Our service is intended for users who are at least 13 years old.
              We do not knowingly collect personal information from children
              under 13. If we learn that we have collected information from a
              child under 13, we will delete it promptly.
            </p>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              10. International Data Transfers
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Your information may be transferred to and processed in countries
              other than your own. We ensure appropriate safeguards are in place
              to protect your information in accordance with this Privacy
              Policy.
            </p>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              11. Changes to This Policy
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new policy on this page
              and updating the "Last updated" date. Your continued use of the
              service after changes constitutes acceptance of the updated
              policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold mb-4">12. Contact Us</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              If you have any questions about this Privacy Policy or our data
              practices, please contact us at:
            </p>
            <p className="text-gray-600 dark:text-gray-300 mt-4">
              <strong>Email:</strong>{" "}
              <a
                href="mailto:abhishekbalija@zohomail.in"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                abhishekbalija@zohomail.in
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="container mx-auto px-4 md:px-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} NeoMath. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
