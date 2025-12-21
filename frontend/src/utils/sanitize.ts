/**
 * HTML Sanitization Utilities
 *
 * Uses DOMPurify to prevent XSS attacks when rendering HTML content.
 */

import DOMPurify from "dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Use this whenever you need to set `dangerouslySetInnerHTML`.
 *
 * @param html - Potentially unsafe HTML string
 * @returns Sanitized HTML string safe for rendering
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    // Allow KaTeX/MathML elements
    USE_PROFILES: { html: true, mathMl: true },
    // Allow safe elements for math rendering
    ADD_TAGS: [
      "math",
      "mrow",
      "mi",
      "mn",
      "mo",
      "msup",
      "msub",
      "mfrac",
      "msqrt",
      "mroot",
    ],
    // Allow class and style for KaTeX styling
    ADD_ATTR: ["class", "style"],
  });
};

/**
 * Basic HTML escape for text content (fallback when sanitization isn't needed).
 * Converts special characters to HTML entities.
 */
export const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
