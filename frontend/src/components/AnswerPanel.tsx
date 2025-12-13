import { useChatStore } from "../stores/chatStore";
import StepCard from "./StepCard";

const AnswerPanel = () => {
  const { chats, activeChatId, isLoading, setShowAnswerPanel } = useChatStore();
  const activeChat = chats.find((c) => c.id === activeChatId);
  const solution = activeChat?.solution;

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
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
          <h2 className="font-semibold text-gray-900">Verified Solution</h2>
        </div>
        <button
          onClick={() => setShowAnswerPanel(false)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
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
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Verifying solution...</p>
            <p className="text-sm text-gray-400 mt-1">
              Checking each step with SymPy
            </p>
          </div>
        ) : solution ? (
          <div className="space-y-4">
            {solution.steps.map((step) => (
              <StepCard key={step.stepNumber} step={step} />
            ))}

            {solution.summary && (
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-1">Summary</h3>
                <p className="text-blue-800">{solution.summary}</p>
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
            <p>No solution yet</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {solution && (
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            Export PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default AnswerPanel;
