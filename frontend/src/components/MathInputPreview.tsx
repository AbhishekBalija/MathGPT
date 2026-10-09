import { useMemo } from "react";
import katex from "katex";
import { containsMath, toLatex } from "../utils/latexUtils";

interface MathInputPreviewProps {
  input: string;
  className?: string;
}

const MathInputPreview = ({ input, className = "" }: MathInputPreviewProps) => {
  const renderedHtml = useMemo(() => {
    if (!input.trim() || !containsMath(input)) {
      return null;
    }

    try {
      const latex = toLatex(input);
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false,
        output: "html",
      });
    } catch {
      return null;
    }
  }, [input]);

  if (!renderedHtml) {
    return null;
  }

  return (
    <div
      className={`
        px-4 py-2 bg-blue-50/50 dark:bg-blue-900/20 
        border border-blue-100 dark:border-blue-900 
        rounded-lg text-sm
        ${className}
      `}
    >
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        Preview
      </div>
      <div
        className="text-gray-900 dark:text-gray-100"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </div>
  );
};

export default MathInputPreview;
