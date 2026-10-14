import { useState, useEffect, useCallback } from "react";
import adminService, { type FeedbackItem } from "../../services/admin.service";

const KIND_LABELS: Record<FeedbackItem["kind"], { text: string; className: string }> = {
  bug: { text: "Bug", className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
  idea: { text: "Idea", className: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
  other: { text: "Other", className: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300" },
};

const Feedback = () => {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getFeedback({ includeDone: showDone });
      setItems(response.feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feedback");
    } finally {
      setIsLoading(false);
    }
  }, [showDone]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleDone = async (id: string) => {
    setMarkingId(id);
    try {
      await adminService.markFeedbackDone(id);
      // With "Show done" off it leaves the list; with it on it just shows as done
      setItems((prev) =>
        showDone ? prev.map((item) => (item.id === id ? { ...item, done: true } : item)) : prev.filter((item) => item.id !== id)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark it done");
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Feedback
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            What students tell us about the app
          </p>
        </div>
        <button
          onClick={fetchFeedback}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Show done</span>
        </label>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Feedback List */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Loading feedback...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {showDone ? "No feedback yet" : "Nothing open. All caught up."}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item) => {
              const kind = KIND_LABELS[item.kind];
              return (
                <div key={item.id} className={`p-4 ${item.done ? "opacity-60" : ""}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${kind.className}`}>
                          {kind.text}
                        </span>
                        {item.done && (
                          <span className="text-xs text-green-600 dark:text-green-400">Done</span>
                        )}
                      </div>
                      {/* Plain text, kept as written, so line breaks show */}
                      <p className="mt-2 text-sm text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                        {item.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{item.email}</span>
                        {item.page && <span>On {item.page}</span>}
                        {item.solutionId && <span>Had a solution open</span>}
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    {!item.done && (
                      <button
                        onClick={() => handleDone(item.id)}
                        disabled={markingId === item.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-all disabled:opacity-50 shrink-0"
                      >
                        {markingId === item.id ? "Saving..." : "Mark done"}
                      </button>
                    )}
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

export default Feedback;
