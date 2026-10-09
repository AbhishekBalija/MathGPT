import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuthStore } from "../stores/authStore";
import { useState, type FormEvent } from "react";
import axios from "axios";
import AuthLayout from "../components/auth/AuthLayout";
import * as ui from "../components/auth/authStyles";

const Register = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, registerWithEmail, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Google comes first; the email form opens when asked for
  const [showEmail, setShowEmail] = useState(false);

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
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

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      await registerWithEmail(email, password, name);
      // Email sign-ups confirm their address before they can solve
      navigate("/verify-email", { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Registration failed. Please try again.");
      }
    }
  };

  return (
    <AuthLayout
      corner={
        <>
          Have an account?{" "}
          <Link to="/login" className={ui.textLink}>
            Sign in
          </Link>
        </>
      }
    >
      <h1 className={ui.heading}>Create your account</h1>
      <p className={ui.subheading}>Free while in beta. Takes a minute.</p>

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
            width="340"
            text="signup_with"
            shape="rectangular"
          />
        </div>

        {showEmail ? (
          <form className="space-y-3 pt-2" onSubmit={handleEmailRegister}>
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
                autoFocus
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
                placeholder="At least 8 characters"
              />
            </div>
            <button type="submit" disabled={isLoading} className={`${ui.primaryButton} !mt-5`}>
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setShowEmail(true)} className={ui.quietButton}>
            or sign up with email
          </button>
        )}

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

export default Register;
