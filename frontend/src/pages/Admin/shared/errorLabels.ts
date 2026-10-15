// Error codes in plain words, for the tags on failed solves
const LABELS: Record<string, string> = {
  AI_TIMEOUT: "AI timed out",
  AI_RATE_LIMITED: "AI limit hit",
  AI_UNREACHABLE: "AI unreachable",
  ALL_MODELS_FAILED: "All models failed",
  ANSWER_CHECK_FAILED: "Wrong answer caught",
  INVALID_OUTPUT: "Broken AI reply",
  SOLUTION_SAVE_FAILED: "Save failed",
  AI_NOT_CONFIGURED: "AI not set up",
  UNKNOWN_ERROR: "Our error",
};

export function errorLabel(code: string): string {
  return LABELS[code] ?? code;
}

// "8.4 s" from milliseconds
export function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}
