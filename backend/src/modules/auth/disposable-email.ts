/**
 * Throwaway email addresses (like mailinator.com) make it easy to farm free
 * accounts, so sign-up turns them away.
 */

import { DISPOSABLE_DOMAINS } from "./disposable-domains";

const domains = new Set(
  DISPOSABLE_DOMAINS.split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
);

/** True for an address on a disposable domain, or a subdomain of one. */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@").pop()?.trim().toLowerCase();
  if (!domain) return false;

  // "a.b.mailinator.com" is checked as itself, then "b.mailinator.com", then "mailinator.com"
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    if (domains.has(parts.slice(i).join("."))) return true;
  }
  return false;
}
