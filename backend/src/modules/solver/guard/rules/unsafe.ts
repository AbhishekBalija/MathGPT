/**
 * UNSAFE: drugs, making weapons, sexual content, or threats and insults
 * aimed at someone. Always turned away, even inside a "word problem",
 * because real textbooks never phrase problems this way.
 * Reply: "I can't help with that. I'm here for math."
 *
 * Keep this list narrow. Physics and statistics problems use "bomb",
 * "gun", "bullet", "shoot", "sex ratio" and "alcohol", so only phrases
 * that are never in a textbook go here. Swearing at homework
 * ("f*** this 2+2") is not unsafe; swearing at a person is.
 */

import type { GuardRule } from "../check-problem";

// Whole words or phrases. Add new ones to the group they fit.
const UNSAFE_PHRASES = [
  // Drugs
  "cocaine", "heroin", "meth", "mdma", "lsd", "ganja", "marijuana",
  // Making weapons
  "make a bomb", "making a bomb", "build a bomb", "pipe bomb", "bomb making",
  // Sexual content
  "porn", "nude", "nudes", "naked", "sexy", "horny", "have sex", "sex with",
  // Threats and insults aimed at someone
  "kill you", "will kill", "murder", "fuck you", "fuck off", "bitch", "bastard",
];

const UNSAFE = new RegExp(`\\b(${UNSAFE_PHRASES.join("|")})\\b`);

export const unsafe: GuardRule = {
  reason: "unsafe",
  blocks: (shape) => UNSAFE.test(shape.text),
};
