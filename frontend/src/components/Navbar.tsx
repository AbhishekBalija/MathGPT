import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useThemeStore } from "../stores/themeStore";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close the menu whenever the page changes (a link, back or forward).
  // React's pattern for adjusting state when a value changes: compare during
  // render instead of using an effect.
  const [menuPath, setMenuPath] = useState(location.pathname);
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    setMobileMenuOpen(false);
  }
  const isLanding = location.pathname === "/";

  // Use centralized theme store
  const { isDark, initTheme, toggleTheme } = useThemeStore();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Initialize theme on mount
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || !isLanding
            ? "bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 lg:px-12 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src="/NeoMath-Logo.png"
              alt="NeoMath Logo"
              className="h-12 md:h-14 w-auto object-contain transition-transform group-hover:scale-110"
            />
            <span className="text-2xl md:text-3xl font-normal tracking-wider font-['Rye'] text-gray-900 dark:text-white">
              NeoMath
            </span>
          </Link>

          {/* Desktop Navigation - unchanged */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 text-sm font-medium text-white dark:text-black bg-black dark:bg-white rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-all hover:shadow-lg active:scale-95"
            >
              Sign up
            </Link>
          </div>

          {/* Mobile Navigation Controls */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Menu Panel */}
        <div
          className={`absolute top-0 right-0 w-72 h-full bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full pt-20 px-6">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="py-4 text-lg font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white border-b border-gray-100 dark:border-gray-800 transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="py-4 text-lg font-medium text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white border-b border-gray-100 dark:border-gray-800 transition-colors"
            >
              Sign up
            </Link>

            {/* CTA Button at bottom */}
            <div className="mt-auto pb-8">
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full py-4 text-center text-white dark:text-black bg-black dark:bg-white rounded-xl font-medium text-lg transition-all active:scale-95"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
