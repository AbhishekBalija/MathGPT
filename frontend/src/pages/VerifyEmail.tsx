import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { useAuthStore } from "../stores/authStore";
import authService from "../services/auth.service";
import Logo from "../components/brand/Logo";

// Shown after email sign-up, and whenever solving says the email is not verified.
// Arriving with { sendCode: true } (from login or a refused solve) means there may
// be no live code, so the page asks for a fresh one straight away.
const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const shouldSendCode =
    (location.state as { sendCode?: boolean } | null)?.sendCode === true;
  const sentOnArrival = useRef(false);
  const { user, setEmailVerified, logout } = useAuthStore();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  // Seconds until another code may be requested
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    // The ref stops React's development double-mount from sending two codes
    if (!shouldSendCode || sentOnArrival.current) return;
    sentOnArrival.current = true;
    void handleResend();
  }, [shouldSendCode]);

  if (user?.emailVerified) {
    return <Navigate to="/app" replace />;
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setIsVerifying(true);
    try {
      await authService.verifyEmail(code);
      setEmailVerified(true);
      navigate("/app", { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Could not verify your email. Please try again.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    setIsResending(true);
    try {
      const { message } = await authService.resendVerification();
      setNotice(message);
      setCode("");
      setCooldown(60);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        setCooldown(Number(err.response.data?.retryAfter) || 60);
        setError(err.response.data?.error ?? "Please wait before requesting another code.");
      } else if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Could not send a new code. Please try again.");
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleUseAnotherAccount = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] bg-grid-white px-4 py-8 sm:py-12 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="w-full max-w-[500px] space-y-6 sm:space-y-8 bg-white dark:bg-gray-900 p-6 sm:p-10 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center mb-6 sm:mb-8 [--logo-h:28px] sm:[--logo-h:34px]"
          >
            <Logo height="var(--logo-h)" />
          </Link>

          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Verify your email
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {shouldSendCode ? "We're sending a 6-digit code to" : "We sent a 6-digit code to"}{" "}
            <span className="font-medium text-gray-900 dark:text-white">
              {user?.email ?? "your email"}
            </span>
            . It expires in 15 minutes.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm font-medium"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm font-medium"
          >
            {notice}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleVerify}>
          <div>
            <label
              htmlFor="verification-code"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Verification code
            </label>
            <input
              id="verification-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={isVerifying}
              className="block w-full rounded-xl border-gray-200 dark:border-gray-700 py-3 px-4 text-center text-2xl tracking-[0.5em] text-gray-900 dark:text-white shadow-sm placeholder:text-gray-300 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-gray-50/50 dark:bg-gray-800 transition-all font-medium"
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || code.length !== 6}
            className="group relative flex w-full justify-center rounded-xl bg-black dark:bg-white px-3 py-3.5 text-sm font-semibold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isVerifying ? "Verifying..." : "Verify email"}
          </button>
        </form>

        <div className="space-y-2 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Didn&apos;t get it?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || cooldown > 0}
              className="font-semibold text-black dark:text-white hover:underline underline-offset-4 disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
            >
              {cooldown > 0
                ? `Send a new code in ${cooldown}s`
                : isResending
                  ? "Sending..."
                  : "Send a new code"}
            </button>
          </p>
          <p>
            <button
              type="button"
              onClick={handleUseAnotherAccount}
              className="hover:underline underline-offset-4"
            >
              Use a different account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
