import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Logo from "../brand/Logo";
import NeoMascot from "../brand/NeoMascot";

interface AuthLayoutProps {
  /** Small link in the top-right corner, e.g. "New here? Create an account". */
  corner?: ReactNode;
  children: ReactNode;
}

/** Steps illustration: light, and a dark version with a white rim (see docs/brand.md). */
const StepsScene = ({ className = "" }: { className?: string }) => (
  <>
    <img src="/brand/scene-steps.svg" alt="" className={`dark:hidden ${className}`} draggable={false} />
    <img src="/brand/scene-steps-dark.svg" alt="" className={`hidden dark:block ${className}`} draggable={false} />
  </>
);

/**
 * Shared frame for sign-in, sign-up and email verification.
 * Desktop: a pink panel with Neo on the left, the form on the right.
 * Phone: logo on top, Neo on his own, then the form (the full steps
 * illustration is too busy at that size, and two Neos side by side on
 * desktop would repeat, so Neo alone only shows on small screens).
 */
const AuthLayout = ({ corner, children }: AuthLayoutProps) => (
  <div className="min-h-screen grid lg:grid-cols-2 bg-white dark:bg-[#0d0a0d] text-gray-900 dark:text-white">
    {/* Left panel, desktop only */}
    <aside className="hidden lg:flex flex-col bg-[#fff4fa] dark:bg-[#170f15] px-10 py-8">
      <Link to="/" className="self-start">
        <Logo height="30px" />
      </Link>
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <StepsScene className="w-full max-w-md" />
        <p className="text-gray-500 dark:text-gray-400">Stuck on a problem? See every step.</p>
      </div>
    </aside>

    {/* Form side */}
    <main className="flex flex-col px-5 py-5 sm:px-10 sm:py-8">
      <div className="flex items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="lg:invisible [--logo-h:22px] sm:[--logo-h:26px]">
          <Logo height="var(--logo-h)" />
        </Link>
        <div>{corner}</div>
      </div>

      <div className="flex-1 flex flex-col justify-center w-full max-w-sm mx-auto py-8">
        <NeoMascot className="lg:hidden w-20 h-20 mx-auto mb-6" />
        {children}
      </div>
    </main>
  </div>
);

export default AuthLayout;
