/**
 * Error Message Utilities
 *
 * Converts technical API errors into user-friendly messages.
 * Never expose raw backend errors, API keys, URLs, or technical details to users.
 */

/**
 * Map of error patterns to user-friendly messages
 */
const ERROR_MAPPINGS: Array<{ pattern: RegExp; message: string }> = [
  // Rate limiting errors
  {
    pattern: /429|too many requests|rate.?limit|quota.?exceeded/i,
    message:
      "Our servers are busy right now. Please try again in a few seconds.",
  },
  // API/Network errors
  {
    pattern: /GoogleGenerativeAI|generativelanguage\.googleapis/i,
    message: "The AI service is temporarily unavailable. Please try again.",
  },
  {
    pattern: /network|fetch|ECONNREFUSED|ENOTFOUND|timeout/i,
    message:
      "Unable to connect to our servers. Please check your internet connection.",
  },
  // Authentication errors
  {
    pattern: /401|unauthorized|authentication|token.*expired/i,
    message: "Your session has expired. Please log in again.",
  },
  {
    pattern: /403|forbidden|permission/i,
    message: "You don't have permission to do this.",
  },
  // Server errors
  {
    pattern: /500|internal.?server|server.?error/i,
    message: "Something went wrong on our end. Please try again later.",
  },
  // Input validation errors - these can be shown as-is (sanitized)
  {
    pattern: /invalid|required|must be|cannot be empty/i,
    message: "", // Will use the original but sanitized
  },
];

/**
 * Sanitize an error message to show a user-friendly version.
 * Never exposes technical details, API URLs, or stack traces.
 *
 * @param error - The raw error message or Error object
 * @returns A user-friendly error message
 */
export const sanitizeErrorMessage = (error: unknown): string => {
  const rawMessage = error instanceof Error ? error.message : String(error);

  // Check against known patterns
  for (const { pattern, message } of ERROR_MAPPINGS) {
    if (pattern.test(rawMessage)) {
      // If message is empty, return a sanitized version of the original
      if (!message) {
        return sanitizeText(rawMessage);
      }
      return message;
    }
  }

  // If no pattern matched, check for technical strings to hide
  if (containsTechnicalDetails(rawMessage)) {
    return "Something went wrong. Please try again.";
  }

  // Return sanitized message (remove HTML, limit length)
  return sanitizeText(rawMessage);
};

/**
 * Check if a message contains technical details that shouldn't be shown
 */
const containsTechnicalDetails = (message: string): boolean => {
  const technicalPatterns = [
    /https?:\/\//i, // URLs
    /\{.*"@type".*\}/s, // JSON objects
    /Error\s*:/i, // Error: prefix
    /at\s+\w+\s+\(/i, // Stack trace
    /googleapis|generative/i, // API names
    /quota|metric|retryDelay/i, // Quota details
  ];

  return technicalPatterns.some((pattern) => pattern.test(message));
};

/**
 * Remove HTML and limit message length
 */
const sanitizeText = (text: string): string => {
  // Remove HTML tags
  let clean = text.replace(/<[^>]*>/g, "");
  // Remove URLs
  clean = clean.replace(/https?:\/\/[^\s]+/g, "");
  // Remove JSON-like content
  clean = clean.replace(/\{[^}]+\}/g, "");
  // Remove multiple spaces
  clean = clean.replace(/\s+/g, " ").trim();
  // Limit length
  if (clean.length > 100) {
    clean = clean.substring(0, 100) + "...";
  }
  // If empty after cleaning, return default
  if (!clean) {
    return "Something went wrong. Please try again.";
  }
  return clean;
};

/**
 * Get a user-friendly error message for display in chat
 */
export const getUserFriendlyError = (error: unknown): string => {
  const message = sanitizeErrorMessage(error);
  return message.endsWith(".") ? message : message + ".";
};
