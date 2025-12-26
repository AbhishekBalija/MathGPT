import { useMemo } from "react";
import katex from "katex";

interface MathInputPreviewProps {
  input: string;
  className?: string;
}

// Simple detection of math-like content
const containsMath = (text: string): boolean => {
  // Check for common math indicators
  const mathPatterns = [
    /[²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ₀₁₂₃₄₅₆₇₈₉ₙₓ]/, // Super/subscripts
    /[√∛∜∫∬∮∂∇∑∏]/, // Math operators
    /[πθαβγδελμσφωΔΣΩ]/, // Greek letters
    /[±×÷≠≈≤≥∞∝]/, // Relations and operators
    /\^[\d\w]/, // Power notation
    /[a-z]\s*\(.*\)/i, // Function calls like sin(x)
    /\d+\s*[+\-*/^]\s*\d+/, // Basic arithmetic
  ];

  return mathPatterns.some((pattern) => pattern.test(text));
};

// Convert common math notation to LaTeX for preview
const toLatex = (text: string): string => {
  let latex = text;

  // Replace Unicode superscripts with LaTeX
  const superscripts: Record<string, string> = {
    "²": "^{2}",
    "³": "^{3}",
    "⁴": "^{4}",
    "⁵": "^{5}",
    "⁶": "^{6}",
    "⁷": "^{7}",
    "⁸": "^{8}",
    "⁹": "^{9}",
    "⁺": "^{+}",
    "⁻": "^{-}",
    ⁿ: "^{n}",
  };

  // Replace Unicode subscripts with LaTeX
  const subscripts: Record<string, string> = {
    "₀": "_{0}",
    "₁": "_{1}",
    "₂": "_{2}",
    "₃": "_{3}",
    "₄": "_{4}",
    "₅": "_{5}",
    "₆": "_{6}",
    "₇": "_{7}",
    "₈": "_{8}",
    "₉": "_{9}",
    ₙ: "_{n}",
    ₓ: "_{x}",
  };

  // Replace symbols with LaTeX commands
  const symbols: Record<string, string> = {
    "√": "\\sqrt{}",
    "∛": "\\sqrt[3]{}",
    "∜": "\\sqrt[4]{}",
    "∫": "\\int",
    "∬": "\\iint",
    "∮": "\\oint",
    "∂": "\\partial",
    "∇": "\\nabla",
    "∑": "\\sum",
    "∏": "\\prod",
    Σ: "\\Sigma",
    π: "\\pi",
    θ: "\\theta",
    α: "\\alpha",
    β: "\\beta",
    γ: "\\gamma",
    δ: "\\delta",
    ε: "\\epsilon",
    λ: "\\lambda",
    μ: "\\mu",
    σ: "\\sigma",
    φ: "\\phi",
    ω: "\\omega",
    Δ: "\\Delta",
    Ω: "\\Omega",
    "±": "\\pm",
    "×": "\\times",
    "÷": "\\div",
    "≠": "\\neq",
    "≈": "\\approx",
    "≤": "\\leq",
    "≥": "\\geq",
    "∞": "\\infty",
    "→": "\\to",
  };

  // Apply replacements
  Object.entries(superscripts).forEach(([char, replacement]) => {
    latex = latex.replace(new RegExp(char, "g"), replacement);
  });

  Object.entries(subscripts).forEach(([char, replacement]) => {
    latex = latex.replace(new RegExp(char, "g"), replacement);
  });

  Object.entries(symbols).forEach(([char, replacement]) => {
    latex = latex.replace(
      new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      replacement
    );
  });

  return latex;
};

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
