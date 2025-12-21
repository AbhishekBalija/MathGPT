import { Link, useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useAuthStore } from "../stores/authStore";
import { useState, type FormEvent } from "react";
import axios from "axios";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogle, loginWithEmail, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ||
    "/app";

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    setError(null);
    if (credentialResponse.credential) {
      try {
        await loginWithGoogle(credentialResponse.credential);
        navigate(from, { replace: true });
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
      navigate(from, { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Invalid email or password. Please try again.");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] bg-grid-white px-4 py-12 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="w-full max-w-[500px] space-y-8 bg-white dark:bg-gray-900 p-10 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-3 mb-8 group">
            <img
              src="/MathGPT-logo1.png"
              alt="MathGPT Logo"
              className="h-12 w-auto object-contain transition-transform group-hover:scale-110"
            />
            <span className="text-3xl font-normal tracking-wider font-['Rye'] text-gray-900 dark:text-white">
              MathGPT
            </span>
          </Link>

          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Enter your details to sign in
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-center w-full">
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                width="320"
                text="signin_with"
                shape="circle"
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100 dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-900 px-2 text-gray-400 font-medium">
                or
              </span>
            </div>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleEmailLogin}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email-address"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
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
                className="block w-full rounded-xl border-gray-200 dark:border-gray-700 py-3 px-4 text-gray-900 dark:text-white shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent sm:text-sm bg-gray-50/50 dark:bg-gray-800 transition-all font-medium"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
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
                className="block w-full rounded-xl border-gray-200 dark:border-gray-700 py-3 px-4 text-gray-900 dark:text-white shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent sm:text-sm bg-gray-50/50 dark:bg-gray-800 transition-all font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-black dark:text-white focus:ring-black dark:focus:ring-white bg-gray-100 dark:bg-gray-800"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-600 dark:text-gray-400"
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a
                href="#"
                className="font-medium text-black dark:text-white hover:underline underline-offset-4"
              >
                Forgot password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-xl bg-black dark:bg-white px-3 py-3.5 text-sm font-semibold text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black transition-all shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-black dark:text-white hover:underline underline-offset-4"
          >
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
