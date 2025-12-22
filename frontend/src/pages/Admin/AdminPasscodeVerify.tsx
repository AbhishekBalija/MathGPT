import { useState, useEffect } from "react";
import { useAdminStore } from "../../stores/adminStore";

const AdminPasscodeVerify = ({ onVerified }: { onVerified: () => void }) => {
  const [passcode, setPasscode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { verifyPasscode, error, lockoutUntil, verificationAttempts } =
    useAdminStore();

  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);

  // Update lockout countdown
  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutRemaining(null);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, lockoutUntil - Date.now());
      if (remaining === 0) {
        setLockoutRemaining(null);
      } else {
        setLockoutRemaining(Math.ceil(remaining / 1000));
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || isSubmitting || lockoutRemaining) return;

    setIsSubmitting(true);
    const success = await verifyPasscode(passcode);
    setIsSubmitting(false);

    if (success) {
      onVerified();
    } else {
      setPasscode("");
    }
  };

  const isLocked = lockoutRemaining !== null && lockoutRemaining > 0;
  const attemptsRemaining = 3 - verificationAttempts;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-900 dark:bg-white mb-4">
            <svg
              className="w-8 h-8 text-white dark:text-gray-900"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Verification
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enter your admin passcode to continue
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Passcode Input */}
            <div>
              <label
                htmlFor="passcode"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Admin Passcode
              </label>
              <input
                id="passcode"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={isLocked || isSubmitting}
                placeholder="Enter passcode"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                autoFocus
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <svg
                  className="w-5 h-5 text-red-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </span>
              </div>
            )}

            {/* Lockout Timer */}
            {isLocked && (
              <div className="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Please wait{" "}
                  <span className="font-mono font-bold">
                    {Math.floor(lockoutRemaining! / 60)}:
                    {String(lockoutRemaining! % 60).padStart(2, "0")}
                  </span>{" "}
                  before trying again
                </p>
              </div>
            )}

            {/* Attempts Remaining */}
            {verificationAttempts > 0 && !isLocked && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""}{" "}
                remaining
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!passcode.trim() || isSubmitting || isLocked}
              className="w-full py-3 px-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Verifying...
                </span>
              ) : (
                "Verify & Continue"
              )}
            </button>
          </form>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <a
            href="/app"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            ← Back to App
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminPasscodeVerify;
