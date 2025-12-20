import { useRef, useEffect } from "react";
import katex from "katex";
import { useChatStore } from "../stores/chatStore";
import StepCard from "./StepCard";
import { cleanFinalAnswer } from "../utils/latexUtils";

// Helper to render LaTeX safely
const renderLatex = (text: string): string => {
  console.log("[AnswerPanel] renderLatex input:", JSON.stringify(text));
  const cleanedText = cleanFinalAnswer(text);
  console.log("[AnswerPanel] After cleaning:", JSON.stringify(cleanedText));
  try {
    const rendered = katex.renderToString(cleanedText, {
      throwOnError: false,
      displayMode: false,
    });
    console.log("[AnswerPanel] KaTeX output length:", rendered.length);
    return rendered;
  } catch (e) {
    console.error("[AnswerPanel] KaTeX error:", e);
    return cleanedText;
  }
};

const AnswerPanel = () => {
  const { chats, activeChatId, isLoading, setShowAnswerPanel } = useChatStore();
  const activeChat = chats.find((c) => c.id === activeChatId);
  const solution = activeChat?.solution;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to top when solution changes
  useEffect(() => {
    if (solution && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [solution]);

  return (
    <div className="h-full flex flex-col bg-gray-50 border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="font-semibold text-gray-900">Solution</h2>
        </div>
        <button
          onClick={() => setShowAnswerPanel(false)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Solving...</p>
            <p className="text-sm text-gray-400 mt-1">
              Working through each step
            </p>
          </div>
        ) : solution ? (
          <div className="space-y-4">
            {/* Final Answer - Top (rendered with KaTeX, cleaned) */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-semibold text-green-800">
                  Final Answer
                </span>
              </div>
              <div
                className="text-xl font-bold text-green-900"
                dangerouslySetInnerHTML={{
                  __html: renderLatex(solution.finalAnswer),
                }}
              />
            </div>

            {/* Problem Type Badge + Stats */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="px-2 py-1 bg-gray-100 rounded-full capitalize">
                {solution.problemType.replace("_", " ")}
              </span>
              <span>
                {solution.steps.length} steps •{" "}
                {(solution.processingTimeMs / 1000).toFixed(1)}s
              </span>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {solution.steps.map((step) => (
                <StepCard key={step.stepNumber} step={step} />
              ))}
            </div>

            {/* Summary */}
            {solution.summary && (
              <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-1 text-sm">
                  Summary
                </h3>
                <p className="text-gray-600 text-sm">{solution.summary}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <svg
              className="w-12 h-12 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p>Ask a math problem to see the solution</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnswerPanel;
