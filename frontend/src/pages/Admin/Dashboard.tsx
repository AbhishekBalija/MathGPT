import { useEffect } from "react";
import { useAdminStore } from "../../stores/adminStore";

const Dashboard = () => {
  const { stats, fetchStats, isLoading, error } = useAdminStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statCards = [
    {
      label: "Total Users",
      value: stats?.totalUsers ?? "-",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      color: "bg-blue-500",
    },
    {
      label: "Total Solutions",
      value: stats?.totalSolutions ?? "-",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
      color: "bg-emerald-500",
    },
    {
      label: "Problem Types",
      value: stats?.solutionsByType
        ? Object.keys(stats.solutionsByType).length
        : "-",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      ),
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Overview of your MathGPT platform
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 transition-all hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? (
                    <span className="inline-block w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  ) : (
                    card.value
                  )}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${card.color} text-white`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Solutions by Type */}
      {stats?.solutionsByType &&
        Object.keys(stats.solutionsByType).length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Solutions by Problem Type
            </h2>
            <div className="space-y-4">
              {Object.entries(stats.solutionsByType).map(([type, count]) => {
                const total = Object.values(stats.solutionsByType).reduce(
                  (a, b) => a + b,
                  0
                );
                const percentage = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">
                        {type.replace(/_/g, " ")}
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {count}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 dark:bg-white rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* Recent Users */}
      {stats?.recentUsers && stats.recentUsers.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Users
          </h2>
          <div className="space-y-3">
            {stats.recentUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">
                    {user.name?.charAt(0).toUpperCase() || "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
