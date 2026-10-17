/**
 * EMPTY: nothing left after trimming spaces.
 * Reply: "Type a math problem first."
 */

import type { GuardRule } from "../check-problem";

export const empty: GuardRule = {
  reason: "empty",
  blocks: (shape) => shape.tokens.length === 0,
};
