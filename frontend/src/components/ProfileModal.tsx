import { useChatStore } from "../stores/chatStore";
import { useAppDataStore } from "../stores/appDataStore";
import { Mail, Calendar, Loader2, X } from "lucide-react";

// Problem type display names
const problemTypeLabels: Record<string, string> = {
  algebra: "Algebra",
  calculus_derivative: "Derivatives",
  calculus_integral: "Integrals",
  calculus_limit: "Limits",
  trigonometry: "Trigonometry",
  linear_algebra: "Linear Algebra",
  geometry: "Geometry",
  statistics: "Statistics",
  unknown: "Other",
};

const ProfileModal = () => {
  const { isProfileOpen, toggleProfileModal } = useChatStore();
  const {
    profile,
    profileLoading: loading,
    profileError: error,
    refreshProfile,
  } = useAppDataStore();

  if (!isProfileOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  const getTopCategory = () => {
    if (!profile) return "None";
    const entries = Object.entries(profile.stats.problemTypes);
    if (entries.length === 0) return "None";
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    return problemTypeLabels[sorted[0][0]] || "Unknown";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={toggleProfileModal}
    >
      <div
        className="bg-white dark:bg-[#0f0f0f] w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-white/10 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#0f0f0f]">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Profile
          </h2>
          <button
            onClick={toggleProfileModal}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mb-3" />
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {error}
              </p>
              <button
                onClick={refreshProfile}
                className="text-sm text-gray-600 dark:text-gray-300 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : profile ? (
            <div className="space-y-5">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                  {profile.user.avatar ? (
                    <img
                      src={profile.user.avatar}
                      alt={profile.user.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-medium text-gray-600 dark:text-gray-300">
                      {profile.user.name?.[0]?.toUpperCase() ||
                        profile.user.email[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                    {profile.user.name || profile.user.email.split("@")[0]}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {profile.user.email}
                  </p>
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="capitalize">
                    {profile.user.provider} account
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Joined {formatDate(profile.user.createdAt)}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 dark:border-white/5" />

              {/* Stats Grid */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Statistics
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg text-center">
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {profile.stats.totalSolutions}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Solved</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg text-center">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate px-1">
                      {getTopCategory()}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Top Category
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg text-center">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {getTimeAgo(profile.stats.lastSolvedAt)}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Last Active
                    </p>
                  </div>
                </div>
              </div>

              {/* Problem Types Breakdown */}
              {Object.keys(profile.stats.problemTypes).length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                    Performance by Category
                  </h4>
                  <div className="space-y-2.5">
                    {Object.entries(profile.stats.problemTypes)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => {
                        const percentage =
                          profile.stats.totalSolutions > 0
                            ? (count / profile.stats.totalSolutions) * 100
                            : 0;

                        return (
                          <div key={type}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {problemTypeLabels[type] || type}
                              </span>
                              <span className="text-xs text-gray-500">
                                {count} ({percentage.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gray-400 dark:bg-gray-500 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {Object.keys(profile.stats.problemTypes).length === 0 && (
                <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                  Solve problems to see your performance insights!
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
