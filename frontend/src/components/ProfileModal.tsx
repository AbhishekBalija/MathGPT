import { useChatStore } from "../stores/chatStore";
import { useAppDataStore } from "../stores/appDataStore";
import {
  User,
  Mail,
  Calendar,
  BarChart3,
  Trophy,
  Clock,
  Loader2,
  Calculator,
  TrendingUp,
  Sparkles,
  X,
} from "lucide-react";

// Problem type display names and colors
const problemTypeConfig: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  algebra: { label: "Algebra", color: "bg-blue-500", icon: "📐" },
  calculus_derivative: {
    label: "Derivatives",
    color: "bg-purple-500",
    icon: "📈",
  },
  calculus_integral: { label: "Integrals", color: "bg-pink-500", icon: "∫" },
  calculus_limit: { label: "Limits", color: "bg-indigo-500", icon: "→" },
  trigonometry: { label: "Trigonometry", color: "bg-orange-500", icon: "📐" },
  linear_algebra: { label: "Linear Algebra", color: "bg-teal-500", icon: "🔢" },
  geometry: { label: "Geometry", color: "bg-green-500", icon: "△" },
  statistics: { label: "Statistics", color: "bg-yellow-500", icon: "📊" },
  unknown: { label: "Other", color: "bg-gray-500", icon: "?" },
};

const ProfileModal = () => {
  const { isProfileOpen, toggleProfileModal } = useChatStore();
  // Use cached profile data from appDataStore
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
      month: "long",
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-[#111]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Profile
          </h2>
          <button
            onClick={toggleProfileModal}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-500">Loading your profile...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-500">
              <p>{error}</p>
              <button
                onClick={refreshProfile}
                className="mt-4 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          ) : profile ? (
            <>
              {/* Profile Card */}
              <div className="relative bg-gray-50 dark:bg-white/5 rounded-2xl p-6 mb-6 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-600 via-purple-600 to-pink-600" />

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Avatar */}
                  <div className="shrink-0">
                    {profile.user.avatar ? (
                      <img
                        src={profile.user.avatar}
                        alt={profile.user.name}
                        className="w-20 h-20 rounded-full border-4 border-white dark:border-[#222] shadow-sm object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full border-4 border-white dark:border-[#222] shadow-sm bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">
                          {profile.user.name?.[0]?.toUpperCase() ||
                            profile.user.email[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="text-center sm:text-left space-y-2 flex-1">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {profile.user.name || profile.user.email.split("@")[0]}
                      </h3>
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-gray-500 dark:text-gray-400">
                        <Mail className="w-4 h-4" />
                        <span>{profile.user.email}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-center sm:justify-start gap-3 pt-2">
                      <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-white/10 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/5">
                        <User className="w-3.5 h-3.5" />
                        <span className="capitalize">
                          {profile.user.provider} Account
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-white/10 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Joined {formatDate(profile.user.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                      <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Problems Solved
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {profile.stats.totalSolutions}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                      <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Top Category
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-[120px]">
                        {Object.entries(profile.stats.problemTypes).sort(
                          (a, b) => b[1] - a[1]
                        )[0]
                          ? problemTypeConfig[
                              Object.entries(profile.stats.problemTypes).sort(
                                (a, b) => b[1] - a[1]
                              )[0][0]
                            ]?.label || "Unknown"
                          : "None"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-green-100 dark:bg-green-500/20 rounded-lg">
                      <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Last Activity
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {getTimeAgo(profile.stats.lastSolvedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Problem Types Breakdown */}
              <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Performance Insight
                  </h3>
                </div>

                {Object.keys(profile.stats.problemTypes).length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Solve more problems to see detailed insights!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    {Object.entries(profile.stats.problemTypes)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => {
                        const config =
                          problemTypeConfig[type] || problemTypeConfig.unknown;
                        const percentage =
                          profile.stats.totalSolutions > 0
                            ? (count / profile.stats.totalSolutions) * 100
                            : 0;

                        return (
                          <div key={type} className="group">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{config.icon}</span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {config.label}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                {count} ({percentage.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${config.color} rounded-full transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Premium Banner */}
              <div className="mt-6 bg-linear-to-r from-amber-500 via-orange-500 to-red-500 rounded-xl p-5 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white/20 rounded-lg">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">MathGPT Pro</h3>
                    <p className="text-white/80 text-xs mt-0.5">
                      Get unlimited solutions & priority support.
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-white text-orange-600 text-sm font-bold rounded-lg hover:bg-orange-50 transition-colors shadow-sm">
                    Upgrade
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
