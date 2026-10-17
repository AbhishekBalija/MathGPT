/**
 * GREETING: only small talk, like "hi", "good morning", "thanks", "ok",
 * or only emoji and smileys ("👋", "🙏", ":)").
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
  // Hindi and Kannada
  "नमस्ते", "नमस्कार", "ನಮಸ್ಕಾರ",
];

const SMALL_TALK = new RegExp(`^(${SMALL_TALK_WORDS.join("|")})$`, "u");

// Smileys typed with punctuation: ":)", ";-)", ":d", "^_^"
const SMILEY = /^(?:[:;]-?[)(dp]|\^_\^)$/;

export const greeting: GuardRule = {
  reason: "greeting",
  blocks: (shape) => {
    if (SMILEY.test(shape.text)) return true;
    const words = shape.tokens.filter((token) => token.kind === "word");
    const hasWordOrEmoji = shape.tokens.some((token) => token.kind === "word" || token.kind === "emoji");
    const onlyWordsEmojiAndPunctuation = shape.tokens.every(
      (token) => token.kind === "word" || token.kind === "emoji" || token.kind === "other"
    );
    return hasWordOrEmoji && onlyWordsEmojiAndPunctuation && words.every((word) => SMALL_TALK.test(word.text));
  },
};
