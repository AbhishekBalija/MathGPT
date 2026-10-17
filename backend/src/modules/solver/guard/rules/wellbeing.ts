/**
 * WELLBEING: the student may be in distress ("i want to die").
 * Reply: kind words and a free helpline (Tele-MANAS 14416, any time).
 *
 * This rule runs first and always wins, even when there is math in the
 * text: a student who says this should never get a cold "not math" reply.
 * Phrases only, never single words, so "a die is rolled" and "kill the
 * x term" are still solved.
 */

import type { GuardRule } from "../check-problem";

// Whole phrases. Add new ones here, including other languages typed in English letters.
const DISTRESS_PHRASES = [
  "want to die", "wanna die", "wish i was dead", "better off dead",
  "kill myself", "end my life", "end it all", "suicide", "suicidal",
  "hurt myself", "cut myself", "self harm", "self-harm",
  "don't want to live", "dont want to live", "no reason to live",
  "can't do this anymore", "cant do this anymore",
  // Hindi in English letters
  "marna chahta", "marna chahti", "marna hai", "mar jaunga", "mar jaungi", "jeena nahi",
];

const DISTRESS = new RegExp(`\\b(${DISTRESS_PHRASES.join("|")})\\b`);

export const wellbeing: GuardRule = {
  reason: "wellbeing",
  blocks: (shape) => DISTRESS.test(shape.text),
};
