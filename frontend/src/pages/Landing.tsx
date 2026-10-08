import type { ReactNode } from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import UserStats from "../components/UserStats";
import MathBackground from "../components/MathBackground";
import {
  HistoryPreview,
  StepPreview,
  SymbolBarPreview,
} from "../components/LandingPreviews";

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] font-sans text-gray-900 dark:text-white selection:bg-brand-500/20 overflow-x-hidden transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-12 md:pt-32 md:pb-16 lg:pt-40 lg:pb-20 overflow-hidden">
        {/* Math Flow Background */}
        <MathBackground />

        <div className="container mx-auto px-4 md:px-6 lg:px-12 relative z-10">
          <div className="flex flex-col items-center gap-6 md:gap-10 text-center">
            {/* Hero Text */}
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tighter text-gray-900 dark:text-white mb-6 md:mb-8 leading-none">
                <span className="block">Stuck on a problem?</span>
                <span className="block text-brand-600 dark:bg-linear-to-r dark:from-[#ffd166] dark:to-brand-300 dark:bg-clip-text dark:text-transparent">
                  See every step.
                </span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-400 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed px-2 md:px-0">
                Type your problem and get the full working, one step at a time,
                with a short reason for each step.
              </p>

              <div className="flex flex-col items-center w-full px-4 sm:px-0">
                <UserStats threshold={5} />
                <Link
                  to="/register"
                  className="group px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  Get started
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <p className="mt-8 text-sm text-gray-500 font-medium">
                Made for students revising for exams and working through college
                math.
              </p>
            </div>

            {/* Hero Video */}
            <div className="w-full max-w-6xl mx-auto px-4">
              <div className="relative bg-white dark:bg-[#151015] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                <video
                  className="w-full h-auto block"
                  autoPlay
                  loop
                  muted
                  playsInline
                >
                  <source src="/NeoMath_Hero.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What you get: real slices of the app in a bento grid */}
      <section className="py-16 md:py-24 bg-white dark:bg-[#0a0a0a]">
        <div className="container mx-auto px-4 md:px-6 lg:px-12 max-w-6xl">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter max-w-2xl">
            Built for the night before the exam.
          </h2>
          <p className="mt-4 text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-xl">
            Everything here is what you see inside NeoMath.
          </p>

          <div className="mt-10 md:mt-14 grid gap-4 md:grid-cols-3 md:grid-rows-2">
            <FeatureTile
              className="md:col-span-2 md:row-span-2"
              title="Every step, with the why"
              description="Each step shows the working and a one-line reason, so you can follow the method and use it on the next question."
            >
              <StepPreview />
            </FeatureTile>
            <FeatureTile
              title="A math keyboard built in"
              description="Tap ∫, √ or θ from the symbol bar, or type /int to insert ∫."
            >
              <SymbolBarPreview />
            </FeatureTile>
            <FeatureTile
              title="Your problems, saved"
              description="Everything you solve stays in your history, ready to review before a test."
            >
              <HistoryPreview />
            </FeatureTile>
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="py-16 md:py-24 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-white/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter">
            Got homework tonight?
          </h2>
          <p className="mt-4 text-base md:text-lg text-gray-600 dark:text-gray-400">
            Sign up with Google or email and solve your first problem in a
            minute.
          </p>
          <Link
            to="/register"
            className="group mt-8 inline-flex px-8 py-4 bg-brand-600 text-white rounded-full font-medium text-base items-center justify-center gap-2 hover:bg-brand-700 transition-colors"
          >
            Get started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-white/10 py-8 md:py-12">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center text-center md:text-left text-sm text-gray-500 dark:text-gray-400">
          <div className="flex flex-col items-center md:items-start gap-1">
            <p>&copy; {new Date().getFullYear()} NeoMath</p>
            <p>
              Built by{" "}
              <a
                href="https://x.com/AbhishekBalija1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
              >
                Abhishek Balija
              </a>
            </p>
          </div>
          <div className="flex space-x-6 md:space-x-8 mt-4 md:mt-0">
            <Link
              to="/privacy"
              className="hover:text-black dark:hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="hover:text-black dark:hover:text-white transition-colors"
            >
              Terms
            </Link>
            <a
              href="https://x.com/AbhishekBalija1"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-black dark:hover:text-white transition-colors"
            >
              Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureTile = ({
  title,
  description,
  className = "",
  children,
}: {
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) => {
  return (
    <div
      className={`flex flex-col rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#151015] p-3 ${className}`}
    >
      <div className="flex-1 min-h-56">{children}</div>
      <div className="px-3 pt-5 pb-3">
        <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};

export default Landing;
