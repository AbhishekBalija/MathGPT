// A whole number we can write out digit by digit. Number.isInteger alone lets
// through values like 1e21, whose digits JavaScript cannot hold exactly.
export function isWholeNumber(n: number): boolean {
  return Number.isSafeInteger(n) && n >= 0;
}
