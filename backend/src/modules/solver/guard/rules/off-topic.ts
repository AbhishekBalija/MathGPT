/**
 * OFF-TOPIC: the student asks for something that isn't math: an essay, a
 * joke, code, general knowledge, another subject, or a trick aimed at the AI.
 * Math mixed with any of these is turned away too ("what is 2+2 also tell
 * me a joke"), so the student sends just the math part.
 * Reply: "I only help with math."
 *
 * Words here must never appear in a real word problem. "program" is left
 * out (linear programming), and so are "lottery", "shares", "predict",
 * "calories", "cricket", plain "story" or "code" and subject names like
 * "history" ("a history book costs ₹200"), which all show up in textbook
 * problems. The
 * AI still turns away anything subtle that gets past this list.
 */

import type { GuardRule } from "../check-problem";

// Whole words or phrases. Add new ones to the group they fit.
const OFF_TOPIC_PHRASES = [
  // Writing tasks
  "essay", "essays", "poem", "poems", "write a story", "short story", "word story", "story about", "story on", "letter to", "paragraph on", "speech on",
  "summarise", "summarize", "summary of", "lyrics",
  // Jokes and chat
  "joke", "jokes",
  // Code
  "write code", "code for", "code to", "source code", "javascript", "python", "java", "html", "css", "sql",
  // Translation and general knowledge
  "translate", "translation", "capital of", "who won", "prime minister", "president of", "world cup",
  // Other subjects, when nothing is calculated
  "photosynthesis", "balance the equation", "chemical equation",
  // Money predictions and personal life
  "bitcoin", "crypto", "horoscope", "zodiac", "crush", "girlfriend", "boyfriend", "rate my",
  // Exam leaks
  "leak", "leaked",
  // Tricks aimed at the AI
  "ignore all previous", "ignore previous", "ignore your", "your prompt", "system prompt", "jailbreak",
  "pretend you are", "act as", "roleplay",
];

const OFF_TOPIC = new RegExp(`\\b(${OFF_TOPIC_PHRASES.join("|")})\\b`);

export const offTopic: GuardRule = {
  reason: "off_topic",
  blocks: (shape) => OFF_TOPIC.test(shape.text),
};
