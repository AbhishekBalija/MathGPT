import { useState } from "react";
import katex from "katex";
import type { Step } from "../stores/chatStore";
import { cleanExpression } from "../utils/latexUtils";

interface StepCardProps {
  step: Step;
}

const StepCard = ({ step }: StepCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const renderLatex = (text: string) => {
    console.log("[StepCard] renderLatex input:", JSON.stringify(text));
    const cleanedText = cleanExpression(text);
    console.log("[StepCard] After cleaning:", JSON.stringify(cleanedText));
    try {
      const html = katex.renderToString(cleanedText, {
        throwOnError: false,
        displayMode: true,
      });
      console.log(
        "[StepCard] KaTeX output preview:",
        html.substring(0, 100) + "..."
      );
      return html;
    } catch (e) {
      console.error("[StepCard] KaTeX error:", e);
      return cleanedText;
    }
  };

  /**
   * Render inline math in explanation text.
   * Detects LaTeX patterns and renders them with KaTeX.
   */
  const renderExplanation = (text: string): string => {
    if (!text) return text;

    // Match LaTeX patterns more comprehensively:
    // 1. $...$ inline math
    // 2. \command{...}{...} patterns (handles nested braces)
    // 3. Simple patterns like x^2, x_1

    let result = text;

    // First, handle $...$ inline math
    result = result.replace(/\$([^$]+)\$/g, (_, latex) => {
      try {
        return katex.renderToString(latex, {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        return `$${latex}$`;
      }
    });

    // Handle \frac{...}{...} and similar with nested braces
    // This regex uses a simple approach: match \command followed by balanced braces
    const fracPattern =
      /\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
    result = result.replace(fracPattern, (match) => {
      try {
        return katex.renderToString(match, {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        return match;
      }
    });

    // Handle \sqrt{...}
    result = result.replace(
      /\\sqrt\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
      (match) => {
        try {
          return katex.renderToString(match, {
            throwOnError: false,
            displayMode: false,
          });
        } catch {
          return match;
        }
      }
    );

    // Handle x^{...} patterns
    result = result.replace(/([a-zA-Z])\^\{([^{}]+)\}/g, (match) => {
      try {
        return katex.renderToString(match, {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        return match;
      }
    });

    // Handle x_{...} patterns
    result = result.replace(/([a-zA-Z])_\{([^{}]+)\}/g, (match) => {
      try {
        return katex.renderToString(match, {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        return match;
      }
    });

    // Handle simple x^n patterns (single character exponent)
    result = result.replace(/([a-zA-Z])\^(\d)/g, (match) => {
      try {
        return katex.renderToString(match, {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        return match;
      }
    });

    return result;
  };

  const getStatusBadge = (status: Step["status"]) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92z"
                clipRule="evenodd"
              />
            </svg>
            Corrected
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full border border-red-200">
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
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 text-xs font-medium rounded-full border border-gray-200">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
      {/* Step Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
            {step.stepNumber}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {step.justification}
          </span>
        </div>
        {getStatusBadge(step.status)}
      </div>

      {/* Expression - Notebook style (cleaned to only show LaTeX) */}
      <div className="px-4 py-4">
        <div
          className="text-lg text-gray-900 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: renderLatex(step.expression) }}
        />
      </div>

      {/* Expandable Explanation */}
      {step.explanation && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2 flex items-center justify-between text-sm text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <span className="font-medium">
              {expanded ? "Hide explanation" : "Why this step?"}
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {expanded && (
            <div
              className="px-4 py-3 bg-blue-50 text-sm text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: renderExplanation(step.explanation),
              }}
            />
          )}
        </div>
      )}

      {step.notes && (
        <div className="px-4 py-2 bg-amber-50 text-xs text-amber-700 italic border-t border-amber-100">
          Note: {step.notes}
        </div>
      )}
    </div>
  );
};

export default StepCard;
