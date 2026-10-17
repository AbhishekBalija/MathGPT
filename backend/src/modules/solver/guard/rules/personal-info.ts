/**
 * PERSONAL INFO: a phone number, email, link or ID number.
 * Reply: "Please don't share personal details here."
 *
 * Nothing is saved for a turned-away Problem, so these never reach History.
 * "98450 - 12345" (spaces around the minus) is a real subtraction and is let through.
 */

import type { GuardRule } from "../check-problem";

// Each pattern is one kind of personal detail. Add new ones here.
const PERSONAL_DETAILS = [
  // Indian mobile: 10 digits starting 6-9, maybe +91, maybe one space or dash in the middle
  /(?:\+?91[\s-]?|(?<!\d))[6-9]\d{4}[\s-]?\d{5}(?!\d)/,
  // Email address
  /\S+@\S+\.\S+/,
  // Link: http(s)://, www. or a word ending in a common web ending
  /https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|in|org|net|io|co|me|app)\b/,
  // Aadhaar-style ID: three groups of four digits
  /(?<!\d)\d{4} \d{4} \d{4}(?!\d)/,
];

export const personalInfo: GuardRule = {
  reason: "personal_info",
  blocks: (shape) => PERSONAL_DETAILS.some((pattern) => pattern.test(shape.text)),
};
