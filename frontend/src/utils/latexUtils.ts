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
