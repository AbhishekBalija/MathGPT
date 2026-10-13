/**
 * A problem no other test uses. The shared solution cache would otherwise
 * serve a repeated problem (like "2x = 4") without calling the AI or
 * spending a Credit, which is not what most tests are about.
 * The tag also stops the code check from confirming it, so it is never shared.
 */
let next = 0;

export function uniqueProblem(base = "2x = 4"): string {
  next += 1;
  return `${base} #${process.pid}-${next}-${Math.random().toString(36).slice(2, 8)}`;
}
