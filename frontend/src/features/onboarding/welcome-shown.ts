/**
 * Remembers, for this browser tab, that the welcome page was shown, so a
 * student who goes back to the app isn't sent there again (#39). It is
 * forgotten at log out, so a sibling on the same phone still gets asked.
 */

export const WELCOME_SHOWN_KEY = "neomath-welcome-shown";

// Storage can be blocked (private mode); then the page may show again, which is harmless
export function welcomeShownThisVisit(): boolean {
  try {
    return sessionStorage.getItem(WELCOME_SHOWN_KEY) !== null;
  } catch {
    return false;
  }
}

export function markWelcomeShown(): void {
  try {
    sessionStorage.setItem(WELCOME_SHOWN_KEY, "1");
  } catch {
    // See above
  }
}

export function forgetWelcomeShown(): void {
  try {
    sessionStorage.removeItem(WELCOME_SHOWN_KEY);
  } catch {
    // See above
  }
}
