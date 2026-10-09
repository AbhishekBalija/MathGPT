import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { useAuthStore } from "../stores/authStore";
import authService from "../services/auth.service";
import AuthLayout from "../components/auth/AuthLayout";
import * as ui from "../components/auth/authStyles";

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
        setError(
          err.response.data?.error ??
            "Please wait before requesting another code.",
        );
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
    <AuthLayout>
      <h1 className={ui.heading}>Check your email</h1>
      <p className={ui.subheading}>
        {shouldSendCode
          ? "We're sending a 6-digit code to"
          : "We sent a 6-digit code to"}{" "}
        <span className="font-medium text-gray-900 dark:text-white">
          {user?.email ?? "your email"}
        </span>
        . It expires in 15 minutes.
      </p>

      <div className="mt-7 space-y-4">
        {error && (
          <div role="alert" className={ui.errorBox}>
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className={ui.noticeBox}>
            {notice}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleVerify}>
          <div>
            <label htmlFor="verification-code" className={ui.label}>
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
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={isVerifying}
              className={`${ui.input} text-center text-2xl tracking-[0.5em] placeholder:text-gray-300`}
              placeholder="000000"
            />
          </div>
          <button
            type="submit"
            disabled={isVerifying || code.length !== 6}
            className={ui.primaryButton}
          >
            {isVerifying ? "Verifying..." : "Verify email"}
          </button>
        </form>

        <div className="space-y-2 pt-1 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Didn&apos;t get it?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || cooldown > 0}
              className={`${ui.textLink} disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed`}
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
    </AuthLayout>
  );
};

export default VerifyEmail;
