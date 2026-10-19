import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/auth.service";
import { useAuthStore } from "../../stores/authStore";

// Set by the welcome page, so a student who goes back to the app isn't sent there again this visit
export const WELCOME_SHOWN_KEY = "neomath-welcome-shown";

function shownThisVisit(): boolean {
  try {
    return sessionStorage.getItem(WELCOME_SHOWN_KEY) !== null;
  } catch {
    // Private mode can block storage; then the welcome page may show again, which is harmless
    return false;
  }
}

/**
 * For the app layout: refreshes the User from /auth/me once, so accounts from
 * before Onboarding learn they need it, then sends a student who still needs
 * it to /welcome once per visit (#39).
 */
export function useOnboardingRedirect(): void {
  const navigate = useNavigate();
  const onboarding = useAuthStore((state) => state.user?.onboarding);

  useEffect(() => {
    let current = true;
    authService
      .getCurrentUser()
      .then(({ user }) => {
        const stored = useAuthStore.getState().user;
        if (current && stored) useAuthStore.getState().setUser({ ...stored, ...user });
      })
      // The stored User still works; the next visit tries again
      .catch(() => {});
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    // A session saved before this shipped has no field: wait for /auth/me instead of guessing
    if (onboarding !== "needed" || shownThisVisit()) return;
    navigate("/welcome", { replace: true });
  }, [onboarding, navigate]);
}
