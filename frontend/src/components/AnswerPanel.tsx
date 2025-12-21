import { useRef, useEffect } from "react";
import katex from "katex";
import { useChatStore } from "../stores/chatStore";
import StepCard from "./StepCard";
import { cleanFinalAnswer } from "../utils/latexUtils";

// Helper to render LaTeX safely
const renderLatex = (text: string): string => {
  const cleanedText = cleanFinalAnswer(text);
  try {
    const rendered = katex.renderToString(cleanedText, {
      throwOnError: false,
      displayMode: false,
    });
    return rendered;
  } catch (e) {
    console.error("[AnswerPanel] KaTeX error:", e);
    return cleanedText;
  }
};

// Skeleton loader component for solution
const SolutionSkeleton = () => (
  <div className="space-y-6 max-w-2xl mx-auto animate-pulse">
    {/* Final Answer skeleton */}
    <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
    </div>

    {/* Problem type badge skeleton */}
    <div className="flex items-center justify-between px-2">
      <div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded-full" />
      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>

    {/* Step skeletons */}
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

const AnswerPanel = () => {
  const {
    chats,
    activeChatId,
    isLoading,
    solutionLoading,
    setShowAnswerPanel,
  } = useChatStore();
  const activeChat = chats.find((c) => c.id === activeChatId);
  const solution = activeChat?.solution;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Show skeleton when fetching a solution from history
  const showSkeleton = solutionLoading && !solution;

  // Scroll to top when solution changes
  useEffect(() => {
    if (solution && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [solution]);

  return (
    <div className="h-full flex flex-col bg-gray-50/50 dark:bg-[#0a0a0a] border-l border-white/50 dark:border-gray-800 backdrop-blur-sm shadow-xl shadow-gray-200/50 dark:shadow-none relative z-10 w-full overflow-hidden transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-linear-to-tr from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-900/10 text-white">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white leading-tight">
              Verified Solution
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide uppercase">
              Step-by-step breakdown
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAnswerPanel(false)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          aria-label="Close panel"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 scroll-smooth">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Solving Problem
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
              Analyzing math structure and generating verified steps...
            </p>
          </div>
        ) : showSkeleton ? (
          <SolutionSkeleton />
        ) : solution ? (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Final Answer - Top (Hero Section) */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-linear-to-r from-green-300 to-emerald-400 dark:from-green-900/40 dark:to-emerald-800/40 rounded-2xl opacity-50 blur-sm group-hover:opacity-75 transition-opacity"></div>
              <div className="relative p-6 bg-white dark:bg-gray-900 rounded-xl border border-green-100 dark:border-green-900/30 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold uppercase tracking-wider rounded-md">
                    Final Answer
                  </span>
                </div>
                <div
                  className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-normal"
                  dangerouslySetInnerHTML={{
                    __html: renderLatex(solution.finalAnswer),
                  }}
                />
              </div>
            </div>
            {/* Problem Type Badge + Stats */}
            <div className="flex items-center justify-between px-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-700 uppercase tracking-wide">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                  />
                </svg>
                {solution.problemType.replace("_", " ")}
              </span>
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 font-mono">
                {solution.steps.length} STEPS •{" "}
                {(solution.processingTimeMs / 1000).toFixed(2)}s
              </span>
            </div>
            {/* Steps */}
            <div className="space-y-4">
              {solution.steps.map((step) => (
                <StepCard key={step.stepNumber} step={step} />
              ))}
            </div>
            {/* Summary */}
            {solution.summary && (
              <div className="mt-8 p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Summary
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
                  {solution.summary}
                </p>
              </div>
            )}
            <div className="h-10"></div> {/* Spacer */}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-gray-600">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-gray-300 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-1">
              No Solution Yet
            </h3>
            <p className="text-sm dark:text-gray-500">
              Ask a specific math problem to see details
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnswerPanel;
