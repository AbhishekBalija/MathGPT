import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StatsData {
  userCount: number;
}

interface UserStatsProps {
  threshold?: number;
  className?: string;
}

export const UserStats = ({
  threshold = 5, // Default threshold for testing (change to 50 for production)
  className = "",
}: UserStatsProps) => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiUrl =
          import.meta.env.MODE === "development"
            ? import.meta.env.VITE_API_URL_DEV
            : import.meta.env.VITE_API_URL_PROD;

        if (!apiUrl) {
          setError(true);
          setLoading(false);
          return;
        }

        const res = await fetch(`${apiUrl}/api/public-stats`);
        if (!res.ok) throw new Error("Failed to fetch stats");

        const data = await res.json();
        setStats(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Don't render anything while loading, on error, or below threshold
  if (loading || error) return null;
  if (!stats) return null;

  if (stats.userCount < threshold) return null;

  // Format numbers with "+" suffix for approximate display
  const formatCount = (count: number): string => {
    if (count >= 1000) {
      return `${Math.floor(count / 100) * 100}+`;
    }
    if (count >= 100) {
      return `${Math.floor(count / 10) * 10}+`;
    }
    return `${count}+`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`relative flex items-center justify-center gap-4 sm:gap-6 text-sm mb-6 ${className}`}
      >
        {/* Glow background */}
        <div className="absolute inset-0 bg-linear-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/5 dark:via-purple-500/5 dark:to-pink-500/5 blur-xl rounded-full" />

        {/* Pill container */}
        <div className="relative flex items-center gap-4 sm:gap-6 px-5 py-2.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-full shadow-sm">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center gap-2"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </motion.div>
            <span className="text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCount(stats.userCount)}
              </span>{" "}
              users
            </span>
          </motion.div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UserStats;
