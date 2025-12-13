import katex from "katex";
import type { Step } from "../stores/chatStore";

interface StepCardProps {
  step: Step;
}

const StepCard = ({ step }: StepCardProps) => {
  const renderLatex = (text: string) => {
    try {
      return katex.renderToString(text, {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      return text;
    }
  };

  const getStatusBadge = (status: Step["status"]) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Verified
          </span>
        );
      case "CORRECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Corrected
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Failed
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
            {step.stepNumber}
          </span>
          <span className="text-sm font-medium text-gray-500">
            Step {step.stepNumber}
          </span>
        </div>
        {getStatusBadge(step.status)}
      </div>

      <div
        className="bg-gray-50 rounded-lg p-3 mb-3 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: renderLatex(step.expression) }}
      />

      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-700">Justification: </span>
        {step.justification}
      </p>

      {step.notes && (
        <p className="text-xs text-gray-500 mt-2 italic">{step.notes}</p>
      )}
    </div>
  );
};

export default StepCard;
