import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-32 lg:pb-28">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-20">
            {/* Left Column: Text */}
            <div className="flex-1 text-center lg:text-left z-10">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
                Master Math <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-600">
                  Step-by-Step
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Get verified, teacher-style solutions for any math problem. Our
                AI ensures correctness with symbolic verification, so you can
                learn with confidence.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-4 text-center text-white bg-blue-600 rounded-xl font-semibold shadow-lg hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                >
                  Get Started
                </Link>
                <Link
                  to="/demo"
                  className="w-full sm:w-auto px-8 py-4 text-center text-gray-700 bg-white border border-gray-200 rounded-xl font-semibold shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-300"
                >
                  View Demo
                </Link>
              </div>
            </div>

            {/* Right Column: Image */}
            <div className="flex-1 relative w-full max-w-lg lg:max-w-xl">
              <div className="relative z-10 animate-float">
                <img
                  src="/hero-math.png"
                  alt="Math Verification Illustration"
                  className="w-full h-auto drop-shadow-2xl rounded-2xl"
                />
              </div>
              {/* Decorative Background Elements */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-linear-to-tr from-blue-100/50 to-indigo-100/50 rounded-full blur-3xl -z-10 opacity-70" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why MathGPT?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We don't just give answers. We help you understand the "why" and
              "how" with tools designed for learning.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="p-8 bg-gray-50 rounded-2xl transition-hover hover:shadow-lg hover:bg-blue-50/30 border border-transparent hover:border-blue-100">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Verified Accuracy
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Every step is checked by a symbolic math engine. Say goodbye to
                AI hallucinations and confident wrong answers.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 bg-gray-50 rounded-2xl transition-hover hover:shadow-lg hover:bg-indigo-50/30 border border-transparent hover:border-indigo-100">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 text-indigo-600">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Teacher-Style Explanations
              </h3>
              <p className="text-gray-600 leading-relaxed">
                We break down problems into logical steps with clear
                justifications, just like a tutor would explain it.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-gray-50 rounded-2xl transition-hover hover:shadow-lg hover:bg-purple-50/30 border border-transparent hover:border-purple-100">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-purple-600">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                History Tracking
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Review your past problems and solutions anytime. Your personal
                math library grows as you learn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MathGPT. All rights reserved.</p>
          <div className="mt-4 space-x-4">
            <Link
              to="/privacy"
              className="hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-gray-900 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
