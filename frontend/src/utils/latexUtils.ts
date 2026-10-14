// Helpers for the "Read as" preview under the problem box

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
