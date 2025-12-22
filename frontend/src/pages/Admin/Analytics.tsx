import { useState, useEffect } from "react";
import adminService, {
  type AnalyticsResponse,
} from "../../services/admin.service";

const Analytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getAnalytics();
      setAnalytics(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Calculate percentage for bar chart
  const getPercentage = (count: number) => {
    if (!analytics || analytics.totalEvents === 0) return 0;
    return (count / analytics.totalEvents) * 100;
  };

  // Format event name for display
  const formatEventName = (name: string) => {
    return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Platform usage and event tracking
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && !analytics && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading analytics...
        </div>
      )}

      {analytics && (
        <>
          {/* Total Events Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Events
            </h3>
            <p className="text-4xl font-bold text-gray-900 dark:text-white mt-2">
              {analytics.totalEvents.toLocaleString()}
            </p>
          </div>

          {/* Events by Type */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Events by Type
            </h3>
            {analytics.eventsByType.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                No events recorded yet
              </p>
            ) : (
              <div className="space-y-4">
                {analytics.eventsByType.map(({ eventName, count }) => (
                  <div key={eventName}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatEventName(eventName)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {count.toLocaleString()} (
                        {getPercentage(count).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-500"
                        style={{ width: `${getPercentage(count)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Events */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Events
              </h3>
            </div>
            {analytics.recentEvents.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No recent events
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {analytics.recentEvents.slice(0, 20).map((event) => (
                  <div
                    key={event.id}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="inline-flex px-2 py-0.5 text-xs font-mono rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {event.eventName}
                        </span>
                        {Boolean(event.properties.problemType) && (
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                            Type: {String(event.properties.problemType)}
                          </span>
                        )}
                        {Boolean(event.properties.stepsCount) && (
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                            Steps: {String(event.properties.stepsCount)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {event.userId && (
                      <p className="text-xs text-gray-400 mt-1">
                        User: {event.userId.slice(0, 12)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
