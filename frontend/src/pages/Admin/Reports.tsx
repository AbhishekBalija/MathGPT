import { useState, useEffect, useCallback } from "react";
import { Math } from "../../features/solver/blocks/Math";
import { ProblemTitle } from "../../features/solver/history/ProblemTitle";
import adminService, {
  type ReportCacheStatus,
  type ReportItem,
} from "../../services/admin.service";

// What each cache status means for other students, in plain words
const STATUS_LABELS: Record<NonNullable<ReportCacheStatus>, { text: string; className: string }> = {
  blocked: {
    text: "Blocked: not served to anyone",
    className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  },
  shared: {
    text: "Unblocked: served from the cache again",
    className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  },
  unchecked: {
    text: "Unblocked: never checked, so not served",
    className: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  },
};

const NOT_CACHED = {
  text: "Instant answer: never cached",
  className: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
};

const Reports = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Unblocking takes two clicks, so a stray click cannot share a wrong answer
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getReports(50);
      setReports(response.reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleUnblock = async (reportId: string) => {
    setUnblockingId(reportId);
    try {
      await adminService.unblockReport(reportId);
      setConfirmingId(null);
      // Other reports on the same answer change too, so reload the list
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock the answer");
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Answers students said look wrong. A report blocks the answer from the shared cache.
          </p>
        </div>
        <button
          onClick={fetchReports}
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

      {/* Reports List */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Loading reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No reports yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {reports.map((report) => {
              const status = report.cacheStatus ? STATUS_LABELS[report.cacheStatus] : NOT_CACHED;
              return (
                <div key={report.id} className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${status.className}`}>
                        {status.text}
                      </span>
                      <p className="mt-2 text-sm text-gray-900 dark:text-white font-medium break-words">
                        {report.problemText ? <ProblemTitle problem={report.problemText} /> : "Problem not saved"}
                      </p>
                      {report.answerText && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          Answer: <Math latex={report.answerText} />
                        </p>
                      )}
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 break-words">
                        {report.reason ? `"${report.reason}"` : "No reason given"}
                      </p>
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(report.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {report.cacheStatus === "blocked" &&
                      (confirmingId === report.id ? (
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleUnblock(report.id)}
                            disabled={unblockingId === report.id}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-all disabled:opacity-50"
                          >
                            {unblockingId === report.id ? "Unblocking..." : "Yes, the answer is right"}
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmingId(report.id)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all shrink-0"
                        >
                          Unblock answer
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
