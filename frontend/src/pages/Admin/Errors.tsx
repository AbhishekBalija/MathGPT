import { useState, useEffect } from "react";
import adminService, {
  type ErrorItem,
  type ErrorStats,
} from "../../services/admin.service";

const Errors = () => {
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchErrors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getErrors({
        includeResolved: showResolved,
        limit: 50,
      });
      setStats(response.stats);
      setErrors(response.errors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load errors");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [showResolved]);

  const handleResolve = async (errorId: string) => {
    setResolvingId(errorId);
    try {
      await adminService.resolveError(errorId);
      setErrors((prev) =>
        prev.map((e) => (e.id === errorId ? { ...e, resolved: true } : e))
      );
      if (stats) {
        setStats({ ...stats, unresolved: stats.unresolved - 1 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve error");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Error Logs
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor and resolve application errors
          </p>
        </div>
        <button
          onClick={fetchErrors}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Total Errors
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {stats.total}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Unresolved
            </p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {stats.unresolved}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Last 24 Hours
            </p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {stats.last24Hours}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Error Types
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {stats.byCode.length}
            </p>
          </div>
        </div>
      )}

      {/* Error breakdown by code */}
      {stats && stats.byCode.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-8">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Errors by Type
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.byCode.map(({ errorCode, count }) => (
              <div
                key={errorCode}
                className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm"
              >
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {errorCode}
                </span>
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  ({count})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Show resolved errors
          </span>
        </label>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Errors List */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Loading errors...
          </div>
        ) : errors.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No errors found 🎉
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {errors.map((err) => (
              <div
                key={err.id}
                className={`p-4 ${
                  err.resolved ? "opacity-60" : ""
                } hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-mono rounded ${
                          err.resolved
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {err.errorCode}
                      </span>
                      {err.resolved && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          ✓ Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                      {err.errorMessage}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      Problem: {err.problemText.slice(0, 100)}
                      {err.problemText.length > 100 ? "..." : ""}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{new Date(err.createdAt).toLocaleString()}</span>
                      {err.userId && (
                        <span>User: {err.userId.slice(0, 8)}...</span>
                      )}
                    </div>
                  </div>
                  {!err.resolved && (
                    <button
                      onClick={() => handleResolve(err.id)}
                      disabled={resolvingId === err.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-all disabled:opacity-50"
                    >
                      {resolvingId === err.id ? "Resolving..." : "Resolve"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Errors;
