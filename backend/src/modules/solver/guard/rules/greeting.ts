/**
 * GREETING: only small talk, like "hi", "good morning", "thanks", "ok".
 * Reply: "Hi! Send me a math problem and I'll solve it step by step."
 *
 * A greeting followed by a real problem ("hi, solve 2x = 4") is let through.
 */

import type { GuardRule } from "../check-problem";

// Each word may be stretched ("hiii", "heyyy"), so these are patterns.
// Add new small-talk words here.
const SMALL_TALK_WORDS = [
  "hi+", "he+y+", "hel+o+", "hlo+", "yo+", "sup", "namaste", "namaskara",
  "good", "morning", "afternoon", "evening", "night",
  "thanks", "thank", "you", "u", "thx", "ty", "so", "much", "a", "lot",
  "ok", "okay", "k", "bye", "there", "neo", "sir", "mam", "bro",
];

const SMALL_TALK = new RegExp(`^(${SMALL_TALK_WORDS.join("|")})$`);

export const greeting: GuardRule = {
  reason: "greeting",
  blocks: (shape) => {
    const words = shape.tokens.filter((token) => token.kind === "word");
    const onlyWordsAndPunctuation = shape.tokens.every((token) => token.kind === "word" || token.kind === "other");
    return words.length > 0 && onlyWordsAndPunctuation && words.every((word) => SMALL_TALK.test(word.text));
  },
};
