import { useState } from "react";
import katex from "katex";
import type { Step } from "../stores/chatStore";
import { cleanExpression } from "../utils/latexUtils";
import { sanitizeHtml, escapeHtml } from "../utils/sanitize";

interface StepCardProps {
  step: Step;
}

const StepCard = ({ step }: StepCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const renderLatex = (text: string) => {
    const cleanedText = cleanExpression(text);
    try {
      const html = katex.renderToString(cleanedText, {
        throwOnError: false,
        displayMode: true,
      });
      // Sanitize KaTeX output for extra safety
      return sanitizeHtml(html);
    } catch (e) {
      console.error("[StepCard] KaTeX error:", e);
      // Escape HTML in fallback to prevent XSS
      return escapeHtml(cleanedText);
    }
  };

  /**
   * Render inline math in explanation text.
   * Detects LaTeX patterns and renders them with KaTeX.
   */
  const renderExplanation = (text: string): string => {
    if (!text) return text;

    let result = text;

    // Handle $...$ inline math
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

    // Handle simple x^n patterns
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full border border-green-200 dark:border-green-800 shadow-sm">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Verified Step
          </span>
        );
      case "CORRECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-800 shadow-sm">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Corrected
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold rounded-full border border-red-200 dark:border-red-800 shadow-sm">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Failed
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-semibold rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
            Processing
          </span>
        );
    }
  };

  return (
    <div className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      {/* Step Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold shadow-sm ring-1 ring-blue-100 dark:ring-blue-900/50">
            {step.stepNumber}
          </div>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 tracking-tight">
            {step.justification}
          </span>
        </div>
        {getStatusBadge(step.status)}
      </div>

      {/* Expression - Main Content */}
      <div className="px-6 py-6 bg-white dark:bg-gray-900 flex justify-center">
        <div
          className="text-xl text-gray-900 dark:text-white overflow-x-auto py-2 scroll-smooth"
          dangerouslySetInnerHTML={{ __html: renderLatex(step.expression) }}
        />
      </div>

      {/* Expandable Explanation */}
      {step.explanation && (
        <div className="bg-gray-50/50 dark:bg-black/20 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-5 py-3 flex items-center justify-between text-sm text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 shadow-[0_0_10px_rgba(37,99,235,0.05)] hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all group/btn relative z-10"
          >
            <span className="font-semibold flex items-center gap-2 decoration-blue-500/60 underline underline-offset-4 group-hover/btn:decoration-blue-600 transition-all">
              <svg
                className={`w-4 h-4 text-blue-500 transition-opacity ${
                  expanded ? "opacity-100" : "opacity-0"
                }`}
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
              {expanded ? "Explanation" : "Show explanation"}
            </span>
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${
                expanded
                  ? "rotate-180 text-blue-500"
                  : "text-gray-400 dark:text-gray-500 group-hover/btn:text-blue-500"
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

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div
              className="px-5 pb-5 pt-1 text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t border-blue-100/50 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10"
              dangerouslySetInnerHTML={{
                __html: renderExplanation(step.explanation),
              }}
            />
          </div>
        </div>
      )}

      {step.notes && (
        <div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-300 italic border-t border-amber-100 dark:border-amber-900/30 flex items-start gap-2">
          <svg
            className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>{step.notes}</span>
        </div>
      )}
    </div>
  );
};

export default StepCard;
