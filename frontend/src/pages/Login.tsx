import { Link, useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuthStore } from "../stores/authStore";
import { useState, type FormEvent } from "react";
import axios from "axios";
import AuthLayout from "../components/auth/AuthLayout";
import * as ui from "../components/auth/authStyles";
import { useGoogleButtonWidth } from "../components/auth/useGoogleButtonWidth";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogle, loginWithEmail, isLoading } = useAuthStore();
  const googleWidth = useGoogleButtonWidth();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const getRedirectPath = (isAdmin: boolean | undefined) => {
    // If there's a saved location, go there (unless it's an admin trying to access /app which is fine)
    const savedPath = (location.state as { from?: { pathname: string } })?.from
      ?.pathname;
    if (savedPath && savedPath !== "/") {
      return savedPath;
    }
    // Otherwise redirect based on admin status
    return isAdmin ? "/admin" : "/app";
  };

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse,
  ) => {
    setError(null);
    if (credentialResponse.credential) {
      try {
        await loginWithGoogle(credentialResponse.credential);
        // Get user from store after login
        const currentUser = useAuthStore.getState().user;
        const redirectPath = getRedirectPath(currentUser?.isAdmin);
        navigate(redirectPath, { replace: true });
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          setError(err.response.data.error);
        } else {
          setError("Failed to sign in with Google. Please try again.");
        }
      }
    }
  };

  const handleGoogleError = () => {
    setError("Google sign-in was cancelled or failed. Please try again.");
  };

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      await loginWithEmail(email, password);
      // Get user from store after login
      const currentUser = useAuthStore.getState().user;
      // Email sign-ups must confirm their address before solving; their old
      // code has likely expired, so the verify page sends a fresh one
      if (currentUser?.emailVerified === false) {
        navigate("/verify-email", { replace: true, state: { sendCode: true } });
        return;
      }
      const redirectPath = getRedirectPath(currentUser?.isAdmin);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Invalid email or password. Please try again.");
      }
    }
  };

  return (
    <AuthLayout
      corner={
        <>
          <span className="hidden sm:inline">New here? </span>
          <Link to="/register" className={ui.textLink}>
            Create an account
          </Link>
        </>
      }
    >
      <h1 className={ui.heading}>Welcome back</h1>
      <p className={ui.subheading}>Pick up where you left off.</p>

      <div className="mt-7 space-y-4">
        {error && (
          <div role="alert" className={ui.errorBox}>
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            width={String(googleWidth)}
            text="continue_with"
            shape="rectangular"
          />
        </div>

        <div className={ui.divider}>or</div>

        <form className="space-y-3" onSubmit={handleEmailLogin}>
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className={ui.input}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`${ui.primaryButton} !mt-5`}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default Login;
