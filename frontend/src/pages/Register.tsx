import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuthStore } from "../stores/authStore";
import { useAppStatus } from "../stores/appStatusStore";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import axios from "axios";
import AuthLayout from "../components/auth/AuthLayout";
import * as ui from "../components/auth/authStyles";
import { useGoogleButtonWidth } from "../components/auth/useGoogleButtonWidth";
import { useThemeStore } from "../stores/themeStore";
import { isGoogleSignInEnabled } from "../utils/googleSignIn";
import { PASSWORD_RULES, unmetPasswordRules } from "../utils/passwordRules";
import { Check, Circle } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, registerWithEmail, isLoading } = useAuthStore();
  // An admin can pause new accounts from Settings
  const { status: appStatus, load: loadAppStatus } = useAppStatus();
  useEffect(() => {
    void loadAppStatus();
  }, [loadAppStatus]);
  const signupsPaused = appStatus?.signupsOpen === false;
  const googleWidth = useGoogleButtonWidth();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Cloudflare Turnstile: shown only when a site key is set, so local
  // development works without one (the server skips the check there too)
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileInstance | undefined>(undefined);
  const isDark = useThemeStore((state) => state.isDark);

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse,
  ) => {
    setError(null);
    if (credentialResponse.credential) {
      try {
        await loginWithGoogle(credentialResponse.credential);
        navigate("/app", { replace: true });
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          setError(err.response.data.error);
        } else {
          setError("Failed to sign up with Google. Please try again.");
        }
      }
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-up was cancelled or failed. Please try again.");
  };

  const handleEmailRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    // Same rules as the server, so a weak password never makes the trip
    const unmet = unmetPasswordRules(password);
    if (unmet.length > 0) {
      setError(`Your password needs ${joinWithAnd(unmet.map((rule) => rule.short))}.`);
      return;
    }

    if (turnstileSiteKey && !turnstileToken) {
      setError("Please confirm you're not a robot first.");
      return;
    }

    try {
      await registerWithEmail(email, password, name, turnstileToken ?? undefined);
      // Email sign-ups confirm their address before they can solve
      navigate("/verify-email", { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Registration failed. Please try again.");
      }
      // A token works once, so get a fresh one for the next try
      setTurnstileToken(null);
      turnstile.current?.reset();
    }
  };

  return (
    <AuthLayout
      corner={
        <>
          <span className="hidden sm:inline">Have an account? </span>
          <Link to="/login" className={ui.textLink}>
            Sign in
          </Link>
        </>
      }
    >
      <h1 className={ui.heading}>Create your account</h1>
      <p className={ui.subheading}>Free while in beta. Takes a minute.</p>

      <div className="mt-7 space-y-4">
        {signupsPaused ? (
          <div role="status" className={ui.errorBox}>
            New sign-ups are paused for now. If you already have an account, log in.
          </div>
        ) : error ? (
          <div role="alert" className={ui.errorBox}>
            {error}
          </div>
        ) : null}

        {/* Only when Google sign-in is set up: the button crashes the page otherwise */}
        {isGoogleSignInEnabled() && !signupsPaused ? (
          <>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                width={String(googleWidth)}
                text="signup_with"
                shape="rectangular"
              />
            </div>

            <div className={ui.divider}>or</div>
          </>
        ) : null}

        <form className="space-y-3" onSubmit={handleEmailRegister}>
          <div>
            <label htmlFor="full-name" className={ui.label}>
              Name
            </label>
            <input
              id="full-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className={ui.input}
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="email-address" className={ui.label}>
              Email
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className={ui.input}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className={ui.label}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className={ui.input}
              aria-describedby="password-rules"
            />
            {/* The rules show before the first try, and tick off while typing */}
            <ul id="password-rules" className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {PASSWORD_RULES.map((rule) => {
                const done = rule.test(password);
                return (
                  <li
                    key={rule.id}
                    data-done={done}
                    className={`flex items-center gap-1.5 text-xs ${
                      done ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                    )}
                    <span>{rule.label}</span>
                    <span className="sr-only">{done ? "(done)" : "(not yet)"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          {turnstileSiteKey ? (
            <Turnstile
              ref={turnstile}
              siteKey={turnstileSiteKey}
              onSuccess={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
              options={{ theme: isDark ? "dark" : "light", size: "flexible" }}
              className="!mt-4"
            />
          ) : null}
          <button
            type="submit"
            disabled={isLoading || signupsPaused}
            className={`${ui.primaryButton} !mt-5`}
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="pt-2 text-center text-xs text-gray-500 dark:text-gray-400">
          By signing up you agree to the{" "}
          <Link to="/terms" className="underline underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </AuthLayout>
  );
};

// "a, b and c", for the error message
function joinWithAnd(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export default Register;
