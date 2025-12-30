import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import WaitlistForm from "../components/WaitlistForm";
import MathBackground from "../components/MathBackground";

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] bg-grid-white font-sans text-gray-900 dark:text-white selection:bg-gray-200 dark:selection:bg-gray-800 selection:text-black dark:selection:text-white overflow-x-hidden transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 lg:pt-48 lg:pb-40 overflow-hidden">
        {/* Math Flow Background */}
        <MathBackground />

        <div className="container mx-auto px-4 md:px-6 lg:px-12 relative z-10">
          <div className="flex flex-col lg:flex-col items-center gap-8 md:gap-16 text-center">
            {/* Hero Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-4xl mx-auto"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-900 border border-green-300 dark:border-green-700 rounded-full text-green-600 dark:text-green-400 text-xs font-medium uppercase tracking-wider mb-8 shadow-[0_0_20px_rgba(34,197,94,0.4)] dark:shadow-[0_0_20px_rgba(34,197,94,0.3)]"
              >
                <Sparkles className="w-3 h-3 text-green-500" />
                <span>AI-Powered Precision</span>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tighter text-gray-900 dark:text-white mb-6 md:mb-8 leading-none">
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="block"
                >
                  Master Math
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.3,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="text-gray-400 dark:text-gray-600 block"
                >
                  Step by Step.
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-500 dark:text-gray-400 mb-8 md:mb-10 max-w-2xl mx-auto font-light leading-relaxed px-2 md:px-0"
              >
                Teacher-quality explanations verified by symbolic AI. Understand
                the "why", not just the "what".
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4 sm:px-0 sm:w-auto"
              >
                <WaitlistForm source="landing_hero" />
              </motion.div>
            </motion.div>

            {/* Who is this for? Micro-section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="mt-12 text-center"
            >
              <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                Perfect for students preparing for exams, college math, and
                anyone tired of wrong AI answers.
              </p>
            </motion.div>

            {/* Hero Video Container */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-6xl mx-auto mt-16 px-4"
            >
              {/* Floating Animation Wrapper */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {/* Video Container */}
                <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  {/* Actual Video */}
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

                <div className="mt-6 text-center">
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">
                    No hallucinations. Every step checked.
                  </p>
                </div>

                {/* Glow effect behind */}
                <div className="absolute -inset-1 bg-linear-to-t from-blue-500/20 via-purple-500/20 to-transparent dark:from-blue-500/10 dark:via-purple-500/10 dark:to-transparent blur-3xl opacity-60 -z-10 rounded-xl"></div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-32 bg-white dark:bg-[#0a0a0a]">
        <div className="container mx-auto px-4 md:px-6 lg:px-12">
          <div className="grid md:grid-cols-3 gap-8 md:gap-12 lg:gap-16">
            <FeatureCard
              image="/feature-verification.png"
              title="Never get a wrong step"
              description="Zero hallucinations. Every step is mathematically verified by our symbolic engine."
              delay={0}
            />
            <FeatureCard
              image="/feature-education.png"
              title="Understand, don't memorize"
              description="Logic-based breakdowns that teach you the underlying concepts, not just the answer."
              delay={0.2}
            />
            <FeatureCard
              image="/feature-growth.png"
              title="Track how you improve"
              description="Your personal library of problems. Review, retry, and master topics over time."
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-gray-800 py-8 md:py-12">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center text-center md:text-left text-sm text-gray-500 dark:text-gray-400">
          <div className="flex flex-col items-center md:items-start gap-2">
            <p>&copy; {new Date().getFullYear()} NeoMath</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
              Built by an indie dev
            </span>
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

const FeatureCard = ({
  image,
  title,
  description,
  delay = 0,
}: {
  image: string;
  title: string;
  description: string;
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
      className="group flex flex-col items-center text-center md:items-start md:text-left p-2"
    >
      <div className="mb-6 w-full aspect-square relative bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden group-hover:border-gray-200 dark:group-hover:border-gray-700 transition-colors duration-300">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transform scale-100 group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        {/* Inner shadow/vignette for depth */}
        <div className="absolute inset-0 bg-radial-[circle_at_center,var(--tw-gradient-stops)] from-transparent to-gray-100/20 dark:to-black/20 pointer-events-none"></div>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 tracking-tight">
        {title}
      </h3>
      <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed font-light">
        {description}
      </p>
    </motion.div>
  );
};

export default Landing;
