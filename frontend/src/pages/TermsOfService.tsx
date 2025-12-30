import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
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
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Terms of Service
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Last updated: December 30, 2025
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          {/* Agreement */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              1. Agreement to Terms
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              By accessing or using NeoMath ("the Service"), you agree to be
              bound by these Terms of Service ("Terms"). If you do not agree to
              these Terms, please do not use our Service. We reserve the right
              to update these Terms at any time, and your continued use
              constitutes acceptance of any changes.
            </p>
          </section>

          {/* Description of Service */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              2. Description of Service
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              NeoMath is an AI-powered math tutoring service that provides
              step-by-step solutions and explanations for mathematical problems.
              Our service uses artificial intelligence to analyze problems and
              generate educational content. While we strive for accuracy, the
              Service is intended for educational purposes and should not be
              relied upon as the sole source of mathematical verification.
            </p>
          </section>

          {/* Account Registration */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              3. Account Registration
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              To access certain features, you must create an account. You agree
              to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>
                Notify us immediately of any unauthorized use of your account
              </li>
              <li>Be responsible for all activities under your account</li>
              <li>
                Not share your account or allow others to access your account
              </li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
              You must be at least 13 years old to create an account. Users
              under 18 should have parental or guardian consent.
            </p>
          </section>

          {/* Subscription and Payments */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              4. Subscription and Payments
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              NeoMath offers both free and paid subscription plans:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>
                <strong>Free Tier:</strong> Limited to 15 problems per day
              </li>
              <li>
                <strong>Paid Plans:</strong> Unlimited access to features as
                described on our pricing page
              </li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
              Paid subscriptions are billed in advance on a recurring basis
              (monthly or annually). You authorize us to charge your payment
              method for recurring fees until you cancel your subscription.
            </p>
          </section>

          {/* Refund Policy */}
          <section>
            <h2 className="text-xl font-semibold mb-4">5. Refund Policy</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              We want you to be satisfied with our Service:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>
                <strong>7-Day Money-Back Guarantee:</strong> If you are not
                satisfied within the first 7 days of your paid subscription, you
                may request a full refund
              </li>
              <li>
                <strong>After 7 Days:</strong> Refunds are generally not
                provided, but we may consider exceptions on a case-by-case basis
              </li>
              <li>
                <strong>Cancellation:</strong> You may cancel your subscription
                at any time. You will retain access until the end of your
                current billing period
              </li>
            </ul>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
              To request a refund, please contact us at{" "}
              <a
                href="mailto:abhishekbalija@zohomail.in"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                abhishekbalija@zohomail.in
              </a>
            </p>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-xl font-semibold mb-4">6. Acceptable Use</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-300 space-y-2">
              <li>
                Use the Service for any illegal purpose or in violation of any
                laws
              </li>
              <li>Attempt to bypass any usage limits or security measures</li>
              <li>
                Use automated systems (bots, scrapers) to access the Service
                without permission
              </li>
              <li>
                Reverse engineer, decompile, or attempt to extract source code
              </li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>
                Resell, redistribute, or commercially exploit the Service
                without authorization
              </li>
              <li>
                Submit content that is offensive, harmful, or violates others'
                rights
              </li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              7. Intellectual Property
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              <strong>Our Content:</strong> The Service, including its design,
              features, and content, is owned by NeoMath and protected by
              intellectual property laws. You may not copy, modify, or
              distribute our materials without permission.
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              <strong>Your Content:</strong> You retain ownership of the math
              problems you submit. By using the Service, you grant us a license
              to process your submissions to provide the Service and improve our
              AI models.
            </p>
          </section>

          {/* AI-Generated Content */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              8. AI-Generated Content Disclaimer
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              NeoMath uses artificial intelligence to generate mathematical
              solutions. While we employ verification systems to ensure
              accuracy, AI-generated content may occasionally contain errors.
              The Service is provided for educational and informational purposes
              only. We do not guarantee the accuracy, completeness, or
              reliability of any solutions. You should verify important
              calculations independently and not rely solely on our Service for
              academic submissions or professional work.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              9. Limitation of Liability
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEOMATH SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS,
              DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL
              LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE
              (12) MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          {/* Disclaimer of Warranties */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              10. Disclaimer of Warranties
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
              WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT
              NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR
              A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT
              THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-xl font-semibold mb-4">11. Indemnification</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              You agree to indemnify and hold harmless NeoMath and its officers,
              directors, employees, and agents from any claims, damages, losses,
              or expenses (including reasonable attorney fees) arising from your
              use of the Service or violation of these Terms.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-xl font-semibold mb-4">12. Termination</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              We may suspend or terminate your access to the Service at any time
              for violation of these Terms or for any other reason at our
              discretion. Upon termination, your right to use the Service will
              immediately cease. You may also delete your account at any time
              through your account settings.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-xl font-semibold mb-4">13. Governing Law</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              These Terms shall be governed by and construed in accordance with
              the laws of India, without regard to its conflict of law
              provisions. Any disputes arising from these Terms shall be
              resolved in the courts of India.
            </p>
          </section>

          {/* Severability */}
          <section>
            <h2 className="text-xl font-semibold mb-4">14. Severability</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              If any provision of these Terms is found to be unenforceable or
              invalid, that provision shall be limited or eliminated to the
              minimum extent necessary, and the remaining provisions shall
              remain in full force and effect.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold mb-4">15. Contact Us</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              If you have any questions about these Terms, please contact us at:
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

export default TermsOfService;
