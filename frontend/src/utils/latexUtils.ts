/**
 * LaTeX Cleaning Utilities
 * Separated to avoid React Fast Refresh HMR issues
 */

/**
 * Aggressively extracts ONLY the LaTeX portion of a string.
 * The AI sometimes outputs both LaTeX AND plain text versions.
 */
export const cleanExpression = (expr: string): string => {
  if (!expr) return expr;

  // Split by newlines to handle multi-line garbage
  const lines = expr
    .split(/\n|\r\n?/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // If only one line, return it as-is
  if (lines.length <= 1) {
    return expr.trim();
  }

  // Strategy: ONLY keep lines with backslash (actual LaTeX commands like \frac, \begin, etc.)
  // Do NOT match on just `{` because plain text garbage like `{x = 2y = 1` also has braces
  const latexLines = lines.filter((l) => l.includes("\\"));

  if (latexLines.length > 0) {
    return latexLines.join(" ");
  }

  // If no LaTeX commands found, return just the first line
  return lines[0];
};

/**
 * Remove duplicate content where the string appears to be "A A" or "A\nA"
 */
export const cleanFinalAnswer = (answer: string): string => {
  if (!answer) return answer;

  // First, standard line cleanup
  let refined = cleanExpression(answer);
  refined = refined.trim();

  // HEURISTIC 1: Check for space-separated repetition "x + 2 x + 2"
  // We scan for a split point where left == right
  if (refined.length > 3) {
    // Try splitting at every likely separator (space or just index)
    // Minimizes complexity: just check strict half split first
    const mid = Math.floor(refined.length / 2);

    // Check strict concatenation "ABCABC"
    const firstHalf = refined.substring(0, mid).trim();
    const secondHalf = refined.substring(mid).trim();
    if (firstHalf === secondHalf) return firstHalf;

    // Let's rely on a more robust sliding check for "Answer Answer"
    // e.g. "3x + 2 3x + 2"
    for (let i = 1; i < refined.length - 1; i++) {
      const left = refined.substring(0, i).trim();
      const right = refined.substring(i).trim();
      if (left === right && left.length > 1) {
        return left;
      }
    }
  }

  return refined;
};

// Simple detection of math-like content
export const containsMath = (text: string): boolean => {
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
export const toLatex = (text: string): string => {
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
    "∫": "\\int ",
    "∬": "\\iint ",
    "∮": "\\oint ",
    "∂": "\\partial ",
    "∇": "\\nabla ",
    "∑": "\\sum ",
    "∏": "\\prod ",
    Σ: "\\Sigma ",
    π: "\\pi ",
    θ: "\\theta ",
    α: "\\alpha ",
    β: "\\beta ",
    γ: "\\gamma ",
    δ: "\\delta ",
    ε: "\\epsilon ",
    λ: "\\lambda ",
    μ: "\\mu ",
    σ: "\\sigma ",
    φ: "\\phi ",
    ω: "\\omega ",
    Δ: "\\Delta ",
    Ω: "\\Omega ",
    "±": "\\pm ",
    "×": "\\times ",
    "÷": "\\div ",
    "≠": "\\neq ",
    "≈": "\\approx ",
    "≤": "\\leq ",
    "≥": "\\geq ",
    "∞": "\\infty ",
    "→": "\\to ",
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
