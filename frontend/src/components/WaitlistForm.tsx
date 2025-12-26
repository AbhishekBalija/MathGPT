import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle, Loader2, KeyRound } from "lucide-react";
import UserStats from "./UserStats";

interface WaitlistFormProps {
  source?: string;
  className?: string;
  showStats?: boolean;
}

export const WaitlistForm = ({
  source = "landing_hero",
  className = "",
  showStats = true,
}: WaitlistFormProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [inviteToken, setInviteToken] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;

    setStatus("loading");

    try {
      const apiUrl =
        import.meta.env.MODE === "development"
          ? import.meta.env.VITE_API_URL_DEV
          : import.meta.env.VITE_API_URL_PROD;

      // Validate API URL
      if (!apiUrl) {
        setStatus("error");
        setMessage("Configuration error. Please contact support.");
        return;
      }

      const res = await fetch(`${apiUrl}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });

      // Handle non-JSON responses
      let data;
      try {
        data = await res.json();
      } catch {
        setStatus("error");
        setMessage("Invalid response from server. Please try again.");
        return;
      }

      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Connection error. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div
        className={`flex items-center gap-3 px-6 py-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full ${className}`}
      >
        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
        <span className="text-green-700 dark:text-green-400 text-sm sm:text-base">
          {message}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      {showStats && <UserStats threshold={5} />}
      <form
        onSubmit={handleSubmit}
        className={`relative flex flex-col sm:flex-row gap-3 w-full sm:w-auto ${className}`}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="Enter your email"
          required
          aria-label="Email address"
          className="px-6 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white w-full sm:w-80 transition-colors"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="group px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Join Waitlist
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>

        {status === "error" && (
          <p className="text-red-500 text-sm mt-2 sm:mt-0 sm:absolute sm:top-full sm:left-0 sm:pt-2">
            {message}
          </p>
        )}
      </form>

      {/* Already got access section */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setShowTokenInput(!showTokenInput)}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-2 mx-auto"
        >
          <KeyRound className="w-4 h-4" />
          Already got access? Enter your token
        </button>

        {showTokenInput && (
          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <input
              type="text"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              placeholder="Paste your invite token"
              className="px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white w-full sm:w-72 text-sm transition-colors"
            />
            <button
              type="button"
              onClick={() => {
                if (inviteToken.trim()) {
                  navigate(`/register?token=${inviteToken.trim()}`);
                }
              }}
              disabled={!inviteToken.trim()}
              className="px-6 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-black rounded-full font-medium text-sm flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight className="w-4 h-4" />
              Register
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitlistForm;
