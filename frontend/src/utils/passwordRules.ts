// The sign-up password rules, copied from the server's passwordSchema
// (backend/src/modules/auth/password.ts). Keep the two lists the same:
// the hint under the field and the check before sending both read this one.

export interface PasswordRule {
  id: "length" | "upper" | "lower" | "number" | "symbol";
  // Shown under the password field
  label: string;
  // Used in the error message, after "Your password needs"
  short: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: "length", label: "At least 8 characters", short: "at least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "A capital letter (A-Z)", short: "a capital letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "A small letter (a-z)", short: "a small letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "A number (0-9)", short: "a number", test: (p) => /[0-9]/.test(p) },
  {
    id: "symbol",
    label: "A symbol like ! @ # ?",
    short: "a symbol (like ! or @)",
    // Only these count on the server, so - and _ do not
    test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p),
  },
];

export function unmetPasswordRules(password: string): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(password));
}
