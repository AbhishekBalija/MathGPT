import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  BookOpen,
  Clock,
  ArrowRight,
  Play,
  Sparkles,
} from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] bg-grid-white font-sans text-gray-900 dark:text-white selection:bg-gray-200 dark:selection:bg-gray-800 selection:text-black dark:selection:text-white overflow-x-hidden transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-40 overflow-hidden">
        {/* Subtle Background Gradient - Lower Z-index */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-gray-100 via-[#fafafa] to-[#fafafa] dark:from-gray-900 dark:via-[#0a0a0a] dark:to-[#0a0a0a] opacity-80 pointer-events-none"></div>

        {/* --- Grid Light Beads (The "Roaming Dots" Effect) --- 
            Strictly aligned to 50px increments to match background-size 
            Updated colors for Light Mode visibility
        */}

        {/* Vertical Bead 1 - Left: 150px */}
        <div
          className="absolute top-0 w-[3px] h-full overflow-hidden z-0 pointer-events-none hidden md:block"
          style={{ left: "150px" }}
        >
          <div
            className="absolute top-0 left-0 w-[3px] h-[3px] rounded-full bg-blue-600 dark:bg-blue-400 animate-grid-bead-v shadow-[0_0_10px_2px_rgba(37,99,235,0.5)] dark:shadow-[0_0_10px_2px_rgba(96,165,250,0.8)]"
            style={{ animationDuration: "4s", animationDelay: "1s" }}
          ></div>
        </div>

        {/* Vertical Bead 2 - Left: 450px */}
        <div
          className="absolute top-0 w-[3px] h-full overflow-hidden z-0 pointer-events-none hidden md:block"
          style={{ left: "450px" }}
        >
          <div
            className="absolute top-0 left-0 w-[3px] h-[3px] rounded-full bg-indigo-600 dark:bg-indigo-400 animate-grid-bead-v shadow-[0_0_10px_2px_rgba(79,70,229,0.5)] dark:shadow-[0_0_10px_2px_rgba(129,140,248,0.8)]"
            style={{ animationDuration: "6s", animationDelay: "0s" }}
          ></div>
        </div>

        {/* Vertical Bead 3 - Left: 800px (Multiples of 50) */}
        <div
          className="absolute top-0 w-[3px] h-full overflow-hidden z-0 pointer-events-none hidden lg:block"
          style={{ left: "800px" }}
        >
          <div
            className="absolute top-0 left-0 w-[3px] h-[3px] rounded-full bg-purple-600 dark:bg-purple-400 animate-grid-bead-v shadow-[0_0_10px_2px_rgba(147,51,234,0.5)] dark:shadow-[0_0_10px_2px_rgba(192,132,252,0.8)]"
            style={{ animationDuration: "7s", animationDelay: "2s" }}
          ></div>
        </div>

        {/* Horizontal Bead 1 - Top: 150px */}
        <div
          className="absolute left-0 h-[3px] w-full overflow-hidden z-0 pointer-events-none hidden md:block"
          style={{ top: "150px" }}
        >
          <div
            className="absolute top-0 left-0 w-[3px] h-[3px] rounded-full bg-cyan-600 dark:bg-cyan-400 animate-grid-bead-h shadow-[0_0_10px_2px_rgba(8,145,178,0.5)] dark:shadow-[0_0_10px_2px_rgba(34,211,238,0.8)]"
            style={{ animationDuration: "5s", animationDelay: "3s" }}
          ></div>
        </div>

        {/* Horizontal Bead 2 - Top: 400px */}
        <div
          className="absolute left-0 h-[3px] w-full overflow-hidden z-0 pointer-events-none hidden md:block"
          style={{ top: "400px" }}
        >
          <div
            className="absolute top-0 left-0 w-[3px] h-[3px] rounded-full bg-blue-600 dark:bg-blue-500 animate-grid-bead-h shadow-[0_0_10px_2px_rgba(37,99,235,0.5)] dark:shadow-[0_0_10px_2px_rgba(59,130,246,0.8)]"
            style={{ animationDuration: "8s", animationDelay: "0.5s" }}
          ></div>
        </div>

        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          <div className="flex flex-col lg:flex-col items-center gap-16 text-center">
            {/* Hero Text */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-4xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-8 shadow-sm">
                <Sparkles className="w-3 h-3 text-gray-400" />
                <span>AI-Powered Precision</span>
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tighter text-gray-900 dark:text-white mb-8 leading-none">
                Master Math, <br />
                <span className="text-gray-400 dark:text-gray-600">
                  Step by Step.
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
                Teacher-quality explanations verified by symbolic AI. Understand
                the "why", not just the "what".
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/login"
                  className="group relative px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium text-lg overflow-hidden transition-all hover:pr-10"
                >
                  <span className="relative z-10">Start Learning Free</span>
                  <ArrowRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white dark:text-black opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </Link>
              </div>
            </motion.div>

            {/* Hero Video Container */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-5xl mx-auto"
            >
              {/* Taller Aspect Ratio for Cinematic Feel */}
              <div className="relative aspect-16/10 md:aspect-21/9 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden group">
                {/* Browser Toolbar (Keep it minimal) */}
                <div className="absolute top-0 left-0 right-0 h-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 flex items-center px-4 z-20">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  </div>
                </div>

                {/* Video Placeholder Content */}
                <div className="absolute inset-0 pt-8 bg-gray-50 dark:bg-gray-950 flex items-center justify-center group-hover:bg-gray-100/50 dark:group-hover:bg-gray-900/50 transition-colors duration-500">
                  <div className="text-center">
                    <button className="w-20 h-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-gray-100 dark:border-gray-700 mb-4 mx-auto group-hover:scale-105 transition-transform duration-300">
                      <Play
                        className="w-8 h-8 text-black dark:text-white ml-1"
                        fill="currentColor"
                      />
                    </button>
                    <p className="text-sm text-gray-400 font-mono uppercase tracking-widest">
                      Watch Demo
                    </p>
                  </div>
                </div>
              </div>

              {/* Glow effect behind */}
              <div className="absolute -inset-1 bg-linear-to-t from-gray-200 via-gray-100 to-transparent dark:from-gray-800 dark:via-gray-900 dark:to-transparent blur-3xl opacity-40 -z-10"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-white dark:bg-[#0a0a0a]">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
            <MinimalFeatureCard
              icon={<CheckCircle2 className="w-5 h-5" />}
              title="Verified Accuracy"
              description="Zero hallucinations. Every step is mathematically verified by our symbolic engine."
            />
            <MinimalFeatureCard
              icon={<BookOpen className="w-5 h-5" />}
              title="Teacher Explanations"
              description="Logic-based breakdowns that teach you the underlying concepts, not just the answer."
            />
            <MinimalFeatureCard
              icon={<Clock className="w-5 h-5" />}
              title="Smart History"
              description="Your personal library of problems. Review, retry, and master topics over time."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-gray-800 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} MathGPT</p>
          <div className="flex space-x-8 mt-4 md:mt-0">
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
            <Link
              to="#"
              className="hover:text-black dark:hover:text-white transition-colors"
            >
              Twitter
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

const MinimalFeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) => {
  return (
    <div className="group flex flex-col items-start p-2">
      <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white group-hover:bg-black dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-black transition-colors duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 tracking-tight">
        {title}
      </h3>
      <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed font-light">
        {description}
      </p>
    </div>
  );
};

export default Landing;
